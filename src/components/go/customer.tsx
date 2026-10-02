import { useState } from "react";
import { ClipboardList, LogOut, Receipt } from "lucide-react";
import { monthText, useI18n } from "@/lib/go/i18n";
import { billFor, inr, monthKey, orderTotal, qtyText, shiftMonth } from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import { OrderPad } from "./order-pad";
import { Btn, Field, Money, shortDate, TextInput } from "./ui";

export function CustomerApp() {
  const go = useGo();
  const { lang, t } = useI18n();
  const session = go.session?.kind === "customer" ? go.session : null;
  const shop = go.blobs.find((b) => b.shop.id === session?.shopId) ?? null;
  const customer = shop?.customers.find((c) => c.id === session?.customerId) ?? null;
  const [tab, setTab] = useState<"order" | "bill">("order");
  const [month, setMonth] = useState(monthKey());
  const [passOpen, setPassOpen] = useState(Boolean(customer?.mustChangePass));
  const [nextPass, setNextPass] = useState("");
  if (!session || !shop || !customer) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p>{t.missingCustomer}</p>
          <Btn className="mt-3" onClick={() => void go.signOut()}>
            {t.back}
          </Btn>
        </div>
      </main>
    );
  }
  if (customer.mustChangePass) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="brand-mark text-3xl text-stamp">{t.brand}</h1>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => void go.signOut()} aria-label={t.out}>
            <LogOut size={18} />
          </button>
        </div>
        <h2 className="font-semibold">{t.changePass}</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void go.changePassword(nextPass);
          }}
        >
          <Field label={t.newPass}>
            <TextInput type="password" value={nextPass} onChange={(e) => setNextPass(e.target.value)} required />
          </Field>
          <Btn type="submit" tone="stamp" disabled={go.busy}>
            {t.save}
          </Btn>
        </form>
      </main>
    );
  }
  const bill = billFor(customer.id, month, shop.orders, shop.payments);
  const orders = shop.orders.filter((o) => o.customerId === customer.id && o.date.slice(0, 7) === month);
  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-lg overflow-x-hidden">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{shop.shop.name}</p>
          <p className="truncate text-xs text-muted">
            {customer.name}
            {go.session?.backend === "demo" ? ` · ${t.demo}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-line"
          onClick={() => void go.signOut()}
          aria-label={t.out}
        >
          <LogOut size={18} />
        </button>
      </header>
      <div className="px-4 py-4 pb-28">
        <div className="sheet mb-4 p-4">
          <p className="text-sm text-muted">{t.due}</p>
          <p className="text-3xl">
            <Money n={bill.due} tone={bill.due > 0 ? "due" : "paid"} />
          </p>
          <p className="text-sm text-muted">{monthText(lang, month)}</p>
        </div>
        <div className="sheet mb-4 p-4">
          <button type="button" className="font-semibold text-stamp" onClick={() => setPassOpen((v) => !v)}>
            {t.changePass}
          </button>
          {passOpen && (
            <form
              className="mt-3 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void go.changePassword(nextPass).then(() => setNextPass(""));
              }}
            >
              {customer.mustChangePass && <p className="text-sm leading-6 text-muted">{t.passSame}</p>}
              <Field label={t.newPass}>
                <TextInput type="password" value={nextPass} onChange={(e) => setNextPass(e.target.value)} required />
              </Field>
              <Btn type="submit" tone="stamp" disabled={go.busy}>
                {t.save}
              </Btn>
            </form>
          )}
        </div>
        {tab === "order" ? (
          <OrderPad lockCustomerId={customer.id} />
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>
                {t.prev}
              </Btn>
              <span className="font-display">{monthText(lang, month)}</span>
              <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>
                {t.next}
              </Btn>
            </div>
            <dl className="sheet grid grid-cols-2 gap-3 p-4 text-sm">
              <div>
                <dt className="text-muted">{t.monthOpen}</dt>
                <dd>{inr(bill.opening)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t.credit}</dt>
                <dd>{inr(bill.sales)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t.paid}</dt>
                <dd>{inr(bill.collected)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t.cash}</dt>
                <dd>{inr(bill.cash)}</dd>
              </div>
            </dl>
            <ul className="sheet divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>
                      {shortDate(o.date)} · {t.st[o.status]}
                    </span>
                    <span>{inr(orderTotal(o))}</span>
                  </div>
                  <p className="text-muted">
                    {o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")} · {o.mode === "credit" ? t.credit : t.cash}
                  </p>
                </li>
              ))}
              {orders.length === 0 && <li className="p-3 text-sm text-muted">{t.noMonth}</li>}
            </ul>
            {shop.shop.upi && (
              <p className="text-sm text-muted">
                {t.payUpi} {shop.shop.upi}
              </p>
            )}
          </div>
        )}
      </div>
      <nav className="dock fixed inset-x-0 bottom-0 border-t border-line bg-card">
        <ul className="mx-auto grid max-w-lg grid-cols-2">
          <li>
            <button
              type="button"
              className={`flex min-h-14 w-full flex-col items-center justify-center text-xs ${tab === "order" ? "text-stamp" : "text-muted"}`}
              onClick={() => setTab("order")}
            >
              <ClipboardList size={18} /> {t.order}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`flex min-h-14 w-full flex-col items-center justify-center text-xs ${tab === "bill" ? "text-stamp" : "text-muted"}`}
              onClick={() => setTab("bill")}
            >
              <Receipt size={18} /> {t.bills}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
