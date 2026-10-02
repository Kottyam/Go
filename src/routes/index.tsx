import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Shell } from "@/components/go/shell";
import { I18nProvider } from "@/lib/go/i18n";
import { GoProvider } from "@/lib/go/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <ClientOnly
      fallback={
        <div className="relative grid min-h-dvh place-items-center overflow-x-hidden bg-paper px-6 text-ink">
          <p className="brand-mark text-4xl leading-tight text-stamp">Go Service</p>
          <p className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[10px] tracking-wide text-muted">
            powered by Alien 1729
          </p>
        </div>
      }
    >
      <I18nProvider>
        <GoProvider>
          <Shell />
        </GoProvider>
      </I18nProvider>
    </ClientOnly>
  );
}

function ClientOnly({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? children : fallback;
}
