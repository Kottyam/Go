import { useMemo, useState } from "react";
import type { Item, OrderLine } from "@/lib/go/types";
import { inr, linesTotal } from "@/lib/go/logic";
import { useT } from "@/lib/go/i18n";
import { Button, Empty, Field } from "./ui";

export function OrderPad({
  items,
  allowCustom,
  busy,
  onSubmit,
}: {
  items: Item[];
  allowCustom?: boolean;
  busy?: boolean;
  onSubmit: (lines: OrderLine[], note: string) => void;
}) {
  const { t } = useT();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const list = items.filter((i) => i.active).sort((a, b) => a.name.localeCompare(b.name));
  const shown = q ? list.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())) : list;
  const lines = useMemo(() => {
    const out: OrderLine[] = list
      .filter((i) => (qty[i.id] ?? 0) > 0)
      .map((i) => ({ itemId: i.id, name: i.name, unit: i.unit, qty: qty[i.id], price: i.price }));
    const c = Number(custom);
    if (allowCustom && c > 0) out.push({ itemId: "custom", name: note || "Other", unit: "", qty: 1, price: c });
    return out;
  }, [list, qty, custom, allowCustom, note]);
  const total = linesTotal(lines);
  const bump = (id: string, d: number) => setQty((s) => ({ ...s, [id]: Math.max(0, Math.round(((s[id] ?? 0) + d) * 100) / 100) }));

  return (
    <div className="space-y-3">
      {list.length > 8 && <Field label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />}
      {!list.length && !allowCustom && <Empty>{t("noItems")}</Empty>}
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {shown.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{i.name}</div>
              <div className="text-xs text-muted">
                {inr(i.price)}
                {i.unit && ` / ${i.unit}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label={`less ${i.name}`} className="size-10 rounded-full bg-paid-bg text-xl font-bold text-paid" onClick={() => bump(i.id, -1)}>
                −
              </button>
              <input
                aria-label={`${t("qty")} ${i.name}`}
                inputMode="decimal"
                className="h-10 w-12 rounded-lg border border-line text-center"
                value={qty[i.id] ?? 0}
                onChange={(e) => setQty((s) => ({ ...s, [i.id]: Math.max(0, Number(e.target.value) || 0) }))}
              />
              <button aria-label={`more ${i.name}`} className="size-10 rounded-full bg-stamp text-xl font-bold text-white" onClick={() => bump(i.id, 1)}>
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
      {allowCustom && <Field label={`${t("amount")} (other)`} inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      <Field label={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button className="w-full" disabled={busy || total <= 0} onClick={() => onSubmit(lines, note)}>
        {t("placeOrder")} · {inr(total)}
      </Button>
    </div>
  );
}
