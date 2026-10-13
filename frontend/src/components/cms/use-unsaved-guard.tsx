'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';

/**
 * Protects unsaved edits. While `dirty` is true:
 *  - closing/reloading the tab triggers the browser's own "leave site?" prompt, and
 *  - clicking any in-app link (sidebar, header, breadcrumbs…) asks for confirmation first.
 * Render the returned element once in the screen. The browser Back button cannot be intercepted reliably in the
 * Next.js App Router, so it is covered only by the tab-close prompt.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    // Capture phase on document: runs before Next's <Link> handler, so navigation can be cancelled.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(url.pathname + url.search + url.hash);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [dirty]);

  return <ConfirmDialog open={target !== null} danger title="Leave without saving?" message="You have unsaved changes on this page. If you leave now, they will be lost." confirmLabel="Leave without saving"
    onCancel={() => setTarget(null)} onConfirm={() => { const destination = target; setTarget(null); if (destination) router.push(destination); }} />;
}
