"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function AdminModal({ title, description, onClose, children }: Props) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="adminModalBackdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="adminModal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="adminModalHeader">
          <div>
            <span className="kicker">VILLAGE WELLNESS SPA · CATALOGUE</span>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="adminModalClose" type="button" onClick={onClose} aria-label="Close editor"><X size={20}/></button>
        </header>
        <div className="adminModalBody">{children}</div>
      </section>
    </div>
  );
}
