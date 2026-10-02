import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Shell } from "@/components/go/shell";
import { GoProvider } from "@/lib/go/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <ClientOnly
      fallback={
        <div className="grid min-h-screen place-items-center bg-paper text-ink">
          <div className="text-center">
            <p className="font-display text-5xl">GO</p>
            <p className="mt-2 text-sm text-muted">ക്രെഡിറ്റ് ബിൽ</p>
          </div>
        </div>
      }
    >
      <GoProvider>
        <Shell />
      </GoProvider>
    </ClientOnly>
  );
}

function ClientOnly({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? children : fallback;
}
