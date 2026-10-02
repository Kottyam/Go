import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y?.slice(2) ?? ""}`;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ""}`} />;
}

export function Btn({
  tone = "ink",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ink" | "stamp" | "ghost" | "paid" | "gold" }) {
  const toneClass =
    tone === "stamp"
      ? "bg-stamp px-4 text-sm text-stamp-ink"
      : tone === "gold"
        ? "bg-gold px-3 text-xs text-gold-ink"
        : tone === "ghost"
          ? "border border-line bg-card px-4 text-sm text-ink"
          : tone === "paid"
            ? "bg-paid px-4 text-sm text-stamp-ink"
            : "bg-ink px-4 text-sm text-paper";
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full font-semibold disabled:opacity-50 ${toneClass} ${props.className ?? ""}`}
    />
  );
}

export function Money({ n, tone = "ink" }: { n: number; tone?: "ink" | "due" | "paid" }) {
  const cls = tone === "due" ? "text-due" : tone === "paid" ? "text-paid" : "text-ink";
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
  return <span className={`font-display tracking-tight ${cls}`}>{formatted}</span>;
}
