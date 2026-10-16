import type { Metadata } from 'next';
import '../vendor/vendor.css';
import '../portal.css';

export const metadata: Metadata = { title: { default: 'School portal', template: '%s — School portal' }, robots: { index: false, follow: false } };
export default function SchoolRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="vp" data-portal="school">{children}</div>;
}
