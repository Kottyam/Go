import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Package,
  Plus,
  Printer,
  Receipt,
  Settings,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { monthText, serviceText, LangSelect, useI18n, type Copy } from "@/lib/go/i18n";
import {
  balance,
  billFor,
  inr,
  monthKey,
  orderTotal,
  passDue,
  qtyText,
  SERVICES,
  shiftMonth,
  todayISO,
  memberUser,
  upiPayUrl,
  whatsappBillUrl,
} from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import type { Customer, Item, OrderStatus, PayMethod, ShopKind, WorkMode } from "@/lib/go/types";
import { NotificationBell } from "./notifications";
import { OrderPad } from "./order-pad";
import { Btn, Field, Money, Select, TextInput, shortDate } from "./ui";

type View = "home" | "orders" | "bills" | "routes" | "more" | "people" | "items" | "sales" | "financial" | "shops" | "settings" | "passes" | "round";

function dockLabel(t: Copy, id: View) {
  if (id === "home") return t.home;
  if (id === "orders") return t.workOrder;
  if (id === "passes") return t.workFixed;
  if (id === "round") return t.workDaily;
  if (id === "bills") return t.bills;
  if (id === "routes") return t.routes;
  if (id === "people") return t.customers;
  if (id === "items") return t.items;
  if (id === "financial") return "Financial PDF";
  return t.more;
}

function payText(t: Copy, method: PayMethod) {
  if (method === "cash") return t.cash;
  if (method === "upi") return "UPI";
  return t.bank;
}

