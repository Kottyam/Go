import { useState } from "react";
import { ClipboardList, LogOut, Receipt } from "lucide-react";
import { billFor, inr, monthKey, monthLabel, orderTotal, qtyText, shiftMonth, statusLabel } from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import { OrderPad } from "./order-pad";
import { Btn, Money, shortDate } from "./ui";

export function CustomerApp() {
  const go = useGo();
  const session = go.session?.kind === "customer" ? go.session : null;
  const shop = go.blobs.find((b) => b.shop.id === session?.shopId) ?? null;
  const customer = shop?.customers.find((c) => c.id === session?.customerId) ?? null;
  const [tab, setTab] = useState<"order" | "bill">("order");
  const [month, setMonth] = useState(monthKey());
  if (!session || !shop || !customer) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p>കസ്റ്റമർ കണ്ടില്ല.</p>
          <Btn className="mt-3" onClick={() => void go.signOut()}>തുടക്കത്തിലേക്ക്</Btn>
        </div>
      </main>
    );
  }
  const bill = billFor(customer.id, month, shop.orders, shop.payments);
  const orders = shop.orders.filter((o) => o.customerId === customer.id && o.date.slice(0, 7) === month);
  return (
    <div className="mx-auto min-h-screen w-full max-w-lg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{shop.shop.name}</p>
          <p className="truncate text-xs text-muted">{customer.name}{go.session?.backend === "demo" ? " · ഡെമോ" : ""}</p>
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => void go.signOut()} aria-label="പുറത്ത്">
          <LogOut size={18} />
        </button>
      </header>
      <div className="px-4 py-4 pb-28">
        <div className="sheet mb-4 p-4">
          <p className="text-sm text-muted">ബാക്കി കടം</p>
          <p className="text-3xl"><Money n={bill.due} tone={bill.due > 0 ? "due" : "paid"} /></p>
          <p className="text-sm text-muted">{monthLabel(month)}</p>
        </div>
        {tab === "order" ? (
          <OrderPad lockCustomerId={customer.id} />
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>മുമ്പ്</Btn>
              <span className="font-display">{monthLabel(month)}</span>
              <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>അടുത്തത്</Btn>
            </div>
            <dl className="sheet grid grid-cols-2 gap-3 p-4 text-sm">
              <div><dt className="text-muted">തുടക്കം</dt><dd>{inr(bill.opening)}</dd></div>
              <div><dt className="text-muted">ക്രെഡിറ്റ്</dt><dd>{inr(bill.sales)}</dd></div>
              <div><dt className="text-muted">അടച്ചത്</dt><dd>{inr(bill.collected)}</dd></div>
              <div><dt className="text-muted">ക്യാഷ്</dt><dd>{inr(bill.cash)}</dd></div>
            </dl>
            <ul className="sheet divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{shortDate(o.date)} · {statusLabel(o.status)}</span>
                    <span>{inr(orderTotal(o))}</span>
                  </div>
                  <p className="text-muted">{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")} · {o.mode === "credit" ? "ക്രെഡിറ്റ്" : "ക്യാഷ്"}</p>
                </li>
              ))}
              {orders.length === 0 && <li className="p-3 text-sm text-muted">ഈ മാസം ഓർഡർ ഇല്ല.</li>}
            </ul>
            {shop.shop.upi && <p className="text-sm text-muted">അടയ്ക്കാൻ UPI: {shop.shop.upi}</p>}
          </div>
        )}
      </div>
      <nav className="dock fixed inset-x-0 bottom-0 border-t border-line bg-card">
        <ul className="mx-auto grid max-w-lg grid-cols-2">
          <li>
            <button type="button" className={`flex min-h-14 w-full flex-col items-center justify-center text-xs ${tab === "order" ? "text-stamp" : "text-muted"}`} onClick={() => setTab("order")}>
              <ClipboardList size={18} /> ഓർഡർ
            </button>
          </li>
          <li>
            <button type="button" className={`flex min-h-14 w-full flex-col items-center justify-center text-xs ${tab === "bill" ? "text-stamp" : "text-muted"}`} onClick={() => setTab("bill")}>
              <Receipt size={18} /> മാസബിൽ
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
