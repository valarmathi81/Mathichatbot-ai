import { useMemo, useState, type ReactNode } from 'react';

/** Lightweight markdown renderer (headings, lists, bold, code, tables, quotes). */
export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return <div className="md text-sm text-white/85" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

function renderMarkdown(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (line.trim().startsWith('```')) {
      closeList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // table (simple: header | sep | rows)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      closeList();
      const headers = line.split('|').map((h) => h.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map((c) => c.trim()).filter(Boolean));
        i++;
      }
      out.push('<table><thead><tr>' + headers.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>');
      for (const row of rows) {
        out.push('<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table>');
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`);
      i++;
      continue;
    }

    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeList();
  return out.join('\n');
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="typing-dot" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot" style={{ animationDelay: '180ms' }} />
      <span className="typing-dot" style={{ animationDelay: '360ms' }} />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-neon-cyan mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white/90">{title}</h3>
      <p className="text-sm text-white/50 mt-1 max-w-sm">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass border-neon-pink/30 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
      <span className="text-neon-pink mt-0.5">⚠</span>
      <div className="flex-1 text-sm text-white/80">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost !py-1 !px-3 text-xs">
          Retry
        </button>
      )}
    </div>
  );
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return { copied, copy };
}
