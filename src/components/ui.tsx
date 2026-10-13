import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
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
