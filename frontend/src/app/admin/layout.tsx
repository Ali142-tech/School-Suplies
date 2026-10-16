import type { Metadata } from 'next';
import '../vendor/vendor.css';
import '../portal.css';

export const metadata: Metadata = { title: { default: 'Admin — Papertrail', template: '%s — Papertrail Admin' }, robots: { index: false, follow: false } };
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="vp" data-portal="admin">{children}</div>;
}
