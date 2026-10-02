import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useI18n } from "@/lib/go/i18n";
import { qtyText, todayISO } from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import type { Order, PayMode } from "@/lib/go/types";
import { Btn, Field, Money, Select, TextInput } from "./ui";

export function OrderPad({
  lockCustomerId,
  onDone,
}: {
  lockCustomerId?: string;
  onDone?: () => void;
}) {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const [customerId, setCustomerId] = useState(lockCustomerId ?? shop?.customers[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<PayMode>("credit");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const items = useMemo(() => shop?.items.filter((i) => i.active) ?? [], [shop]);

  if (!shop) return null;
  const customer = shop.customers.find((c) => c.id === (lockCustomerId || customerId));
  const lines = items
    .filter((it) => (qty[it.id] ?? 0) > 0)
    .map((it) => ({
      itemId: it.id,
      name: it.name,
      unit: it.unit,
      qty: qty[it.id] ?? 0,
      price: it.price,
    }));
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  function setQ(id: string, next: number) {
    const n = Math.max(0, Math.round(next * 100) / 100);
    setQty((q) => ({ ...q, [id]: n }));
  }

  async function submit() {
    if (!customer) return;
    const order: Order = {
      id: crypto.randomUUID(),
      shopId: shop!.shop.id,
      customerId: customer.id,
      customerName: customer.name,
      date,
      lines,
      mode,
      status: "pending",
      note: note.trim(),
    };
    await go.placeOrder(shop!.shop.id, order);
    setQty({});
    setNote("");
    onDone?.();
  }

  return (
    <div className="sheet p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.newOrder}</h2>
        <Money n={total} tone={mode === "credit" ? "due" : "paid"} />
      </div>
      <div className="grid gap-3">
        {lockCustomerId ? (
          <p className="text-sm text-muted">{customer?.name}</p>
        ) : (
          <Field label={t.customer}>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {shop.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.route}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!lockCustomerId && (
          <Field label={t.date}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Btn type="button" tone={mode === "credit" ? "stamp" : "ghost"} onClick={() => setMode("credit")}>
            {t.credit}
          </Btn>
          <Btn type="button" tone={mode === "cash" ? "paid" : "ghost"} onClick={() => setMode("cash")}>
            {t.cash}
          </Btn>
        </div>
        <ul className="divide-y divide-line">
          {items.map((it) => {
            const q = qty[it.id] ?? 0;
            return (
              <li key={it.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.name}</p>
                  <p className="text-sm text-muted">
                    <Money n={it.price} /> / {it.unit}
                    <span className="ml-2">
                      {t.stockWord} {qtyText(it.stock)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full border border-line"
                    onClick={() => setQ(it.id, q - 1)}
                    aria-label={t.less}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    inputMode="decimal"
                    value={q === 0 ? "" : String(q)}
                    placeholder="0"
                    onChange={(e) => setQ(it.id, Number(e.target.value || 0))}
                    className="field w-14 px-1 text-center"
                    aria-label={it.name}
                  />
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-full border border-line"
                    onClick={() => setQ(it.id, q + 1)}
                    aria-label={t.moreQty}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && <p className="text-sm text-muted">{t.addItems}</p>}
        <Field label={t.note}>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </Field>
        <Btn type="button" tone="gold" disabled={!customer || lines.length === 0 || go.busy} onClick={() => void submit()}>
          {t.saveOrder}
        </Btn>
      </div>
    </div>
  );
}
