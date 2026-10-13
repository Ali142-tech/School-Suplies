// Shared types and client-side rules for the vendor CMS. Laravel remains the authority: these checks only give
// vendors instant, readable feedback and mirror the backend validation (BlockSanitizer, SafeUrl, PlainText, RichText).

export type BlockType = 'hero' | 'heading_text' | 'image' | 'image_text' | 'features' | 'cta' | 'contact';
export type FeatureItem = { title: string; description?: string; icon?: string };
export type Block = {
  id: string; type: BlockType;
  heading?: string; subheading?: string; body?: string; level?: number; align?: string;
  image?: string; image_url?: string; alt?: string; caption?: string; image_position?: string;
  cta_label?: string; cta_url?: string;
  items?: FeatureItem[];
  text?: string; button_label?: string; button_url?: string; style?: string;
  email?: string; phone?: string; address?: string; hours?: string;
};
export type PageSummary = {
  id: number; slug: string; kind: string; title: string; status: 'draft' | 'published' | 'unpublished';
  is_default: boolean; is_deletable: boolean; public_path: string; has_unpublished_changes: boolean;
  published_at: string | null; updated_at: string; updated_by: string | null;
};
export type PageDetail = PageSummary & { seo_title: string | null; meta_description: string | null; blocks: Block[] };
export type PreviewPage = { slug: string; kind: string; status: string; title: string; seo_title: string | null; meta_description: string | null; blocks: Block[] };

export const ICONS = ['package', 'printer', 'truck', 'shield', 'heart', 'star', 'book', 'clock'] as const;
export const MAX_BLOCKS = 40;

export const BLOCK_TYPES: { type: BlockType; label: string; description: string }[] = [
  { type: 'hero', label: 'Hero / Banner', description: 'A large headline with an optional picture and button.' },
  { type: 'heading_text', label: 'Heading and text', description: 'A heading with paragraphs, lists and links.' },
  { type: 'image', label: 'Image', description: 'A single picture with a caption.' },
  { type: 'image_text', label: 'Image and text', description: 'A picture beside a heading and text.' },
  { type: 'features', label: 'Features / Services', description: 'Up to eight short highlights or services.' },
  { type: 'cta', label: 'Call to action', description: 'A prominent message with a button.' },
  { type: 'contact', label: 'Contact information', description: 'Email, phone, address and opening hours.' },
];
export const blockLabel = (type: string) => BLOCK_TYPES.find(b => b.type === type)?.label ?? type;

export function newBlockId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export function newBlock(type: BlockType): Block {
  const id = newBlockId();
  switch (type) {
    case 'hero': return { id, type, heading: '', align: 'left' };
    case 'heading_text': return { id, type, heading: '', level: 2, body: '' };
    case 'image': return { id, type, alt: '' };
    case 'image_text': return { id, type, alt: '', image_position: 'left' };
    case 'features': return { id, type, items: [{ title: '' }] };
    case 'cta': return { id, type, heading: '', button_label: '', button_url: '', style: 'primary' };
    case 'contact': return { id, type };
  }
}

export function isSafeUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url || url.length > 2048 || /[\s\x00-\x1F\x7F\\<>"']/.test(url)) return false;
  if (/^#[A-Za-z0-9_-]+$/.test(url) || /^\/(?!\/)\S*$/.test(url)) return true;
  if (/^mailto:[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(url)) return true;
  if (/^tel:\+?[0-9()\-.]{5,32}$/.test(url)) return true;
  if (/^https?:\/\//i.test(url)) {
    try { const parsed = new URL(url); return !!parsed.hostname && !parsed.username && !parsed.password; } catch { return false; }
  }
  return false;
}

export const URL_HINT = 'Use a full https:// link, mailto:, tel:, a path like /products, or an #anchor.';
export const HEX = /^#[0-9a-fA-F]{6}$/;
const hasMarkup = (v: string) => /<\s*[a-z!/?]/i.test(v);

/** Field errors keyed by "<blockIndex>.<field>" (e.g. "2.heading", "3.items.0.title"). */
export type FieldErrors = Record<string, string>;

export function textProblem(value: string | undefined, label: string, max: number, required = false): string | null {
  const v = (value ?? '').trim();
  if (!v) return required ? `${label} is required.` : null;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (hasMarkup(v)) return `${label} cannot contain HTML. Plain text only.`;
  return null;
}

export function richTextProblem(value: string | undefined, label: string, max: number): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (hasMarkup(v)) return `${label} cannot contain HTML. Use the formatting buttons instead.`;
  const links = /\[[^\]]*\]\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = links.exec(v)) !== null) if (!isSafeUrl(m[1])) return `${label} contains a link that is not allowed. ${URL_HINT}`;
  return null;
}

