import { useState } from "react";
import { customerSignIn, ownerGoogleSignIn } from "@/lib/go/data";
import { useT } from "@/lib/go/i18n";
import { Button, Field, errText, useToast } from "./ui";

export function Gate() {
  const { t, toggle } = useT();
  const toast = useToast();
  const [tab, setTab] = useState<"customer" | "owner">("customer");
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("shop") ?? localStorage.getItem("go.lastShop") ?? "");
  const [user, setUser] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function customer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await customerSignIn(code, user, pin);
      localStorage.setItem("go.lastShop", code.trim().toUpperCase());
    } catch {
      toast(t("badLogin"), true);
    } finally {
      setBusy(false);
    }
  }
  async function owner() {
    setBusy(true);
    try {
      await ownerGoogleSignIn();
    } catch (e) {
      toast(errText(e), true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-display text-5xl text-stamp">Go Service</h1>
        <p className="mt-2 text-sm text-muted">{t("tagline")}</p>
      </div>
      <div className="grid grid-cols-2 rounded-xl bg-paid-bg p-1">
        {(["customer", "owner"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-white text-stamp shadow" : "text-muted"}`}
          >
            {t(k)}
          </button>
        ))}
      </div>
      {tab === "customer" ? (
        <form className="space-y-3" onSubmit={customer}>
          <Field label={t("shopId")} autoCapitalize="characters" autoComplete="organization" value={code} onChange={(e) => setCode(e.target.value)} required />
          <Field label={t("username")} autoCapitalize="none" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required />
          <Field label={t("pin")} type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} required />
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? t("signingIn") : t("signIn")}
          </Button>
          <p className="text-center text-xs text-muted">{t("askOwner")}</p>
        </form>
      ) : (
        <div className="space-y-3">
          <Button className="w-full" tone="ghost" disabled={busy} onClick={() => void owner()}>
            <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {t("googleSignIn")}
          </Button>
        </div>
      )}
      <button className="text-sm text-muted underline" onClick={toggle}>
        {t("language")}
      </button>
    </main>
  );
}
