import { useEffect, useState } from "react";
import { CustomerApp } from "./customer";
import { Gate } from "./gate";
import { OwnerApp } from "./owner";
import { SuperApp } from "./super";
import { LangSelect, useI18n } from "@/lib/go/i18n";
import { useGo } from "@/lib/go/store";

function Splash() {
  const { t } = useI18n();
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-x-hidden bg-paper px-6 text-ink">
      <p className="brand-mark text-4xl leading-tight text-stamp">{t.brand}</p>
      <p className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[10px] tracking-wide text-muted">
        {t.poweredBy}
      </p>
    </div>
  );
}

export function Shell() {
  const go = useGo();
  const { t } = useI18n();
  const [hold, setHold] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setHold(false), 1200);
    return () => window.clearTimeout(id);
  }, []);
  if (!go.ready || hold) return <Splash />;
  return (
    <div className={`min-w-0 overflow-x-hidden ${go.session ? "" : "flex min-h-dvh flex-col"}`}>
      {!go.session && (
        <div className="no-print flex w-full justify-end px-4 pt-3" style={{ paddingRight: "max(1rem, env(safe-area-inset-right))" }}>
          <LangSelect />
        </div>
      )}
      {!go.session && (
        <div className="flex min-w-0 flex-1 flex-col">
          <Gate />
        </div>
      )}
      {go.session?.kind === "owner" && <OwnerApp />}
      {go.session?.kind === "customer" && <CustomerApp />}
      {go.session?.kind === "super" && <SuperApp />}
    </div>
  );
}
