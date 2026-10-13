'use client';

import { useEffect, useRef } from 'react';

/** Accessible confirmation dialog built on the native <dialog> element (focus trap, Escape to close). */
export function ConfirmDialog({ open, title, message, confirmLabel, busy = false, danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="cms-dialog" aria-labelledby="cms-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="cms-dialog-title">{title}</h2>
    <p>{message}</p>
    <div className="cms-dialog-actions">
      <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
      <button type="button" className={danger ? 'button-primary cms-danger' : 'button-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
    </div>
  </dialog>;
}
