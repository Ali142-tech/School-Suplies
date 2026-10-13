import Link from 'next/link';
import type { ReactNode } from 'react';
import { isSafeUrl } from '@/lib/cms';

/** Renders a link only when its target passes the same allow-list the backend enforces. */
export function SafeLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const url = href.trim();
  if (!isSafeUrl(url)) return <span className={className}>{children}</span>;
  if (url.startsWith('/') || url.startsWith('#')) return <Link className={className} href={url}>{children}</Link>;
  const external = /^https?:/i.test(url);
  return <a className={className} href={url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\n]+\))/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).filter(part => part !== '').map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={k}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <SafeLink key={k} href={link[2]}>{link[1]}</SafeLink>;
    return part;
  });
}

/**
 * Restricted markup → React elements: **bold**, *italic*, [text](url), "- " bullets, "1. " numbered items.
 * Everything is emitted as React text nodes, so vendor content can never inject HTML or script.
 */
export function RichText({ text, className }: { text?: string; className?: string }) {
  if (!text?.trim()) return null;
  const nodes: ReactNode[] = [];
  let para: string[] = []; let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => { if (para.length) { const k = `p${nodes.length}`; nodes.push(<p key={k}>{para.flatMap((line, i) => [i ? <br key={`${k}-br${i}`} /> : null, ...inline(line, `${k}-${i}`)])}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const k = `l${nodes.length}`; const items = list.items.map((item, i) => <li key={i}>{inline(item, `${k}-${i}`)}</li>);
    nodes.push(list.ordered ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>); list = null;
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^-\s+(.*)$/); const number = line.match(/^\d+\.\s+(.*)$/);
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (bullet || number) {
      flushPara(); const ordered = !!number;
      if (list && list.ordered !== ordered) flushList();
      list = list ?? { ordered, items: [] }; list.items.push((bullet ?? number)![1]);
    } else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return <div className={className ?? 'cms-rich'}>{nodes}</div>;
}
