import { BookOpen, Clock, Heart, Mail, MapPin, Package, Phone, Printer, ShieldCheck, Star, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Block } from '@/lib/cms';
import { HEX } from '@/lib/cms';
import { RichText, SafeLink } from './rich-text';
import { SafeImage } from './safe-image';

const ICON_MAP: Record<string, typeof Package> = { package: Package, printer: Printer, truck: Truck, shield: ShieldCheck, heart: Heart, star: Star, book: BookOpen, clock: Clock };

function Picture({ block, className, fallback }: { block: Block; className?: string; fallback?: ReactNode }) {
  return <SafeImage src={block.image_url} alt={block.alt} className={className} fallback={fallback} />;
}

function CtaLink({ label, url, kind = 'primary' }: { label?: string; url?: string; kind?: string }) {
  if (!label || !url) return null;
  return <SafeLink href={url} className={kind === 'secondary' ? 'button-secondary' : 'button-primary'}>{label}</SafeLink>;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero':
      return <section className={`cms-block cms-hero align-${block.align === 'center' ? 'center' : 'left'}${block.image_url ? ' has-image' : ''}`}>
        <div className="cms-hero-copy"><h1>{block.heading}</h1>{block.subheading && <p>{block.subheading}</p>}<CtaLink label={block.cta_label} url={block.cta_url} /></div>
        {block.image_url && <Picture block={block} className="cms-hero-image" />}
      </section>;
    case 'heading_text': {
      const Tag = block.level === 3 ? 'h3' : 'h2';
      return <section className="cms-block cms-text">{block.heading && <Tag>{block.heading}</Tag>}<RichText text={block.body} /></section>;
    }
    case 'image':
      return <figure className="cms-block cms-image"><Picture block={block} fallback={block.alt ? <div className="cms-missing-image" role="img" aria-label={block.alt}>{block.alt}</div> : null} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    case 'image_text':
      return <section className={`cms-block cms-image-text pos-${block.image_position === 'right' ? 'right' : 'left'}`}>
        <Picture block={block} className="cms-side-image" />
        <div className="cms-side-copy">{block.heading && <h2>{block.heading}</h2>}<RichText text={block.body} /><CtaLink label={block.cta_label} url={block.cta_url} /></div>
      </section>;
    case 'features':
      return <section className="cms-block cms-features">{block.heading && <h2>{block.heading}</h2>}
        <div className="cms-feature-grid">{block.items?.map((item, i) => { const Icon = ICON_MAP[item.icon ?? '']; return <div className="cms-feature" key={i}>{Icon && <span className="cms-feature-icon"><Icon size={20} /></span>}<h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>; })}</div>
      </section>;
    case 'cta':
      return <section className="cms-block cms-cta"><h2>{block.heading}</h2>{block.text && <p>{block.text}</p>}<CtaLink label={block.button_label} url={block.button_url} kind={block.style} /></section>;
    case 'contact': {
      const rows: [ReactNode, ReactNode][] = [];
      if (block.email) rows.push([<Mail key="i" size={17} />, <a key="v" href={`mailto:${block.email}`}>{block.email}</a>]);
      if (block.phone) rows.push([<Phone key="i" size={17} />, <a key="v" href={`tel:${block.phone.replace(/[^0-9+]/g, '')}`}>{block.phone}</a>]);
      if (block.address) rows.push([<MapPin key="i" size={17} />, <span key="v">{block.address}</span>]);
      if (block.hours) rows.push([<Clock key="i" size={17} />, <span key="v">{block.hours}</span>]);
      return <section className="cms-block cms-contact">{block.heading && <h2>{block.heading}</h2>}<ul>{rows.map(([icon, value], i) => <li key={i}>{icon}{value}</li>)}</ul></section>;
    }
    default:
      return null;
  }
}

export function BlockRenderer({ blocks, brandColor, accentColor }: { blocks: Block[]; brandColor?: string | null; accentColor?: string | null }) {
  const style = { ...(brandColor && HEX.test(brandColor) ? { '--cms-brand': brandColor } : {}), ...(accentColor && HEX.test(accentColor) ? { '--cms-accent': accentColor } : {}) } as React.CSSProperties;
  return <div className="cms-page" style={style}>{blocks.map(block => <BlockView key={block.id} block={block} />)}</div>;
}
