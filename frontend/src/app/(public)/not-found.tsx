import Link from '@/components/store-link';

// Rendered inside the active chrome: the vendor's own layout on a vendor domain, the marketplace layout elsewhere.
export default function NotFound() {
  return <div className="empty-state" role="alert">
    <h1 style={{ font: '700 26px Manrope,sans-serif' }}>Page not found</h1>
    <p>The page you are looking for does not exist or is not available.</p>
    <Link className="button-secondary" href="/">Back to home</Link>
  </div>;
}
