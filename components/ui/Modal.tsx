"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  labelledBy,
  maxWidthClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={maxWidthClassName ? `modal ${maxWidthClassName}` : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  titleId,
  title,
  subtitle,
  onClose,
}: {
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="modal__head">
      <div>
        <div className="modal__title" id={titleId}>
          {title}
        </div>
        {subtitle ? <div className="modal__sub">{subtitle}</div> : null}
      </div>
      <button type="button" className="modal__close" aria-label="Tutup" onClick={onClose}>
        &times;
      </button>
    </div>
  );
}
