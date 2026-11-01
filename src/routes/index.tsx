import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { App } from "@/components/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on)
    return (
      <div className="grid min-h-dvh place-items-center bg-paper text-ink">
        <p className="font-display text-4xl text-stamp">Go Service</p>
      </div>
    );
  return <App />;
}
