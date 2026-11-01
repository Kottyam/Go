import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { inr } from "@/lib/go/logic";
import { useT } from "@/lib/go/i18n";

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Button({
  tone = "primary",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" | "soft" }) {
  const tones = {
    primary: "bg-stamp text-stamp-ink active:brightness-95",
    soft: "bg-paid-bg text-paid",
    ghost: "border border-line bg-white text-ink",
    danger: "bg-due-bg text-due",
  };
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50",
        tones[tone],
        className,
      )}
    />
  );
}

export function Field({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        {...p}
        className="h-12 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-stamp"
      />
    </label>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx("rounded-2xl border border-line bg-card p-4", onClick && "cursor-pointer active:bg-paid-bg/40", className)}
    >
      {children}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="rounded-lg px-2 py-1 text-sm text-muted" onClick={onClose}>
            {t("close")}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "due" | "paid" }) {
  return (
    <div className={cx("rounded-2xl p-4", tone === "due" ? "bg-due-bg text-due" : tone === "paid" ? "bg-paid-bg text-paid" : "bg-paid-bg/50")}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export function Due({ amount }: { amount: number }) {
  const { t } = useT();
  if (Math.abs(amount) < 0.005) return <span className="text-sm font-semibold text-paid">{t("settled")}</span>;
  return amount > 0 ? (
    <span className="font-bold text-due">{inr(amount)}</span>
  ) : (
    <span className="font-bold text-paid">
      {inr(-amount)} {t("advance")}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function StatusPill({ status }: { status: "placed" | "accepted" | "delivered" | "cancelled" }) {
  const { t } = useT();
  const c = {
    placed: "bg-amber-100 text-amber-800",
    accepted: "bg-sky-100 text-sky-800",
    delivered: "bg-paid-bg text-paid",
    cancelled: "bg-gray-100 text-gray-500 line-through",
  }[status];
  return <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", c)}>{t(status)}</span>;
}

export function Dock<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => onChange(tb.id)}
            className={cx("relative flex-1 py-3 text-sm font-semibold", value === tb.id ? "text-stamp" : "text-muted")}
          >
            {tb.label}
            {!!tb.badge && (
              <span className="absolute right-3 top-1.5 min-w-5 rounded-full bg-due px-1 text-[10px] leading-5 text-white">{tb.badge}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function TopBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl text-stamp">{title}</h1>
          {sub && <p className="truncate text-xs text-muted">{sub}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">{right}</div>
      </div>
    </header>
  );
}

// ---- toast ----
const ToastCtx = createContext<(msg: string, bad?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const show = useCallback((text: string, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div
          role="status"
          className={cx(
            "fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg",
            msg.bad ? "bg-due text-white" : "bg-ink text-white",
          )}
        >
          {msg.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function errText(e: unknown) {
  const code = (e as { code?: string }).code ?? "";
  if (code === "permission-denied") return "Not allowed (permission denied)";
  if (code.startsWith("auth/")) return code.replace("auth/", "").replaceAll("-", " ");
  return (e as Error)?.message || String(e);
}

export function when(ms: number) {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
