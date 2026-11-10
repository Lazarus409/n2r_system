"use client";

import { useCallback, useRef, useState } from "react";
import { IconAlert, IconCheckCircle, IconX } from "@/app/components/Icons";

export type Toast = { id: number; kind: "success" | "error"; text: string };
export type PushToast = (kind: Toast["kind"], text: string) => void;

export function useToasts(): [React.ReactNode, PushToast] {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<PushToast>((kind, text) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, [dismiss]);

  const node = (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === "success" ? <IconCheckCircle /> : <IconAlert />}
          <span className="grow">{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><IconX size={16} /></button>
        </div>
      ))}
    </div>
  );
  return [node, push];
}
