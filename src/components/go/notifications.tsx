import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { useGo } from "@/lib/go/store";

export function NotificationBell() {
  const go = useGo();
  const [open, setOpen] = useState(false);
  const unread = go.notifications.filter((n) => !n.read).length;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-card"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) go.markNotificationsRead();
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-due px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold">Notifications</p>
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-2 text-xs"
              onClick={() => go.markNotificationsRead()}
            >
              <Check size={13} /> Read all
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {go.notifications.length === 0 && (
              <li className="p-3 text-sm text-muted">No new activity.</li>
            )}
            {go.notifications.slice(0, 12).map((n) => (
              <li key={n.id} className="border-t border-line py-2 first:border-t-0">
                <p className={n.read ? "text-sm" : "text-sm font-semibold"}>{n.message}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {new Date(n.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
