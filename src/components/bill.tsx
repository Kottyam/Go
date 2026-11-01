import { useState } from "react";
import { billFor, inr, monthKey, shiftMonth, whatsappUrl } from "@/lib/go/logic";
import { useT } from "@/lib/go/i18n";
import type { Order, Payment, Shop } from "@/lib/go/types";
import { Card } from "./ui";

export function Bill({
  customerId,
  name,
  phone,
  shop,
  orders,
  payments,
}: {
  customerId: string;
  name: string;
  phone?: string;
  shop: Shop;
  orders: Order[];
  payments: Payment[];
}) {
  const { t } = useT();
  const [month, setMonth] = useState(monthKey(Date.now()));
  const b = billFor(customerId, month, orders, payments);
  const label = new Date(month + "-01T00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const text = [
    `${shop.name} — ${label}`,
    `${name}`,
    `Opening due: ${inr(b.opening)}`,
    `Purchases: ${inr(b.sales)}`,
    `Paid: ${inr(b.paid)}`,
    `Closing due: ${inr(b.closing)}`,
    shop.upi ? `Pay by UPI: ${shop.upi}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{t("monthlyBill")}</h3>
        <div className="flex items-center gap-1 text-sm">
          <button aria-label="previous month" className="rounded px-2" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            ‹
          </button>
          <span>{label}</span>
          <button aria-label="next month" className="rounded px-2" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            ›
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-1 text-sm">
        <dt className="text-muted">{t("opening")}</dt>
        <dd className="text-right">{inr(b.opening)}</dd>
        <dt className="text-muted">{t("sales")}</dt>
        <dd className="text-right">{inr(b.sales)}</dd>
        <dt className="text-muted">{t("paid")}</dt>
        <dd className="text-right">{inr(b.paid)}</dd>
        <dt className="font-bold">{t("closing")}</dt>
        <dd className="text-right font-bold">{inr(b.closing)}</dd>
      </dl>
      {phone && (
        <a className="block text-center text-sm font-semibold text-stamp underline" href={whatsappUrl(phone, text)} target="_blank" rel="noreferrer">
          {t("shareBill")}
        </a>
      )}
    </Card>
  );
}
