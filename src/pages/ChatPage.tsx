import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  MessageSquarePlus,
  Send,
  Copy,
  Check,
  Download,
  Trash2,
  Pin,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import {
  chat,
  analyzeFile,
  generateImage,
  encodeGeneratedImage,
  decodeGeneratedImage,
  type AIFile,
  type ImageAspectRatio,
} from '@/lib/ai';
import { useVoice } from '@/lib/voice';
import type { Conversation, Message } from '@/lib/types';
import {
  Markdown,
  TypingDots,
  EmptyState,
  ErrorBanner,
  useCopy,
} from '@/components/Markdown';
import { Orb } from '@/components/Orb';
import { PageHeader } from '@/components/AppShell';

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageMode, setImageMode] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] =
    useState<ImageAspectRatio>('1:1');
  const [imageBusy, setImageBusy] = useState(false);
  const [lastImagePrompt, setLastImagePrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voice = useVoice();
  const { copied, copy } = useCopy();

  const loadConversations = async () => {
    setLoadingConvos(true);

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setConversations(data as Conversation[]);
      if (data && data.length && !activeId) {
        setActiveId(data[0].id);
      }
    }

    setLoadingConvos(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setSelectedFile(null);
      setLastImagePrompt('');
      return;
    }

    setLoadingMsgs(true);

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          const loadedMessages = (data as Message[]) ?? [];
          setMessages(loadedMessages);
          const lastImageRequest = [...loadedMessages].reverse().find(
            (message) =>
              message.role === 'user' &&
              message.content.startsWith('🎨 Image prompt ('),
          );
          const separator = lastImageRequest?.content.indexOf('): ') ?? -1;
          setLastImagePrompt(
            lastImageRequest && separator >= 0
              ? lastImageRequest.content.slice(separator + 3)
              : '',
          );
        }

        setLoadingMsgs(false);
      });
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy, imageBusy]);

  const newConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: 'New Conversation' })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    const conv = data as Conversation;

    setConversations((c) => [conv, ...c]);
    setActiveId(conv.id);
    setSelectedFile(null);
    setLastImagePrompt('');
    setError(null);
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    setConversations((c) => c.filter((x) => x.id !== id));

    if (activeId === id) {
      setActiveId(null);
      setSelectedFile(null);
    }
  };

  const togglePin = async (conv: Conversation) => {
    const { error } = await supabase
      .from('conversations')
      .update({ pinned: !conv.pinned })
      .eq('id', conv.id);

    if (error) return;

    setConversations((c) =>
      c.map((x) =>
        x.id === conv.id ? { ...x, pinned: !x.pinned } : x,
      ),
    );
  };

  const logActivity = async (type: string, title: string) => {
    await supabase.from('activity').insert({
      type,
      title,
      metadata: { conversation_id: activeId },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setError(null);

    const extension = file.name.split('.').pop()?.toLowerCase();

    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    if (!extension || !allowedExtensions.includes(extension)) {
      setError('Please select a PDF, JPG, JPEG, PNG or WEBP file.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be 15 MB or less.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    e.target.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateConversationImage = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? imagePrompt).trim();

    if (!prompt || prompt.length > 2000 || busy || imageBusy) return;

    setError(null);
    setImageBusy(true);

    try {
      let convId = activeId;

      if (!convId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ title: `Image: ${prompt.slice(0, 40)}` })
          .select()
          .single();

        if (error) throw new Error(error.message);

        const conversation = data as Conversation;
        convId = conversation.id;
        setConversations((current) => [conversation, ...current]);
        setActiveId(conversation.id);
      }

      const { data: userRow, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'user',
          content: `🎨 Image prompt (${imageAspectRatio}): ${prompt}`,
        })
        .select()
        .single();

      if (userError) throw new Error(userError.message);

      setMessages((current) => [...current, userRow as Message]);

      const image = await generateImage(prompt, imageAspectRatio);
      const imageMessage = encodeGeneratedImage({
        ...image,
        prompt,
        aspectRatio: imageAspectRatio,
      });

      const { data: assistantRow, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: imageMessage,
        })
        .select()
        .single();

      if (assistantError) throw new Error(assistantError.message);

      setMessages((current) => [...current, assistantRow as Message]);
      setLastImagePrompt(prompt);
      setImagePrompt('');

      if (messages.length === 0) {
        const title = `Image: ${prompt.slice(0, 40)}`;
        const { error: titleError } = await supabase
          .from('conversations')
          .update({ title })
          .eq('id', convId);

        if (titleError) throw new Error(titleError.message);

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === convId
              ? { ...conversation, title }
              : conversation,
          ),
        );
      }

      await supabase.from('activity').insert({
        type: 'image-generation',
        title: prompt.slice(0, 60),
        metadata: { conversation_id: convId },
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to generate an image.',
      );
    } finally {
      setImageBusy(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== 'string') {
          reject(new Error('Unable to read the selected file.'));
          return;
        }

        const base64 = result.split(',')[1];

        if (!base64) {
          reject(new Error('Unable to convert the file.'));
          return;
        }

        resolve(base64);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the selected file.'));
      };

      reader.readAsDataURL(file);
    });
  };

  const send = async () => {
    const text = input.trim();

    if ((!text && !selectedFile) || busy) return;

    setError(null);

    const attachment = selectedFile;

    const displayText = attachment
      ? `📎 ${attachment.name}\n${text || 'Please analyze this file.'}`
      : text;

    let convId = activeId;

    if (!convId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: displayText.slice(0, 40),
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      const conv = data as Conversation;

      convId = conv.id;

      setConversations((c) => [conv, ...c]);
      setActiveId(conv.id);
    }

    setBusy(true);
    setInput('');

    try {
      let uploadedAIFile: AIFile | null = null;

      if (attachment) {
        let mimeType = attachment.type;

        if (!mimeType) {
          const extension = attachment.name.split('.').pop()?.toLowerCase();

          const mimeTypes: Record<string, string> = {
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
          };

          mimeType = mimeTypes[extension || ''] || '';
        }

        const base64 = await convertFileToBase64(attachment);

        uploadedAIFile = {
          fileName: attachment.name,
          mimeType,
          data: base64,
        };
      }

      const { data: userRow, error: uErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'user',
          content: displayText,
        })
        .select()
        .single();

      if (uErr) {
        throw new Error(uErr.message);
      }

      const userMsg = userRow as Message;

      const updatedMessages = [...messages, userMsg];

      setMessages(updatedMessages);

      const { data: memData } = await supabase
        .from('memories')
        .select('title, content, category')
        .limit(20);

      const memory = (memData as any[]) ?? [];

      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let reply: string;

      if (uploadedAIFile) {
        reply = await analyzeFile(
          history,
          uploadedAIFile,
          text || 'Please analyze this file and explain its contents.',
        );
      } else {
        reply = await chat(history, memory);
      }

      const { data: aiRow, error: aiErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: reply,
        })
        .select()
        .single();

      if (aiErr) {
        throw new Error(aiErr.message);
      }

      setMessages((m) => [...m, aiRow as Message]);

      if (messages.length === 0) {
        await supabase
          .from('conversations')
          .update({ title: displayText.slice(0, 50) })
          .eq('id', convId);

        setConversations((c) =>
          c.map((x) =>
            x.id === convId
              ? { ...x, title: displayText.slice(0, 50) }
              : x,
          ),
        );
      }

      await logActivity('chat', displayText.slice(0, 60));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to get a response.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onVoice = () => {
    if (voice.listening) {
      voice.stopListening();
    } else {
      voice.startListening((t) =>
        setInput((cur) => (cur ? cur + ' ' : '') + t),
      );
    }
  };

  const download = (msg: Message) => {
    const generatedImage = decodeGeneratedImage(msg.content);

    if (generatedImage) {
      try {
        const binary = atob(generatedImage.data);
        const bytes = Uint8Array.from(binary, (character) =>
          character.charCodeAt(0),
        );
        const blob = new Blob([bytes], { type: generatedImage.mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const extension = generatedImage.mimeType.split('/')[1] || 'png';

        anchor.href = url;
        anchor.download = `mathi-ai-image-${msg.id.slice(0, 8)}.${extension}`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        setError('Unable to download this generated image.');
      }

      return;
    }

    const blob = new Blob([msg.content], {
      type: 'text/markdown',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `mathi-ai-${msg.role}-${msg.id.slice(0, 8)}.md`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="AI Chat"
        subtitle="Converse with the neural interface"
        icon={<MessageSquare className="w-5 h-5" />}
        action={
          <button
            onClick={newConversation}
            disabled={busy || imageBusy}
            className="btn-primary"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Chat
          </button>
        }
      />

      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[520px]">
        {sidebarOpen && (
          <div className="hidden md:flex w-64 flex-col glass shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 text-xs uppercase tracking-widest text-white/40">
              History
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingConvos ? (
                <div className="p-4 text-sm text-white/40">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-white/40">
                  No conversations yet.
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!busy && !imageBusy) setActiveId(c.id);
                    }}
                    className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeId === c.id
                        ? 'bg-white/[0.06] border border-white/10'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-white/80 truncate flex-1">
                        {c.title}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(c);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-neon-cyan"
                      >
                        <Pin
                          className={`w-3.5 h-3.5 ${
                            c.pinned
                              ? 'fill-neon-cyan text-neon-cyan'
                              : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="text-[10px] text-white/30">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!busy && !imageBusy) deleteConversation(c.id);
                        }}
                        disabled={busy || imageBusy}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-neon-pink"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col glass overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="btn-ghost !p-2 hidden md:inline-flex"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
                )}
              </button>

              <Orb size={28} thinking={busy || imageBusy} />

              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {active?.title ?? 'New conversation'}
                </div>

                <div className="text-[10px] text-white/40 flex items-center gap-1">
                  {busy || imageBusy ? (
                    <span className="text-neon-cyan">
                      {imageBusy ? 'generating image...' : 'analyzing / thinking...'}
                    </span>
                  ) : (
                    <span>ready</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  voice.speaking
                    ? voice.stopSpeaking()
                    : messages.length &&
                      voice.speak(
                        decodeGeneratedImage(
                          messages[messages.length - 1].content,
                        )?.prompt ?? messages[messages.length - 1].content,
                      )
                }
                disabled={!voice.supported}
                className="btn-ghost !p-2 disabled:opacity-30"
                title="Speak last response"
              >
                {voice.speaking ? (
                  <VolumeX className="w-4 h-4 text-neon-pink" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
          >
            {messages.length === 0 && !busy && !imageBusy && (
              <EmptyState
                icon={<Sparkles className="w-7 h-7" />}
                title="Start a conversation"
                subtitle="Ask anything or upload a PDF or image for MATHI AI to analyze."
              />
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onCopy={copy}
                onDownload={download}
                copied={copied}
                onSpeak={() =>
                  voice.speak(decodeGeneratedImage(m.content)?.prompt ?? m.content)
                }
                voiceSupported={voice.supported}
              />
            ))}

            {(busy || imageBusy) && (
              <div className="flex gap-3 animate-fade-in">
                <div className="shrink-0">
                  <Orb size={32} thinking />
                </div>

                <div className="glass px-4 py-3 flex items-center gap-3">
                  <TypingDots />
                  {imageBusy && (
                    <span className="text-xs text-white/50">
                      Creating your image…
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <ErrorBanner
                message={error}
                onRetry={() => setError(null)}
              />
            )}
          </div>

          <div className="border-t border-white/5 p-3 sm:p-4">
            {imageMode && (
              <div className="mb-3 rounded-2xl border border-neon-purple/20 bg-white/[0.03] p-3 sm:p-4 animate-fade-in">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/90">
                  <ImagePlus className="h-4 w-4 text-neon-cyan" />
                  Generate an image
                </div>

                <textarea
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  placeholder="Describe the image you want MATHI AI to create..."
                  maxLength={2000}
                  rows={2}
                  disabled={imageBusy || busy}
                  className="input-field resize-y min-h-20"
                  aria-label="Image generation prompt"
                />

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-xs text-white/50">
                    Aspect ratio
                    <select
                      value={imageAspectRatio}
                      onChange={(event) =>
                        setImageAspectRatio(event.target.value as ImageAspectRatio)
                      }
                      disabled={imageBusy || busy}
                      className="rounded-lg border border-white/10 bg-[#111225] px-3 py-2 text-xs text-white outline-none focus:border-neon-cyan/50"
                    >
                      <option value="1:1">Square · 1:1</option>
                      <option value="2:3">Portrait · 2:3</option>
                      <option value="3:2">Landscape · 3:2</option>
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateConversationImage(lastImagePrompt)}
                      disabled={!lastImagePrompt || imageBusy || busy}
                      className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-40"
                      title="Regenerate the last image prompt"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => generateConversationImage()}
                      disabled={
                        !imagePrompt.trim() ||
                        imagePrompt.trim().length > 2000 ||
                        imageBusy ||
                        busy
                      }
                      className="btn-primary !px-3 !py-2 text-xs"
                    >
                      {imageBusy ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Generate
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-white/30">
                  {imagePrompt.length}/2000 characters · Your generated image is saved in this conversation.
                </p>
              </div>
            )}

            {selectedFile && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3">
                <div className="rounded-lg bg-neon-purple/20 p-2">
                  {selectedFile.type === 'application/pdf' ||
                  selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="w-5 h-5 text-neon-cyan" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-neon-cyan" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    {' · '}Ready for analysis
                  </p>
                </div>

                <button
                  onClick={removeFile}
                  disabled={busy}
                  className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-neon-pink disabled:opacity-30"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => setImageMode((enabled) => !enabled)}
                disabled={busy || imageBusy}
                className={`btn-ghost !p-2.5 shrink-0 disabled:opacity-30 ${
                  imageMode ? 'border-neon-cyan/40 text-neon-cyan' : ''
                }`}
                title="Toggle image generation"
                aria-label={
                  imageMode ? 'Close image generation' : 'Open image generation'
                }
                aria-pressed={imageMode}
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || imageBusy}
                className="btn-ghost !p-2.5 shrink-0 disabled:opacity-30"
                title="Upload PDF or image"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={onVoice}
                disabled={!voice.supported || busy || imageBusy}
                className={`btn-ghost !p-2.5 shrink-0 ${
                  voice.listening
                    ? 'border-neon-pink/50 text-neon-pink'
                    : ''
                }`}
                title="Voice input"
              >
                {voice.listening ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  selectedFile
                    ? 'Ask something about this file...'
                    : voice.listening
                      ? 'Listening...'
                      : 'Message MATHI AI...'
                }
                disabled={imageBusy}
                rows={1}
                className="input-field resize-none max-h-32 flex-1"
              />

              <button
                onClick={send}
                disabled={busy || imageBusy || (!input.trim() && !selectedFile)}
                className="btn-primary !p-2.5 shrink-0 disabled:opacity-40"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 text-[10px] text-white/30 px-1">
              {imageMode
                ? 'Image generation uses Gemini · Enter your prompt above and choose an aspect ratio.'
                : voice.listening
                ? 'Voice input active — speak now.'
                : 'PDF, JPG, PNG and WEBP supported · Maximum 15 MB · Enter to send'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  onDownload,
  copied,
  onSpeak,
  voiceSupported,
}: {
  message: Message;
  onCopy: (t: string) => void;
  onDownload: (m: Message) => void;
  copied: boolean;
  onSpeak: () => void;
  voiceSupported: boolean;
}) {
  const isUser = message.role === 'user';
  const generatedImage = isUser
    ? null
    : decodeGeneratedImage(message.content);

  return (
    <div
      className={`flex gap-3 animate-fade-up ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl glass flex items-center justify-center text-xs font-bold text-white/70">
            You
          </div>
        ) : (
          <Orb size={32} />
        )}
      </div>

      <div
        className={`max-w-[85%] sm:max-w-[78%] ${
          isUser ? 'items-end' : ''
        } flex flex-col gap-1.5`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-neon-purple/30 to-neon-blue/20 border border-neon-purple/30 rounded-tr-sm'
              : 'glass rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm text-white/90 whitespace-pre-wrap">
              {message.content}
            </p>
          ) : generatedImage ? (
            <div className="space-y-3">
              <p className="text-sm text-white/80">
                Generated image for: {generatedImage.prompt}
              </p>
              <img
                src={`data:${generatedImage.mimeType};base64,${generatedImage.data}`}
                alt={generatedImage.prompt}
                className="h-auto max-h-[560px] max-w-full rounded-xl border border-white/10 object-contain"
              />
            </div>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        <div
          className={`flex items-center gap-1 ${
            isUser ? 'justify-end' : ''
          }`}
        >
          <button
            onClick={() => onCopy(generatedImage?.prompt ?? message.content)}
            className="text-white/40 hover:text-neon-cyan p-1"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-neon-cyan" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {!isUser && (
            <>
              <button
                onClick={() => onDownload(message)}
                className="text-white/40 hover:text-neon-cyan p-1"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {voiceSupported && (
                <button
                  onClick={onSpeak}
                  className="text-white/40 hover:text-neon-cyan p-1"
                  title="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          <span className="text-[10px] text-white/30 ml-1">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}