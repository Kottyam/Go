import { useState } from "react";
import { useI18n } from "@/lib/go/i18n";
import { useGo } from "@/lib/go/store";
import { Btn, Field, TextInput } from "./ui";

export function Gate() {
  const go = useGo();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-8">
      <header className="text-center">
        <h1 className="font-display text-6xl leading-none text-stamp sm:text-7xl">{t.brand}</h1>
        <p className="mt-3 text-xs tracking-wide text-muted">{t.poweredBy}</p>
      </header>

      <form
        className="mt-10 sheet grid gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void go.loginMember(username, password);
        }}
      >
        <h2 className="font-semibold">{t.memberTitle}</h2>
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
        <Btn type="submit" tone="stamp" disabled={go.busy}>
          {t.memberIn}
        </Btn>
        <p className="text-center text-xs text-muted">{t.sampleMember}</p>
      </form>

      <p className="my-4 text-center text-xs uppercase tracking-wide text-muted">{t.orWord}</p>

      <section className="sheet grid gap-3 p-4">
        <p className="text-sm leading-6 text-muted">{t.providerLead}</p>
        <Btn tone="ink" disabled={go.busy} onClick={() => void go.signInOwner()}>
          {t.providerIn}
        </Btn>
        <button type="button" className="min-h-11 text-sm text-muted underline" onClick={go.enterDemoOwner}>
          {t.sampleShop}
        </button>
      </section>
    </main>
  );
}
