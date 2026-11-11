import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Upload,
  Loader2,
  Send,
  Trash2,
  FileSearch,
  Copy,
  Check,
  Download,
  FileCheck2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { documentQuery } from '@/lib/ai';
import type { DocumentRow } from '@/lib/types';
import { Markdown, EmptyState, ErrorBanner, useCopy } from '@/components/Markdown';
import { PageHeader } from '@/components/AppShell';

export function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [active, setActive] = useState<DocumentRow | null>(null);
  const [question, setQuestion] = useState('');
  const [qa, setQa] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { copied, copy } = useCopy();
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs((data as DocumentRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const text = await extractText(file);
        const { data, error } = await supabase
          .from('documents')
          .insert({ filename: file.name, file_type: file.type, file_size: file.size, extracted_text: text, status: 'ready' })
          .select()
          .single();
        if (error) throw error;
        setDocs((d) => [data as DocumentRow, ...d]);
        await supabase.from('activity').insert({ type: 'document', title: `Uploaded: ${file.name.slice(0, 50)}`, metadata: {} });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || busy || !active) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await documentQuery([{ role: 'user', content: q }], active.extracted_text);
      setQa((p) => [...p, { q, a: reply }]);
      setQuestion('');
      await supabase.from('activity').insert({ type: 'document_qa', title: `Q&A: ${q.slice(0, 50)}`, metadata: { document_id: active.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to answer.');
    } finally {
      setBusy(false);
    }
  };

  const summarize = async () => {
    if (!active || busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await documentQuery([], active.extracted_text);
      const { data } = await supabase.from('documents').update({ summary: reply }).eq('id', active.id).select().single();
      setActive(data as DocumentRow);
      setDocs((d) => d.map((x) => (x.id === active.id ? (data as DocumentRow) : x)));
      await supabase.from('activity').insert({ type: 'document_summary', title: `Summarized: ${active.filename.slice(0, 40)}`, metadata: {} });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Summarize failed.');
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id);
    setDocs((d) => d.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  };

  const download = (text: string, name: string) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Document Intelligence"
        subtitle="Upload, summarize, and ask questions about documents"
        icon={<FileText className="w-5 h-5" />}
        action={
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Upload className="w-4 h-4" /> Upload PDF</>}
          </button>
        }
      />

      <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,text/plain,application/pdf" multiple onChange={(e) => onUpload(e.target.files)} className="hidden" />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Document list */}
        <div className="glass p-4 lg:col-span-1">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Your Documents</div>
          {loading ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : docs.length === 0 ? (
            <EmptyState icon={<FileText className="w-7 h-7" />} title="No documents" subtitle="Upload a PDF or text file to analyze it with AI." />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  onClick={() => { setActive(d); setQa([]); }}
                  className={`group p-3 rounded-xl cursor-pointer transition-all ${active?.id === d.id ? 'bg-neon-purple/10 border border-neon-purple/30' : 'hover:bg-white/[0.03] border border-transparent'}`}
                >
                  <div className="flex items-start gap-2">
                    <FileCheck2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/85 truncate">{d.filename}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{(d.file_size / 1024).toFixed(1)} KB · {d.status}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-neon-pink p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspace */}
        <div className="lg:col-span-2">
          {!active ? (
            <div className="glass p-8 h-full flex items-center justify-center">
              <EmptyState icon={<FileSearch className="w-7 h-7" />} title="Select a document" subtitle="Choose a document from the left to summarize it or ask questions." />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="glass p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-neon-cyan shrink-0" />
                    <span className="text-sm font-medium truncate">{active.filename}</span>
                  </div>
                  <button onClick={summarize} disabled={busy} className="btn-ghost !py-1.5 !px-3 text-xs">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />} Summarize
                  </button>
                </div>
                {active.summary ? (
                  <div>
                    <div className="text-xs text-neon-cyan mb-1.5">Summary</div>
                    <Markdown content={active.summary} />
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => copy(active.summary!)} className="text-white/40 hover:text-neon-cyan p-1">{copied ? <Check className="w-3.5 h-3.5 text-neon-cyan" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => download(active.summary!, `summary-${active.filename}.md`)} className="text-white/40 hover:text-neon-cyan p-1"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No summary yet. Click <span className="text-neon-cyan">Summarize</span> to generate one.</p>
                )}
              </div>

              {/* Q&A */}
              <div className="glass p-4">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Ask about this document</div>
                {qa.length > 0 && (
                  <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                    {qa.map((item, i) => (
                      <div key={i} className="animate-fade-up">
                        <div className="text-sm font-medium text-white/85">Q: {item.q}</div>
                        <div className="glass-strong p-3 mt-1.5"><Markdown content={item.a} /></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
                    placeholder="Ask a question about this document…"
                    className="input-field flex-1"
                  />
                  <button onClick={ask} disabled={busy || !question.trim()} className="btn-primary !p-2.5">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Extract text from PDF (via pdf.js from CDN) or plain text files. */
async function extractText(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
    return await file.text();
  }
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const pdfjs = await loadPdfjs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => it.str).join(' '));
    }
    return pages.join('\n\n');
  }
  return `[${file.name}] Binary file — text extraction not supported for this type.`;
}

let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    const mod: any = await (new Function(
      'return import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js")',
    )());
    mod.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    return mod;
  })();
  return pdfjsPromise;
}
