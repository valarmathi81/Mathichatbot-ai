import type { Memory } from './types';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface AIFile {
  fileName: string;
  mimeType: string;
  data: string;
}

export type ImageAspectRatio = '1:1' | '2:3' | '3:2';

export interface GeneratedImage {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  mimeType: string;
  data: string;
}

const AI_API_URL = 'https://mathichatbot-ai.onrender.com/api/ai';
const IMAGE_API_URL = 'http://localhost:3001/api/images/generate';
const IMAGE_MESSAGE_PREFIX = 'MATHI_IMAGE_V1:';

export function encodeGeneratedImage(image: GeneratedImage): string {
  return IMAGE_MESSAGE_PREFIX + JSON.stringify(image);
}

export function decodeGeneratedImage(content: string): GeneratedImage | null {
  if (!content.startsWith(IMAGE_MESSAGE_PREFIX)) return null;

  try {
    const image: unknown = JSON.parse(content.slice(IMAGE_MESSAGE_PREFIX.length));

    if (
      typeof image === 'object' &&
      image !== null &&
      'prompt' in image &&
      typeof image.prompt === 'string' &&
      'aspectRatio' in image &&
      (image.aspectRatio === '1:1' ||
        image.aspectRatio === '2:3' ||
        image.aspectRatio === '3:2') &&
      'mimeType' in image &&
      typeof image.mimeType === 'string' &&
      image.mimeType.startsWith('image/') &&
      'data' in image &&
      typeof image.data === 'string'
    ) {
      return {
        prompt: image.prompt,
        aspectRatio: image.aspectRatio,
        mimeType: image.mimeType,
        data: image.data,
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function callAI(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `AI request failed (${res.status})`);
  }

  if (!data || typeof data.reply !== 'string') {
    throw new Error('AI returned an unexpected response.');
  }

  return data.reply;
}

export function chat(
  messages: ChatMessage[],
  memory: Pick<Memory, 'title' | 'content' | 'category'>[] = [],
): Promise<string> {
  return callAI({ mode: 'chat', messages, memory });
}

export function planAgentTask(
  instruction: string,
  memory: Pick<Memory, 'title' | 'content' | 'category'>[] = [],
): Promise<string> {
  return callAI({ mode: 'agent-plan', instruction, memory });
}

export function studyGenerate(
  messages: ChatMessage[],
  memory: Pick<Memory, 'title' | 'content' | 'category'>[] = [],
  language: 'english' | 'tamil' = 'english',
): Promise<string> {
  return callAI({ mode: 'study', messages, memory, language });
}

export function documentQuery(
  messages: ChatMessage[],
  text: string,
): Promise<string> {
  return callAI({ mode: 'document', messages, text });
}

export function analyzeFile(
  messages: ChatMessage[],
  file: AIFile,
  question: string,
): Promise<string> {
  return callAI({
    mode: 'file-analysis',
    messages,
    file,
    question,
  });
}

export async function generateImage(
  prompt: string,
  aspectRatio: ImageAspectRatio,
): Promise<Omit<GeneratedImage, 'prompt' | 'aspectRatio'>> {
  const res = await fetch(IMAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, aspectRatio }),
  });

  const result = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(result?.error || `Image generation failed (${res.status})`);
  }

  if (
    !result?.image ||
    typeof result.image.data !== 'string' ||
    typeof result.image.mimeType !== 'string' ||
    !result.image.mimeType.startsWith('image/')
  ) {
    throw new Error('Gemini returned an unexpected image response.');
  }

  return result.image;
}