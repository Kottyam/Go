import { useState } from "react";
import { useI18n } from "@/lib/go/i18n";
import { useGo } from "@/lib/go/store";
import { Btn, Field, TextInput } from "./ui";

export function Gate() {
  const go = useGo();
  const { t } = useI18n();
  const [shopCode, setShopCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState(false);

  if (auth) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-x-hidden px-5 py-8">
        <h1 className="brand-mark text-center text-3xl leading-tight text-stamp">{t.brand}</h1>
        <p className="mt-8 text-center text-lg font-semibold">{t.openingGoogle}</p>
        <p className="mt-2 text-center text-sm leading-6 text-muted">{t.googleWait}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-x-hidden px-5 py-8">
      <h1 className="brand-mark text-center text-3xl leading-tight text-stamp">{t.brand}</h1>

      <Btn
        className="mt-8 w-full"
        tone="ink"
        disabled={go.busy}
        onClick={() => {
          setAuth(true);
          void go.signInOwner().catch(() => setAuth(false));
        }}
      >
        {t.providerIn}
      </Btn>

      <p className="my-4 text-center text-xs uppercase tracking-wide text-muted">{t.orWord}</p>

      <form
        className="sheet grid min-w-0 gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void go.loginMember(shopCode, username, password);
        }}
      >
        <h2 className="font-semibold">{t.memberTitle}</h2>
        <Field label={t.shopCode}>
          <TextInput autoComplete="off" value={shopCode} onChange={(e) => setShopCode(e.target.value)} placeholder="GO2048" required />
        </Field>
        <Field label={t.username}>
          <TextInput autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label={t.password}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Btn type="submit" className="w-full" tone="stamp" disabled={go.busy}>
          {t.memberIn}
        </Btn>
      </form>
    </main>
  );
}
