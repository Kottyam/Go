import { useState } from "react";
import { markRead } from "@/lib/go/data";
import { useT } from "@/lib/go/i18n";
import type { Notice } from "@/lib/go/types";
import { Empty, Sheet, when } from "./ui";

export function Bell({ shopId, notices }: { shopId: string; notices: Notice[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const unread = notices.filter((n) => !n.read);
  return (
    <>
      <button aria-label={t("notifications")} className="relative rounded-lg p-2 text-lg" onClick={() => setOpen(true)}>
        🔔
        {unread.length > 0 && (
          <span className="absolute right-0 top-0 min-w-5 rounded-full bg-due px-1 text-center text-[10px] leading-5 text-white">{unread.length}</span>
        )}
      </button>
      {open && (
        <Sheet
          title={t("notifications")}
          onClose={() => {
            setOpen(false);
            unread.forEach((n) => void markRead(shopId, n.id).catch(() => {}));
          }}
        >
          {!notices.length && <Empty>{t("noNotices")}</Empty>}
          <ul className="space-y-2">
            {notices.slice(0, 50).map((n) => (
              <li key={n.id} className={`rounded-xl p-3 text-sm ${n.read ? "bg-gray-50" : "bg-paid-bg"}`}>
                <div>{n.text}</div>
                <div className="mt-1 text-xs text-muted">{when(n.createdAt)}</div>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}
