import { useState } from "react";
import { LogOut } from "lucide-react";
import { monthText, useI18n } from "@/lib/go/i18n";
import { billFor, inr, monthKey, orderTotal, passDue, qtyText, shiftMonth, todayISO } from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import { Btn, Field, Money, shortDate, TextInput } from "./ui";

export function CustomerApp() {
  const go = useGo();
  const { lang, t } = useI18n();
  const session = go.session?.kind === "customer" ? go.session : null;
  const shop = go.blobs.find((b) => b.shop.id === session?.shopId) ?? null;
  const customer = shop?.customers.find((c) => c.id === session?.customerId) ?? null;
  const [month, setMonth] = useState(monthKey());
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
  const work = shop.shop.work ?? "order";
  const bill = billFor(customer.id, month, shop.orders, shop.payments);
  const orders = shop.orders.filter((o) => o.customerId === customer.id && o.date.slice(0, 7) === month && o.status !== "cancelled");
  const todayOrders = orders.filter((o) => o.date === todayISO());
  const pass = passDue(customer, shop.extras, shop.payments, month);
  const skips = (shop.skips ?? []).filter((s) => s.customerId === customer.id && s.date.startsWith(month));
  const soFar = month === monthKey(todayISO()) ? Number(todayISO().slice(8, 10)) || 0 : 0;
  const dayDue = (customer.dayRate ?? 0) * Math.max(0, soFar - skips.length);
  const shown = work === "fixed" ? pass.due : work === "daily" ? dayDue : bill.due;
  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-lg overflow-x-hidden md:max-w-xl">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{shop.shop.name}</p>
          <p className="truncate text-xs text-muted">{customer.name}</p>
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => void go.signOut()} aria-label={t.out}>
          <LogOut size={18} />
        </button>
      </header>
      <div className="grid gap-4 px-4 py-4 pb-10">
        <div className="sheet p-4">
          <p className="text-sm text-muted">{work === "fixed" ? t.workFixed : work === "daily" ? t.workDaily : t.workOrder}</p>
          <p className="text-3xl">
            <Money n={shown} tone={shown > 0 ? "due" : "paid"} />
          </p>
          <p className="text-sm text-muted">{monthText(lang, month)}</p>
        </div>

        {work === "order" && (
          <>
            <section className="grid gap-2">
              <h2 className="font-semibold">{t.comingToday}</h2>
              <ul className="sheet divide-y divide-line">
                {todayOrders.map((o) => (
                  <li key={o.id} className="p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span>{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")}</span>
                      <span>{inr(orderTotal(o))}</span>
                    </div>
                  </li>
                ))}
                {todayOrders.length === 0 && <li className="p-3 text-sm text-muted">{t.nothingToday}</li>}
              </ul>
            </section>
            <section className="grid gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t.tookMonth}</h2>
                <span className="flex gap-1">
                  <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>{t.prev}</Btn>
                  <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>{t.next}</Btn>
                </span>
              </div>
              <ul className="sheet divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2 p-3 text-sm">
                    <span>{shortDate(o.date)} · {o.lines.map((l) => l.name).join(", ")}</span>
                    <span>{inr(orderTotal(o))}</span>
                  </li>
                ))}
                {orders.length === 0 && <li className="p-3 text-sm text-muted">{t.noMonth}</li>}
              </ul>
              <p className="text-sm text-muted">{t.paidWord} {inr(bill.collected)}</p>
            </section>
          </>
        )}

        {work === "fixed" && (
          <section className="sheet grid gap-2 p-4 text-sm">
            <Row k={t.feeWord} v={inr(pass.fee)} />
            {(customer.addons ?? []).map((a) => (
              <Row key={a.id} k={a.name} v={inr(a.amount)} />
            ))}
            {(shop.extras ?? []).filter((e) => e.customerId === customer.id && e.date.startsWith(month)).map((e) => (
              <Row key={e.id} k={`${shortDate(e.date)} · ${e.name}`} v={inr(e.amount)} />
            ))}
            <Row k={t.monthTotal} v={inr(pass.total)} />
            <Row k={t.paidWord} v={inr(pass.paid)} />
          </section>
        )}

        {work === "daily" && (
          <section className="sheet grid gap-2 p-4 text-sm">
            <Row k={t.perDay} v={inr(customer.dayRate ?? 0)} />
            <Row k={t.offDays} v={String(skips.length)} />
            <Row k={t.monthTotal} v={inr(dayDue)} />
          </section>
        )}

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void go.changePassword(nextPass).then(() => setNextPass(""));
          }}
        >
          <Field label={t.changePass}>
            <TextInput type="password" value={nextPass} onChange={(e) => setNextPass(e.target.value)} />
          </Field>
          <Btn type="submit" tone="ghost" disabled={go.busy || nextPass.trim().length < 6}>
            {t.save}
          </Btn>
        </form>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate text-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}
