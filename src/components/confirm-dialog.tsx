"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="forum-modal-backdrop"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="forum-modal-shell"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="forum-confirm-title"
        aria-describedby="forum-confirm-description"
      >
        <section className="forum-card forum-modal-card p-6 sm:p-7">
          <div className="forum-inline-note">Confirmation</div>
          <h2 id="forum-confirm-title" className="forum-title mt-4 text-3xl sm:text-4xl">
            {title}
          </h2>
          <p
            id="forum-confirm-description"
            className="forum-muted mt-4 text-sm leading-7"
          >
            {description}
          </p>

          <div className="forum-toolbar mt-6 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="forum-button-secondary"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={
                tone === "danger" ? "forum-button-danger-solid" : "forum-button-primary"
              }
            >
              {busy ? "Traitement…" : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
