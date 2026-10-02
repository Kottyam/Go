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
        <div className="grid min-h-screen place-items-center bg-paper text-ink">
          <div className="text-center">
            <p className="font-display text-5xl text-stamp">GO Service</p>
            <p className="mt-3 text-xs tracking-wide text-muted">powered by Alien 1729</p>
          </div>
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
