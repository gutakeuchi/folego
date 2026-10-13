import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
export function LoadingScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-dvh bg-canvas" aria-busy="true">
      <p role="status" aria-live="polite" className="sr-only">
        {title}. {description}
      </p>
      <div aria-hidden="true" className="screen-enter mx-auto max-w-7xl">
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-4 sm:px-8">
          <div className="space-y-2">
            <div className="skeleton h-2 w-28" />
            <div className="skeleton h-5 w-20" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton size-11 rounded-xl" />
            <div className="skeleton size-11 rounded-xl" />
          </div>
        </div>
        <div className="space-y-5 px-3 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="skeleton size-11 rounded-xl" />
            <div className="skeleton h-4 w-36" />
            <div className="skeleton size-11 rounded-xl" />
          </div>
          <div className="skeleton h-4 w-28" />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton mt-5 h-6 w-44" />
            <div className="skeleton mt-4 h-3 w-3/4" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="skeleton h-3 w-28" />
                <div className="skeleton mt-5 h-7 w-36" />
                <div className="skeleton mt-5 h-3 w-4/5" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="skeleton mb-6 h-5 w-40" />
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-4 py-3">
                <div className="skeleton size-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-2 w-1/3" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary:
      "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
    />
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-400">
      {children}
    </p>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-10 text-center text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-6 text-ink shadow-2xl"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <h2 id="modal-title" className="text-xl font-extrabold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200"
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
