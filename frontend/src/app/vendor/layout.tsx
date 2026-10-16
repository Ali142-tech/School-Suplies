import './vendor.css';

export default function VendorRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="vp">{children}</div>;
}