export function validateBlock(block: Block, index: number): FieldErrors {
  const errors: FieldErrors = {};
  const add = (field: string, message: string | null) => { if (message) errors[`${index}.${field}`] = message; };
  const urlCheck = (field: string, value: string | undefined, label: string, required: boolean) => {
    const v = (value ?? '').trim();
    if (!v) { if (required) add(field, `${label} is required.`); return; }
    if (!isSafeUrl(v)) add(field, `${label} is not allowed. ${URL_HINT}`);
  };
  const cta = () => {
    add('cta_label', textProblem(block.cta_label, 'Button text', 40, !!block.cta_url?.trim()));
    urlCheck('cta_url', block.cta_url, 'Button link', !!block.cta_label?.trim());
  };
  const image = () => { if (!block.image) add('image', 'Choose an image.'); add('alt', textProblem(block.alt, 'Image description', 200, true)); };
  switch (block.type) {
    case 'hero':
      add('heading', textProblem(block.heading, 'Headline', 120, true)); add('subheading', textProblem(block.subheading, 'Subheading', 300)); cta(); break;
    case 'heading_text':
      add('heading', textProblem(block.heading, 'Heading', 160)); add('body', richTextProblem(block.body, 'Text', 10000));
      if (!block.heading?.trim() && !block.body?.trim()) add('heading', 'Add a heading or some text.');
      break;
    case 'image': image(); add('caption', textProblem(block.caption, 'Caption', 200)); break;
    case 'image_text':
      image(); add('heading', textProblem(block.heading, 'Heading', 160)); add('body', richTextProblem(block.body, 'Text', 5000)); cta(); break;
    case 'features':
      add('heading', textProblem(block.heading, 'Heading', 160));
      if (!block.items?.length) add('items', 'Add at least one item.');
      block.items?.forEach((item, i) => { add(`items.${i}.title`, textProblem(item.title, 'Title', 80, true)); add(`items.${i}.description`, textProblem(item.description, 'Description', 300)); });
      break;
    case 'cta':
      add('heading', textProblem(block.heading, 'Heading', 160, true)); add('text', textProblem(block.text, 'Text', 300));
      add('button_label', textProblem(block.button_label, 'Button text', 40, true)); urlCheck('button_url', block.button_url, 'Button link', true);
      break;
    case 'contact':
      add('heading', textProblem(block.heading, 'Heading', 160));
      if (block.email?.trim() && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(block.email.trim())) add('email', 'Enter a valid email address.');
      if (block.phone?.trim() && !/^[0-9+()\-\s.]{5,32}$/.test(block.phone.trim())) add('phone', 'Phone may only contain digits, spaces, + ( ) - and . (5–32 characters).');
      add('address', textProblem(block.address, 'Address', 300)); add('hours', textProblem(block.hours, 'Opening hours', 200));
      if (!['email', 'phone', 'address', 'hours'].some(k => (block[k as keyof Block] as string | undefined)?.trim())) add('email', 'Add at least one contact detail.');
      break;
  }
  return errors;
}

export function validateBlocks(blocks: Block[]): FieldErrors {
  return blocks.reduce<FieldErrors>((all, block, i) => ({ ...all, ...validateBlock(block, i) }), {});
}

/** Removes client-only keys and empty strings before sending blocks to Laravel. */
export function serializeBlocks(blocks: Block[]) {
  return blocks.map(({ image_url: _unused, ...block }) => {
    void _unused;
    const clean = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(clean);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, clean(v)]));
      return value;
    };
    return clean(block);
  });
}

/** Maps a Laravel 422 `errors` object ("blocks.2.heading": [...]) onto FieldErrors plus page-level errors. */
export function mapApiErrors(details: unknown): { fields: FieldErrors; page: Record<string, string> } {
  const fields: FieldErrors = {}; const page: Record<string, string> = {};
  if (details && typeof details === 'object') {
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      const message = Array.isArray(value) ? String(value[0]) : String(value);
      const m = key.match(/^blocks\.(\d+)\.(.+)$/);
      if (m) fields[`${m[1]}.${m[2]}`] = message; else page[key] = message;
    }
  }
  return { fields, page };
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function roleCanWrite(role: string | undefined, vendorStatus: string | undefined) {
  return (role === 'owner' || role === 'manager') && vendorStatus === 'active';
}
