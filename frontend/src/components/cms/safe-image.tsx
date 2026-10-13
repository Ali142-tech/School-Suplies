'use client';

import { useEffect, useRef, useState } from 'react';

/** An <img> that disappears (or shows a fallback) instead of a broken-image icon when the file is missing. */
export function SafeImage({ src, alt, className, fallback = null }: { src?: string | null; alt?: string; className?: string; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The error event can fire before React hydrates, so also check the image state once mounted.
  useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth === 0) setFailed(true); }, [src]);
  if (!src || failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element -- vendor image URLs come from the API's storage and are not known at build time
  return <img ref={ref} src={src} alt={alt ?? ''} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
