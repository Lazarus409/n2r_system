"use client";

import { useCallback, useRef, useState } from "react";
import { IconAlert, IconCheckCircle } from "@/app/components/Icons";

type Opts = { title: string; body: string; confirm: string; danger?: boolean };

/** Promise-based confirmation dialog built on the native <dialog> element (focus trap and Esc handling for free). */
export function useConfirm(): [React.ReactNode, (o: Opts) => Promise<boolean>] {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const [opts, setOpts] = useState<Opts | null>(null);

  const ask = useCallback((o: Opts) => {
    setOpts(o);
    requestAnimationFrame(() => ref.current?.showModal());
    return new Promise<boolean>((r) => { resolver.current = r; });
  }, []);

  const close = (v: boolean) => {
    ref.current?.close();
    resolver.current(v);
  };

  const node = (
    <dialog ref={ref} className="modal" onCancel={(e) => { e.preventDefault(); close(false); }} aria-labelledby="confirm-title">
      {opts && (
        <>
          <div className="modal-body">
            <div className={`modal-icon${opts.danger ? "" : " ok"}`}>{opts.danger ? <IconAlert /> : <IconCheckCircle />}</div>
            <div>
              <h2 id="confirm-title" style={{ fontSize: 18 }}>{opts.title}</h2>
              <p className="muted" style={{ margin: "6px 0 0" }}>{opts.body}</p>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => close(false)} autoFocus>Cancel</button>
            <button className={`btn ${opts.danger ? "danger" : ""}`} onClick={() => close(true)}>{opts.confirm}</button>
          </div>
        </>
      )}
    </dialog>
  );
  return [node, ask];
}
