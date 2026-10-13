'use client';

export default function PageError({ reset }: { error: Error; reset: () => void }) {
  return <div className="empty-state" role="alert">
    <h1 style={{ font: '700 26px Manrope,sans-serif' }}>This page is temporarily unavailable</h1>
    <p>Something went wrong while loading this page. Please try again in a moment.</p>
    <button className="button-secondary" onClick={reset}>Try again</button>
  </div>;
}