export function OwnerApp() {
  const go = useGo();
  const { lang, t } = useI18n();
  const shop = go.active;
  const work: WorkMode = shop?.shop.work ?? "order";
  const door: View = work === "fixed" ? "passes" : work === "daily" ? "round" : "orders";
  const [view, setView] = useState<View>(door);
  const [compose, setCompose] = useState(false);
  useEffect(() => {
    setView(door);
  }, [shop?.shop.id, door]);
  const dock = useMemo(() => {
    if (work === "fixed") {
      return [
        { id: "passes" as View, icon: Receipt },
        { id: "people" as View, icon: Users },
        { id: "more" as View, icon: Settings },
      ];
    }
    if (work === "daily") {
      return [
        { id: "round" as View, icon: Truck },
        { id: "people" as View, icon: Users },
        { id: "more" as View, icon: Settings },
      ];
    }
    return [
      { id: "orders" as View, icon: ClipboardList },
      { id: "people" as View, icon: Users },
      { id: "items" as View, icon: Package },
      { id: "more" as View, icon: Settings },
    ];
  }, [work]);
  const moreOn = view === "more" || view === "settings" || view === "shops" || view === "sales" || view === "financial";

  if (go.blobs.length === 0) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="brand-mark text-3xl leading-tight text-stamp">{t.brand}</p>
          </div>
          <NotificationBell />
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-line"
            onClick={() => void go.signOut()}
            aria-label={t.out}
          >
            <LogOut size={18} />
          </button>
        </div>
        <h2 className="font-semibold">{t.createService}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{t.createLead}</p>
        <div className="mt-4">
          <ServiceForm submitLabel={t.createBtn} onSubmit={(input) => void go.addShop(input)} />
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-5xl overflow-x-hidden md:grid md:grid-cols-[13rem_1fr]">
      <aside className="no-print hidden border-r border-line p-4 md:block">
        <p className="brand-mark text-3xl leading-none text-stamp">{t.brand}</p>
        <p className="mb-4 text-xs text-muted">{t.owner}</p>
        <nav className="grid gap-1">
          {dock.filter((d) => d.id !== "more").map((d) => (
            <NavBtn key={d.id} active={view === d.id} label={dockLabel(t, d.id)} onClick={() => setView(d.id)} />
          ))}
          <NavBtn active={view === "sales"} label={t.sales} onClick={() => setView("sales")} />
          <NavBtn active={view === "financial"} label="Financial PDF" onClick={() => setView("financial")} />
          <NavBtn active={view === "shops"} label={t.shops} onClick={() => setView("shops")} />
          <NavBtn active={view === "settings"} label={t.settings} onClick={() => setView("settings")} />
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line bg-paper px-3 py-2">
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate font-semibold">{shop?.shop.name ?? t.noShop}</p>
            <p className="truncate text-xs text-muted">{shop ? serviceText(lang, shop.shop) : t.pickService}</p>
          </div>
          <div className="min-w-0 max-w-[7.5rem]"><LangSelect /></div>
          {go.blobs.length > 1 && (
            <select
              className="field w-24 min-w-0 max-w-24"
              value={shop?.shop.id ?? ""}
              onChange={(e) => go.setActiveShop(e.target.value)}
              aria-label={t.shop}
            >
              {go.blobs.map((b) => (
                <option key={b.shop.id} value={b.shop.id}>
                  {b.shop.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-line"
            onClick={() => void go.signOut()}
            aria-label={t.out}
          >
            <LogOut size={18} />
          </button>
        </header>
        <div className="px-4 py-4 mobile-content-bottom md:pb-8">
          {view === "home" && (
            <HomeView
              onOrder={() => {
                setCompose(true);
                setView("orders");
              }}
              onBills={() => setView("bills")}
              onRoutes={() => setView("routes")}
            />
          )}
          {view === "orders" && <OrdersView compose={compose} setCompose={setCompose} />}
          {view === "passes" && <PassView />}
          {view === "round" && <RoundView />}
          {view === "bills" && <BillsView />}
          {view === "routes" && <RoutesView />}
          {view === "more" && <MoreView onPick={(id) => setView(id)} />}
          {view === "people" && <PeopleView />}
          {view === "items" && <ItemsView />}
          {view === "sales" && <SalesView />}
          {view === "financial" && <FinancialReportView />}
          {view === "shops" && <ShopsView />}
          {view === "settings" && <SettingsView />}
        </div>
        <nav className="dock no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden">
          <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${dock.length}, minmax(0, 1fr))` }}>
            {dock.map((d) => {
              const Icon = d.icon;
              const on = d.id === "more" ? moreOn : view === d.id;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center text-[10px] leading-tight break-words whitespace-normal ${on ? "text-stamp" : "text-muted"}`}
                    onClick={() => setView(d.id === "more" ? "more" : d.id)}
                  >
                    <Icon size={18} />
                    {dockLabel(t, d.id)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function NavBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-3 text-left text-sm ${active ? "bg-ink text-paper" : "text-ink"}`}
    >
      {label}
    </button>
  );
}

function HomeView({ onOrder, onBills, onRoutes }: { onOrder: () => void; onBills: () => void; onRoutes: () => void }) {
  const go = useGo();
  const { lang, t } = useI18n();
  const shop = go.active;
  if (!shop) return <ShopsView />;
  const today = todayISO();
  const month = monthKey(today);
  const due = shop.customers.reduce((s, c) => s + balance(c.id, shop.orders, shop.payments), 0);
  const todayOrders = shop.orders.filter((o) => o.date === today && o.status !== "cancelled");
  const pending = todayOrders.filter((o) => o.status !== "delivered");
  const low = shop.items.filter((i) => i.active && i.stock <= 8);
  const collected = shop.payments.filter((p) => p.date.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0);
  return (
    <div className="grid gap-4">
      <section className="sheet p-4">
        <p className="text-2xl font-semibold leading-tight">{shop.shop.name}</p>
        <p className="mt-1 text-sm text-stamp">{serviceText(lang, shop.shop)}</p>
        <p className="mt-4 text-sm text-muted">{t.yourCode}</p>
        <p className="font-display text-3xl tracking-wide text-stamp">{shop.shop.code}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{t.codeHelp}</p>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBills} className="sheet p-4 text-left">
          <p className="text-sm text-muted">{t.due}</p>
          <p className="mt-1 text-2xl">
            <Money n={due} tone="due" />
          </p>
        </button>
        <button type="button" onClick={onRoutes} className="sheet p-4 text-left">
          <p className="text-sm text-muted">{t.todayOrders}</p>
          <p className="mt-1 font-display text-2xl">{todayOrders.length}</p>
          <p className="text-xs text-muted">
            {pending.length} {t.notYet}
          </p>
        </button>
      </div>
      <div className="sheet flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted">
            {monthText(lang, month)} {t.monthCollection}
          </p>
          <p className="text-xl">
            <Money n={collected} tone="paid" />
          </p>
        </div>
        <Btn tone="gold" onClick={onOrder}>
          <Plus size={14} /> {t.order}
        </Btn>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">{t.todayGo}</h2>
        <ul className="sheet divide-y divide-line">
          {pending.length === 0 && <li className="p-4 text-sm text-muted">{t.noToday}</li>}
          {pending.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.customerName}</p>
                <p className="truncate text-sm text-muted">{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")}</p>
              </div>
              <span className="text-sm">{t.st[o.status]}</span>
            </li>
          ))}
        </ul>
      </section>
      {low.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">{t.lowStock}</h2>
          <ul className="flex flex-wrap gap-2">
            {low.map((i) => (
              <li key={i.id} className="rounded-full bg-due-bg px-3 py-1 text-sm text-due">
                {i.name} · {qtyText(i.stock)} {i.unit}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OrdersView({ compose, setCompose }: { compose: boolean; setCompose: (v: boolean) => void }) {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const [day, setDay] = useState(todayISO());
  const [filter, setFilter] = useState<"open" | "all">("open");
  if (!shop) return <p className="text-sm text-muted">{t.pickShop}</p>;
  const rows = shop.orders.filter((o) => {
    if (o.date !== day) return false;
    if (filter === "open" && (o.status === "delivered" || o.status === "cancelled")) return false;
    return true;
  });
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t.workOrder}</h2>
        <p className="text-sm text-muted">{t.workOrderHint}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t.date}>
          <TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Btn tone={filter === "open" ? "ink" : "ghost"} onClick={() => setFilter("open")}>
          {t.openOnes}
        </Btn>
        <Btn tone={filter === "all" ? "ink" : "ghost"} onClick={() => setFilter("all")}>
          {t.all}
        </Btn>
        <Btn tone="gold" onClick={() => setCompose(!compose)}>
          {compose ? t.close : t.newOrder}
        </Btn>
      </div>
      {compose && <OrderPad onDone={() => setCompose(false)} />}
      <ul className="grid gap-3">
        {rows.length === 0 && <li className="text-sm text-muted">{t.noDayOrders}</li>}
        {rows.map((o) => (
          <li key={o.id} className="sheet p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{o.customerName}</p>
                <p className="text-sm text-muted">
                  {o.mode === "credit" ? t.credit : t.cash} · {t.st[o.status]}
                </p>
              </div>
              <Money n={orderTotal(o)} tone={o.mode === "credit" ? "due" : "paid"} />
            </div>
            <p className="mt-2 text-sm">{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}${l.unit} × ${inr(l.price)}`).join(" · ")}</p>
            {o.note && <p className="mt-1 text-sm text-muted">{o.note}</p>}
            {o.status !== "cancelled" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(["packed", "out", "delivered"] as OrderStatus[]).map((s) => (
                  <Btn key={s} tone={o.status === s ? "ink" : "ghost"} onClick={() => void go.setStatus(shop.shop.id, o.id, s)}>
                    {t.st[s]}
                  </Btn>
                ))}
                <Btn tone="ghost" onClick={() => void go.setStatus(shop.shop.id, o.id, "cancelled")}>
                  {t.cancel}
                </Btn>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PassView() {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  if (!shop) return null;
  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-xl font-semibold">{t.workFixed}</h2>
        <p className="text-sm text-muted">{t.workFixedHint}</p>
      </div>
      {shop.customers.length === 0 && <p className="text-sm text-muted">{t.noPeople}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {shop.customers.map((c) => (
          <PassCard key={c.id} customer={c} />
        ))}
      </div>
    </div>
  );
}

function PassCard({ customer }: { customer: Customer }) {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const month = monthKey(todayISO());
  const [addonName, setAddonName] = useState("");
  const [addonAmt, setAddonAmt] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraAmt, setExtraAmt] = useState("");
  if (!shop) return null;
  const due = passDue(customer, shop.extras, shop.payments, month);
  const todayExtras = (shop.extras ?? []).filter((e) => e.customerId === customer.id && e.date.startsWith(month));
  const done = due.total > 0 && due.due === 0;
  return (
    <div className="sheet grid gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-semibold">{customer.name}</p>
        <p className="text-lg">{inr(due.due)}</p>
      </div>
      <Field label={t.feeWord}>
        <TextInput
          inputMode="decimal"
          defaultValue={due.fee ? String(due.fee) : ""}
          onBlur={(e) => {
            const n = Number(e.target.value) || 0;
            if (n === due.fee) return;
            void go.saveCustomer(shop.shop.id, { ...customer, passAmount: n });
          }}
        />
      </Field>
      <div className="grid gap-2">
        <p className="text-sm text-muted">{t.addon}</p>
        {(customer.addons ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{a.name}</span>
            <span className="flex items-center gap-2">
              {inr(a.amount)}
              <button
                type="button"
                className="text-muted"
                onClick={() => void go.saveCustomer(shop.shop.id, { ...customer, addons: (customer.addons ?? []).filter((x) => x.id !== a.id) })}
              >
                {t.cancel}
              </button>
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_5.5rem_auto] gap-2">
          <TextInput value={addonName} placeholder={t.addonPh} onChange={(e) => setAddonName(e.target.value)} />
          <TextInput inputMode="decimal" value={addonAmt} placeholder="0" onChange={(e) => setAddonAmt(e.target.value)} />
          <Btn
            type="button"
            tone="ghost"
            onClick={() => {
              const amount = Number(addonAmt) || 0;
              if (!addonName.trim() || amount <= 0) return;
              void go.saveCustomer(shop.shop.id, {
                ...customer,
                addons: [...(customer.addons ?? []), { id: crypto.randomUUID(), name: addonName.trim(), amount }],
              });
              setAddonName("");
              setAddonAmt("");
            }}
          >
            {t.addWord}
          </Btn>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm text-muted">{t.todayExtra}</p>
        {todayExtras.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              {shortDate(e.date)} · {e.name}
            </span>
            <span className="flex items-center gap-2">
              {inr(e.amount)}
              <button type="button" className="text-muted" onClick={() => void go.dropExtra(shop.shop.id, e.id)}>
                {t.cancel}
              </button>
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_5.5rem_auto] gap-2">
          <TextInput value={extraName} placeholder={t.extraPh} onChange={(e) => setExtraName(e.target.value)} />
          <TextInput inputMode="decimal" value={extraAmt} placeholder="0" onChange={(e) => setExtraAmt(e.target.value)} />
          <Btn
            type="button"
            tone="ghost"
            onClick={() => {
              const amount = Number(extraAmt) || 0;
              if (!extraName.trim() || amount <= 0) return;
              void go.addExtra(shop.shop.id, {
                id: crypto.randomUUID(),
                customerId: customer.id,
                date: todayISO(),
                name: extraName.trim(),
                amount,
              });
              setExtraName("");
              setExtraAmt("");
            }}
          >
            {t.addWord}
          </Btn>
        </div>
      </div>
      <p className="text-sm text-muted">
        {t.monthTotal} {inr(due.total)} · {t.paidWord} {inr(due.paid)}
      </p>
      <Btn
        tone={done ? "ghost" : "stamp"}
        disabled={done || due.due <= 0 || go.busy}
        onClick={() =>
          void go.collect(shop.shop.id, {
            id: crypto.randomUUID(),
            shopId: shop.shop.id,
            customerId: customer.id,
            customerName: customer.name,
            date: todayISO(),
            amount: due.due,
            method: "cash",
            note: t.workFixed,
          })
        }
      >
        {done ? t.paidWord : t.markPaid}
      </Btn>
    </div>
  );
}

function RoundView() {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const today = todayISO();
  const month = monthKey(today);
  const soFar = Number(today.slice(8, 10)) || 0;
  if (!shop) return null;
  const skips = shop.skips ?? [];
  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-xl font-semibold">{t.workDaily}</h2>
        <p className="text-sm text-muted">{t.workDailyHint}</p>
      </div>
      {shop.customers.length === 0 && <p className="text-sm text-muted">{t.noPeople}</p>}
      <div className="grid gap-3 md:grid-cols-2">
      {shop.customers.map((c) => {
        const off = skips.filter((s) => s.customerId === c.id && s.date.startsWith(month)).length;
        const away = skips.some((s) => s.customerId === c.id && s.date === today);
        const rate = c.dayRate ?? 0;
        const due = rate * Math.max(0, soFar - off);
        return (
          <div key={c.id} className="sheet grid gap-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="text-sm">{inr(due)}</p>
            </div>
            <Field label={t.perDay}>
              <TextInput
                inputMode="decimal"
                defaultValue={rate ? String(rate) : ""}
                onBlur={(e) => {
                  const n = Number(e.target.value) || 0;
                  if (n === rate) return;
                  void go.saveCustomer(shop.shop.id, { ...c, dayRate: n });
                }}
              />
            </Field>
            <p className="text-sm text-muted">
              {t.offDays}: {off}
            </p>
            <Btn tone={away ? "ink" : "stamp"} disabled={go.busy} onClick={() => void go.toggleSkip(shop.shop.id, c.id, today)}>
              {away ? t.comingWord : t.notToday}
            </Btn>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function BillsView() {
  const go = useGo();
  const { lang, t } = useI18n();
  const shop = go.active;
  const [month, setMonth] = useState(monthKey());
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [note, setNote] = useState("");
  if (!shop) return null;
  const book = shop;
  const rows = shop.customers
    .map((c) => ({ c, bill: billFor(c.id, month, shop.orders, shop.payments) }))
    .sort((a, b) => b.bill.due - a.bill.due);
  const open = rows.find((r) => r.c.id === openId);
  const totalDue = rows.reduce((s, r) => s + r.bill.due, 0);

  async function collect() {
    if (!open) return;
    await go.collect(book.shop.id, {
      id: crypto.randomUUID(),
      shopId: book.shop.id,
      customerId: open.c.id,
      customerName: open.c.name,
      date: todayISO(),
      amount: Number(amount),
      method,
      note: note.trim(),
    });
    setAmount("");
    setNote("");
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>
          {t.prev}
        </Btn>
        <h2 className="font-display text-xl">{monthText(lang, month)}</h2>
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>
          {t.next}
        </Btn>
      </div>
      <p className="text-sm text-muted">
        {t.monthDue} <Money n={totalDue} tone="due" />. {t.creditOnly}
      </p>
      <ul className="grid gap-2">
        {rows.map(({ c, bill }) => (
          <li key={c.id}>
            <button
              type="button"
              className="sheet flex w-full items-center justify-between gap-3 p-3 text-left"
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
            >
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="text-sm text-muted">
                  {c.route || t.noRoute} · {t.bought} {inr(bill.sales)}
                </span>
              </span>
              <Money n={bill.due} tone={bill.due > 0 ? "due" : "paid"} />
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <article className="print-sheet sheet p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{shop.shop.name}</p>
              <h3 className="font-display text-2xl">{open.c.name}</h3>
              <p className="text-sm text-muted">
                {monthText(lang, month)} · {open.c.phone}
              </p>
            </div>
            <button
              type="button"
              className="no-print grid h-11 w-11 place-items-center rounded-full border border-line"
              onClick={() => window.print()}
              aria-label={t.print}
            >
              <Printer size={18} />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t.opening}</dt>
              <dd>
                <Money n={open.bill.opening} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.creditBuy}</dt>
              <dd>
                <Money n={open.bill.sales} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.collected}</dt>
              <dd>
                <Money n={open.bill.collected} tone="paid" />
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.dueNow}</dt>
              <dd>
                <Money n={open.bill.due} tone="due" />
              </dd>
            </div>
          </dl>
          {open.bill.cash > 0 && (
            <p className="mt-2 text-sm text-muted">
              {t.cash} {inr(open.bill.cash)}. {t.cashAside}
            </p>
          )}
          <ul className="mt-3 divide-y divide-line text-sm">
            {shop.orders
              .filter((o) => o.customerId === open.c.id && o.date.slice(0, 7) === month && o.status !== "cancelled")
              .map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2">
                  <span>
                    {shortDate(o.date)} · {o.lines.map((l) => l.name).join(", ")} · {o.mode === "cash" ? t.cash : t.credit}
                  </span>
                  <span>{inr(orderTotal(o))}</span>
                </li>
              ))}
          </ul>
          <div className="mt-3 grid gap-2 text-sm">
            {shop.shop.upi && <p>UPI: {shop.shop.upi}</p>}
            <div className="no-print flex flex-wrap gap-2">
              {shop.shop.upi && (
                <>
                  <Btn tone="stamp" onClick={() => { const url = upiPayUrl(shop.shop.upi, shop.shop.name, open.bill.due, `Bill ${month}`); if (url) window.location.href = url; }} disabled={open.bill.due <= 0}>
                    Pay via UPI
                  </Btn>
                  <Btn tone="ghost" onClick={() => void navigator.clipboard?.writeText(shop.shop.upi)}>Copy UPI ID</Btn>
                </>
              )}
              <Btn tone="ghost" onClick={() => {
                const message = `Hello ${open.c.name}, your ${monthText(lang, month)} bill from ${shop.shop.name} is ${inr(open.bill.sales)}. Paid ${inr(open.bill.collected)}. Balance ${inr(open.bill.due)}.${shop.shop.upi ? ` UPI: ${shop.shop.upi}` : ""}`;
                window.open(whatsappBillUrl(open.c.phone, message), "_blank", "noopener,noreferrer");
              }}>Send Bill on WhatsApp</Btn>
            </div>
          </div>
          <div className="no-print mt-4 grid gap-2 border-t border-line pt-4">
            <h4 className="font-semibold">{t.recordPay}</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.amount}>
                <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </Field>
              <Field label={t.via}>
                <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                  <option value="cash">{t.cash}</option>
                  <option value="upi">UPI</option>
                  <option value="bank">{t.bank}</option>
                </Select>
              </Field>
            </div>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} />
            <Btn tone="paid" disabled={go.busy} onClick={() => void collect()}>
              {t.savePay}
            </Btn>
          </div>
        </article>
      )}
    </div>
  );
}

function RoutesView() {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const [day, setDay] = useState(todayISO());
  const groups = useMemo(() => {
    if (!shop) return [];
    const orders = shop.orders.filter((o) => o.date === day && o.status !== "cancelled");
    const map = new Map<string, typeof orders>();
    for (const o of orders) {
      const customer = shop.customers.find((c) => c.id === o.customerId);
      const route = customer?.route || t.noRoute;
      map.set(route, [...(map.get(route) ?? []), o]);
    }
    return [...map.entries()];
  }, [shop, day, t.noRoute]);
  if (!shop) return null;
  return (
    <div className="grid gap-4">
      <Field label={t.deliveryDay}>
        <TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </Field>
      {groups.length === 0 && <p className="text-sm text-muted">{t.noRouteDay}</p>}
      {groups.map(([route, orders]) => (
        <section key={route}>
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Truck size={16} /> {route}
          </h2>
          <ul className="grid gap-2">
            {orders.map((o) => (
              <li key={o.id} className="sheet p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-sm text-muted">{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")}</p>
                  </div>
                  <span className="text-sm">{t.st[o.status]}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Btn tone="ghost" onClick={() => void go.setStatus(shop.shop.id, o.id, "out")}>
                    {t.onWay}
                  </Btn>
                  <Btn tone="paid" onClick={() => void go.setStatus(shop.shop.id, o.id, "delivered")}>
                    {t.arrived}
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MoreView({ onPick }: { onPick: (id: View) => void }) {
  const { t } = useI18n();
  const items: Array<{ id: View; label: string; hint: string; icon: typeof Users }> = [
    { id: "people", label: t.customers, hint: t.peopleHint, icon: Users },
    { id: "items", label: t.items, hint: t.itemsHint, icon: Package },
    { id: "sales", label: t.sales, hint: t.salesHint, icon: BarChart3 },
    { id: "shops", label: t.shops, hint: t.shopsHint, icon: Store },
    { id: "settings", label: t.settings, hint: t.settingsHint, icon: Settings },
  ];
  return (
    <ul className="grid gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.id}>
            <button type="button" className="sheet flex w-full items-center gap-3 p-4 text-left" onClick={() => onPick(item.id)}>
              <Icon size={18} />
              <span>
                <span className="block font-medium">{item.label}</span>
                <span className="text-sm text-muted">{item.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PeopleView() {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Customer | null>(null);
  if (!shop) return null;
  const start = edit ?? {
    id: "",
    shopId: shop.shop.id,
    name: "",
    phone: "",
    route: "",
    creditLimit: 0,
    note: "",
  };
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t.customers}</h2>
        <Btn
          tone="stamp"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus size={16} /> {t.newOne}
        </Btn>
      </div>
      {open && (
        <PersonForm
          key={edit?.id || "new"}
          initial={start}
          onClose={() => setOpen(false)}
          onSave={async (customer, password) => {
            await go.saveCustomer(shop.shop.id, customer, password);
            setOpen(false);
          }}
        />
      )}
      <ul className="grid gap-2">
        {shop.customers.map((c) => {
          const due = balance(c.id, shop.orders, shop.payments);
          const over = c.creditLimit > 0 && due > c.creditLimit;
          return (
            <li key={c.id}>
              <div
                className="sheet flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => {
                  setEdit(c);
                  setOpen(true);
                }}
              >
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-sm text-muted">
                    {c.phone} · {c.route || t.noRoute}
                    {c.username ? ` · ${memberUser(shop.shop.code, c.username)}` : ""}
                  </span>
                  {c.mustChangePass && <span className="block text-sm text-muted">{t.passSame}</span>}
                  {over && <span className="block text-sm text-due">{t.overLimit}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <Money n={due} tone={due > 0 ? "due" : "paid"} />
                  {c.username && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-stamp"
                      onClick={(e) => {
                        e.stopPropagation();
                        void go.resetMemberPassword(shop.shop.id, c.id);
                      }}
                    >
                      {t.resetPass}
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PersonForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Customer;
  onSave: (c: Customer, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const go = useGo();
  const code = go.active?.shop.code ?? "";
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [route, setRoute] = useState(initial.route);
  const [limit, setLimit] = useState(String(initial.creditLimit || ""));
  const [note, setNote] = useState(initial.note);
  return (
    <form
      className="sheet grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onSave(
          {
            ...initial,
            id: initial.id || crypto.randomUUID(),
            name: name.trim(),
            phone: phone.trim(),
            route: route.trim(),
            creditLimit: Number(limit || 0),
            note: note.trim(),
            username: initial.username,
          },
        );
      }}
    >
      <Field label={t.name}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t.phone}>
        <TextInput value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} required />
      </Field>
      <Field label={t.route}>
        <TextInput value={route} onChange={(e) => setRoute(e.target.value)} placeholder={t.routePh} />
      </Field>
      <Field label={t.limit}>
        <TextInput inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={t.noLimit} />
      </Field>
      <Field label={t.note}>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {initial.username ? (
        <div className="grid gap-2">
          <p className="text-sm leading-6">
            {t.username}: {code ? memberUser(code, initial.username) : initial.username}
          </p>
          <p className="text-sm leading-6 text-muted">{initial.mustChangePass ? t.passSame : t.memberAuto}</p>
          <Btn
            type="button"
            tone="ghost"
            disabled={go.busy}
            onClick={() => void go.resetMemberPassword(initial.shopId, initial.id)}
          >
            {t.resetPass}
          </Btn>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted">{t.memberAuto}</p>
      )}
      <div className="flex gap-2">
        <Btn type="submit" tone="stamp">
          {t.save}
        </Btn>
        <Btn type="button" tone="ghost" onClick={onClose}>
          {t.close}
        </Btn>
      </div>
    </form>
  );
}

function ItemsView() {
  const go = useGo();
  const { t } = useI18n();
  const shop = go.active;
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  if (!shop) return null;
  const blank: Item = { id: "", shopId: shop.shop.id, name: "", unit: t.piece, price: 0, stock: 0, active: true };
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t.items}</h2>
        <Btn
          tone="stamp"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus size={16} /> {t.newOne}
        </Btn>
      </div>
      {open && (
        <ItemForm
          key={edit?.id || "new"}
          initial={edit ?? blank}
          onClose={() => setOpen(false)}
          onSave={async (item) => {
            await go.saveItem(shop.shop.id, item);
            setOpen(false);
          }}
        />
      )}
      <ul className="grid gap-2">
        {shop.items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              className="sheet flex w-full items-center justify-between gap-3 p-3 text-left"
              onClick={() => {
                setEdit(it);
                setOpen(true);
              }}
            >
              <span>
                <span className={`block font-medium ${it.active ? "" : "text-muted"}`}>{it.name}</span>
                <span className="text-sm text-muted">
                  {t.stock} {qtyText(it.stock)} {it.unit}
                </span>
              </span>
              <Money n={it.price} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Item;
  onSave: (item: Item) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial.name);
  const [unit, setUnit] = useState(initial.unit);
  const [price, setPrice] = useState(String(initial.price || ""));
  const [stock, setStock] = useState(String(initial.stock || ""));
  const [active, setActive] = useState(initial.active);
  return (
    <form
      className="sheet grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onSave({
          ...initial,
          id: initial.id || crypto.randomUUID(),
          name: name.trim(),
          unit: unit.trim() || t.piece,
          price: Number(price || 0),
          stock: Number(stock || 0),
          active,
        });
      }}
    >
      <Field label={t.name}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t.unit}>
          <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label={t.price}>
          <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t.stock}>
          <TextInput inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t.showOnOrder}
      </label>
      <div className="flex gap-2">
        <Btn type="submit" tone="stamp">
          {t.save}
        </Btn>
        <Btn type="button" tone="ghost" onClick={onClose}>
          {t.close}
        </Btn>
      </div>
    </form>
  );
}

function SalesView() {
  const go = useGo();
  const { lang, t } = useI18n();
  const shop = go.active;
  const month = monthKey();
  if (!shop) return null;
  const orders = shop.orders.filter((o) => o.date.slice(0, 7) === month && o.status !== "cancelled");
  const credit = orders.filter((o) => o.mode === "credit").reduce((s, o) => s + orderTotal(o), 0);
  const cash = orders.filter((o) => o.mode === "cash").reduce((s, o) => s + orderTotal(o), 0);
  const collected = shop.payments.filter((p) => p.date.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0);
  const due = shop.customers.reduce((s, c) => s + balance(c.id, shop.orders, shop.payments), 0);
  const map = new Map<string, { name: string; qty: number; amount: number }>();
  for (const o of orders) {
    for (const l of o.lines) {
      const cur = map.get(l.name) ?? { name: l.name, qty: 0, amount: 0 };
      cur.qty += l.qty;
      cur.amount += l.qty * l.price;
      map.set(l.name, cur);
    }
  }
  const top = [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
  const max = top[0]?.amount || 1;
  return (
    <div className="grid gap-4">
      <h2 className="font-semibold">
        {monthText(lang, month)} {t.sales}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="sheet p-3">
          <p className="text-sm text-muted">{t.credit}</p>
          <Money n={credit} tone="due" />
        </div>
        <div className="sheet p-3">
          <p className="text-sm text-muted">{t.cash}</p>
          <Money n={cash} tone="paid" />
        </div>
        <div className="sheet p-3">
          <p className="text-sm text-muted">{t.collected}</p>
          <Money n={collected} tone="paid" />
        </div>
        <div className="sheet p-3">
          <p className="text-sm text-muted">{t.totalDebt}</p>
          <Money n={due} tone="due" />
        </div>
      </div>
      <section className="sheet p-4">
        <h3 className="mb-3 font-medium">{t.topItems}</h3>
        <ul className="grid gap-3">
          {top.map((row) => (
            <li key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{row.name}</span>
                <span>
                  {qtyText(row.qty)} · {inr(row.amount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-stamp" style={{ width: `${Math.max(8, (row.amount / max) * 100)}%` }} />
              </div>
            </li>
          ))}
          {top.length === 0 && <li className="text-sm text-muted">{t.noSales}</li>}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 font-medium">{t.monthPays}</h3>
        <ul className="sheet divide-y divide-line">
          {shop.payments
            .filter((p) => p.date.slice(0, 7) === month)
            .map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>
                  {shortDate(p.date)} · {p.customerName} · {payText(t, p.method)}
                </span>
                <Money n={p.amount} tone="paid" />
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function FinancialReportView() {
  const go = useGo();
  const { lang, t } = useI18n();
  const shop = go.active;
  const [month, setMonth] = useState(monthKey());
  if (!shop) return null;
  const orders = shop.orders.filter((o) => o.date.startsWith(month) && o.status !== "cancelled");
  const sales = orders.reduce((s, o) => s + orderTotal(o), 0);
  const credit = orders.filter((o) => o.mode === "credit").reduce((s, o) => s + orderTotal(o), 0);
  const cash = orders.filter((o) => o.mode === "cash").reduce((s, o) => s + orderTotal(o), 0);
  const collections = shop.payments.filter((p) => p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0);
  const outstanding = shop.customers.reduce((s, c) => s + Math.max(0, balance(c.id, shop.orders, shop.payments)), 0);
  const paymentByMethod = (["cash", "upi", "bank"] as PayMethod[]).map((method) => ({
    method,
    amount: shop.payments.filter((p) => p.date.startsWith(month) && p.method === method).reduce((s, p) => s + p.amount, 0),
  }));
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>{t.prev}</Btn>
        <h2 className="font-display text-xl">Financial Report · {monthText(lang, month)}</h2>
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>{t.next}</Btn>
      </div>
      <section className="print-sheet sheet grid gap-4 p-5">
        <div>
          <p className="text-xl font-semibold">{shop.shop.name}</p>
          <p className="text-sm text-muted">{serviceText(lang, shop.shop)} · {shop.shop.code}</p>
          {shop.shop.gstin && <p className="text-sm text-muted">GSTIN: {shop.shop.gstin}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Orders" value={String(orders.length)} />
          <Metric label="Sales" value={inr(sales)} />
          <Metric label="Credit sales" value={inr(credit)} />
          <Metric label="Cash sales" value={inr(cash)} />
          <Metric label="Collections" value={inr(collections)} />
          <Metric label="Outstanding" value={inr(outstanding)} />
        </div>
        <section className="grid gap-2 text-sm">
          <h3 className="font-semibold">Collections by method</h3>
          {paymentByMethod.map((row) => <Row key={row.method} k={payText(t, row.method)} v={inr(row.amount)} />)}
        </section>
        <p className="text-xs leading-5 text-muted">Accounting summary generated from orders and recorded payments. Use your accountant/CA for GST/tax filing and final classification.</p>
      </section>
      <div className="no-print flex flex-wrap gap-2">
        <Btn tone="stamp" onClick={() => window.print()}><Printer size={15} /> Generate / Save PDF</Btn>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="sheet p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-semibold break-words">{value}</p></div>;
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-baseline justify-between gap-3"><span className="text-muted">{k}</span><span>{v}</span></div>;
}

function ShopsView() {
  const go = useGo();
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(go.blobs.length === 0);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t.shops}</h2>
        <Btn tone="stamp" onClick={() => setOpen(true)}>
          <Plus size={16} /> {t.newShop}
        </Btn>
      </div>
      {open && (
        <div className="sheet p-4">
          <ServiceForm
            submitLabel={t.createBtn}
            onSubmit={(input) => {
              void go.addShop(input);
              setOpen(false);
            }}
          />
        </div>
      )}
      <ul className="grid gap-2">
        {go.blobs.map((b) => (
          <li key={b.shop.id}>
            <button type="button" className="sheet w-full p-4 text-left" onClick={() => go.setActiveShop(b.shop.id)}>
              <span className="font-medium">{b.shop.name}</span>
              <span className="mt-1 block text-sm text-muted">
                {serviceText(lang, b.shop)} · {t.code} {b.shop.code} · {b.customers.length} {t.customerCount}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (input: { name: string; kind: ShopKind; serviceName?: string; work: WorkMode; phone: string; address: string; upi: string }) => void;
}) {
  const { t } = useI18n();
  const [service, setService] = useState("");
  const [kind, setKind] = useState<ShopKind>("custom");
  const [work, setWork] = useState<WorkMode | "">("");
  const [shop, setShop] = useState("");
  const ready = Boolean(service.trim() && shop.trim() && work);
  const ways: Array<{ id: WorkMode; label: string; hint: string }> = [
    { id: "order", label: t.workOrder, hint: t.workOrderHint },
    { id: "fixed", label: t.workFixed, hint: t.workFixedHint },
    { id: "daily", label: t.workDaily, hint: t.workDailyHint },
  ];
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || !work) return;
        const named = service.trim();
        const byLabel = SERVICES.find((s) => s.id !== "custom" && t.svc[s.id].toLowerCase() === named.toLowerCase());
        const resolved: ShopKind = byLabel?.id ?? "custom";
        onSubmit({
          name: shop.trim(),
          kind: resolved,
          serviceName: resolved === "custom" ? named : undefined,
          work,
          phone: "",
          address: "",
          upi: "",
        });
        setService("");
        setShop("");
        setWork("");
        setKind("custom");
      }}
    >
      <p className="text-sm text-muted">{t.pickWork}</p>
      <div className="grid gap-2">
        {ways.map((way) => (
          <button
            key={way.id}
            type="button"
            className={`min-h-16 rounded-2xl border px-4 py-3 text-left ${work === way.id ? "border-stamp bg-stamp text-stamp-ink" : "border-line bg-paper"}`}
            onClick={() => setWork(way.id)}
          >
            <span className="block text-base font-semibold">{way.label}</span>
            <span className="mt-0.5 block text-xs leading-4 opacity-80">{way.hint}</span>
          </button>
        ))}
      </div>
      <Field label={t.nameShop}>
        <TextInput value={shop} onChange={(e) => setShop(e.target.value)} required />
      </Field>
      <Field label={t.nameService}>
        <TextInput value={service} onChange={(e) => { setService(e.target.value); setKind("custom"); }} placeholder={t.serviceEg} required />
      </Field>
      <details>
        <summary className="cursor-pointer text-sm text-muted">{t.pickOne}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICES.filter((s) => s.id !== "custom").map((s) => (
            <button
              key={s.id}
              type="button"
              className={`min-h-11 rounded-full border px-3 text-sm ${
                kind === s.id && service === t.svc[s.id] ? "border-stamp bg-stamp text-stamp-ink" : "border-line bg-paper"
              }`}
              onClick={() => {
                setKind(s.id);
                setService(t.svc[s.id]);
              }}
            >
              {t.svc[s.id]}
            </button>
          ))}
        </div>
      </details>
      <Btn type="submit" tone="stamp" disabled={!ready}>
        {submitLabel}
      </Btn>
    </form>
  );
}

function SettingsView() {
  const go = useGo();
  const { t } = useI18n();
  const [sure, setSure] = useState(false);
  const who = go.session?.uid === "demo-owner" ? t.demoOwnerName : go.session?.name;
  const shop = go.active;
  const [upi, setUpi] = useState(shop?.shop.upi ?? "");
  const [gstin, setGstin] = useState(shop?.shop.gstin ?? "");
  useEffect(() => {
    setUpi(shop?.shop.upi ?? "");
    setGstin(shop?.shop.gstin ?? "");
  }, [shop?.shop.id, shop?.shop.upi, shop?.shop.gstin]);
  return (
    <div className="grid gap-4">
      <h2 className="font-semibold">{t.settings}</h2>
      <section className="sheet p-4">
        <p className="text-sm text-muted">{t.signedIn}</p>
        <p className="mt-1 break-all font-medium">{go.session?.email || who}</p>
      </section>
      <section className="sheet grid gap-3 p-4">
        <h3 className="font-medium">Payments & tax profile</h3>
        <Field label="UPI ID"><TextInput value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="business@upi" /></Field>
        <Field label="GSTIN (optional)"><TextInput value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="15-character GSTIN" /></Field>
        <Btn tone="stamp" disabled={!shop || go.busy} onClick={() => { if (shop) void go.saveShop(shop.shop.id, { upi: upi.trim(), gstin: gstin.trim() || undefined }); }}>
          Save payment details
        </Btn>
        <p className="text-xs leading-5 text-muted">Monthly PDF is an accounting summary for your records/CA; it is not itself a GST return.</p>
      </section>
      <section className="sheet p-4">
        <h3 className="mb-3 font-medium">{t.language}</h3>
        <LangSelect />
      </section>
      <Btn tone="ghost" onClick={() => void go.signOut()}>
        {t.out}
      </Btn>
      {shop && (
        <section className="sheet grid gap-3 p-4">
          <h3 className="font-medium text-due">{t.deleteForever}</h3>
          <p className="text-sm leading-6 text-muted">{t.deleteWarn}</p>
          <p className="text-sm font-medium">{shop.shop.name}</p>
          {sure ? (
            <Btn tone="stamp" disabled={go.busy} onClick={() => void go.deleteShop(shop.shop.id)}>
              {t.deleteYes}
            </Btn>
          ) : (
            <Btn tone="ghost" onClick={() => setSure(true)}>
              {t.deleteForever}
            </Btn>
          )}
        </section>
      )}
    </div>
  );
}
