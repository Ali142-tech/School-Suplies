import Link from 'next/link';
import { PackageCheck, ShieldCheck, type LucideIcon } from 'lucide-react';

export type AuthFeature = { icon: LucideIcon; title: string; text: string };

/** Split-screen sign-in / registration frame shared by every portal. The marketing panel is tinted by `data-portal`. */
export function AuthFrame({ portalLabel, title, text, features, children, brandName = 'papertrail', homeHref = '/' }: {
  portalLabel: string; title: string; text: string; features: AuthFeature[]; children: React.ReactNode; brandName?: string; homeHref?: string;
}) {
  return <div className="vp-auth">
    <aside className="vp-auth-aside">
      <Link href={homeHref} className="vp-logo"><i><PackageCheck size={19} /></i><span>{brandName} <small>{portalLabel}</small></span></Link>
      <div>
        <h2>{title}</h2><p>{text}</p>
        <ul className="vp-feats">{features.map(({ icon: Icon, title: t, text: d }) => <li key={t}><Icon size={16} /><span><b>{t}</b>{d}</span></li>)}</ul>
      </div>
      <div className="vp-auth-foot"><ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> Secure sign-in · Access is checked on the server</div>
    </aside>
    <main className="vp-auth-main"><div className="vp-auth-card">
      <Link href={homeHref} className="vp-logo vp-auth-top"><i><PackageCheck size={19} /></i><span>{brandName} <small>{portalLabel}</small></span></Link>
      {children}
    </div></main>
  </div>;
}
