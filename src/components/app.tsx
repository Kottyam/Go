import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/go/firebase";
import { readMember, logout } from "@/lib/go/data";
import { isMemberEmail } from "@/lib/go/logic";
import { I18nProvider, useT } from "@/lib/go/i18n";
import type { Session } from "@/lib/go/types";
import { Gate } from "./gate";
import { OwnerApp } from "./owner";
import { CustomerApp } from "./customer";
import { Button, ToastProvider } from "./ui";

export function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </I18nProvider>
  );
}

async function toSession(u: User): Promise<Session> {
  if (isMemberEmail(u.email)) {
    const m = await readMember(u.uid).catch(() => null);
    return m ? { kind: "customer", uid: u.uid, ...m } : { kind: "unlinked", uid: u.uid, email: u.email ?? "" };
  }
  return { kind: "owner", uid: u.uid, name: u.displayName ?? u.email ?? "", email: u.email ?? "" };
}

function Root() {
  const { t } = useT();
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) return setS(null);
        void toSession(u).then(setS);
      }),
    [],
  );
  if (s === undefined)
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="font-display text-4xl text-stamp">Go Service</p>
      </div>
    );
  if (s === null) return <Gate />;
  if (s.kind === "owner") return <OwnerApp session={s} />;
  if (s.kind === "customer") return <CustomerApp session={s} />;
  return (
    <div className="mx-auto grid min-h-dvh max-w-sm place-items-center p-6 text-center">
      <div className="space-y-4">
        <p>{t("notLinked")}</p>
        <Button onClick={() => void logout()}>{t("signOut")}</Button>
      </div>
    </div>
  );
}
