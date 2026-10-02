import { useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Home,
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
import { monthText, serviceText, useI18n, type Copy } from "@/lib/go/i18n";
import {
  balance,
  billFor,
  inr,
  monthKey,
  orderTotal,
  qtyText,
  SERVICES,
  shiftMonth,
  todayISO,
} from "@/lib/go/logic";
import { FIREBASE_PROJECT, FIRESTORE_RULES, parseFirebaseConfig } from "@/lib/go/config";
import { useGo } from "@/lib/go/store";
import type { Customer, Item, OrderStatus, PayMethod, ShopKind } from "@/lib/go/types";
import { OrderPad } from "./order-pad";
import { Btn, Field, Money, Select, TextInput, shortDate } from "./ui";

type View = "home" | "orders" | "bills" | "routes" | "more" | "people" | "items" | "sales" | "shops" | "settings";

const DOCK: Array<{ id: View; icon: typeof Home }> = [
  { id: "home", icon: Home },
  { id: "orders", icon: ClipboardList },
  { id: "bills", icon: Receipt },
  { id: "routes", icon: Truck },
  { id: "more", icon: Settings },
];

function dockLabel(t: Copy, id: View) {
  if (id === "home") return t.home;
  if (id === "orders") return t.orders;
  if (id === "bills") return t.bills;
  if (id === "routes") return t.routes;
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
  const [view, setView] = useState<View>("home");
  const [compose, setCompose] = useState(false);
  const shop = go.active;
  const moreOn = !["home", "orders", "bills", "routes"].includes(view);

  if (go.blobs.length === 0) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-5xl leading-none text-stamp">{t.brand}</p>
            <p className="mt-2 text-xs tracking-wide text-muted">{t.poweredBy}</p>
          </div>
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
    <div className="mx-auto min-h-screen w-full max-w-5xl md:grid md:grid-cols-[13rem_1fr]">
      <aside className="no-print hidden border-r border-line p-4 md:block">
        <p className="font-display text-3xl leading-none text-stamp">{t.brand}</p>
        <p className="mb-4 text-xs text-muted">{t.owner}</p>
        <nav className="grid gap-1">
          {DOCK.filter((d) => d.id !== "more").map((d) => (
            <NavBtn key={d.id} active={view === d.id} label={dockLabel(t, d.id)} onClick={() => setView(d.id)} />
          ))}
          <NavBtn active={view === "people"} label={t.customers} onClick={() => setView("people")} />
          <NavBtn active={view === "items"} label={t.items} onClick={() => setView("items")} />
          <NavBtn active={view === "sales"} label={t.sales} onClick={() => setView("sales")} />
          <NavBtn active={view === "shops"} label={t.shops} onClick={() => setView("shops")} />
          <NavBtn active={view === "settings"} label={t.settings} onClick={() => setView("settings")} />
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-14 z-10 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{shop?.shop.name ?? t.noShop}</p>
            <p className="truncate text-xs text-muted">
              {shop ? `${serviceText(lang, shop.shop)} · ${shop.shop.code}` : t.pickService}
              {go.session?.backend === "demo" ? ` · ${t.demo}` : ""}
              {go.busy ? ` · ${t.saving}` : ""}
            </p>
          </div>
          {go.blobs.length > 1 && (
            <select
              className="field max-w-40"
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
        <div className="px-4 py-4 pb-28 md:pb-8">
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
          {view === "bills" && <BillsView />}
          {view === "routes" && <RoutesView />}
          {view === "more" && <MoreView onPick={(id) => setView(id)} />}
          {view === "people" && <PeopleView />}
          {view === "items" && <ItemsView />}
          {view === "sales" && <SalesView />}
          {view === "shops" && <ShopsView />}
          {view === "settings" && <SettingsView />}
        </div>
        <nav className="dock no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {DOCK.map((d) => {
              const Icon = d.icon;
              const on = d.id === "more" ? moreOn : view === d.id;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs ${on ? "text-stamp" : "text-muted"}`}
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
        <p className="text-sm text-muted">{t.yourCode}</p>
        <p className="font-display text-4xl tracking-wide text-stamp">{shop.shop.code}</p>
        <p className="mt-1 text-sm text-muted">
          {shop.shop.name} · {serviceText(lang, shop.shop)}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">{t.codeHelp}</p>
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
          {shop.shop.upi && <p className="mt-3 text-sm">UPI: {shop.shop.upi}</p>}
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
              <button
                type="button"
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
                    {c.username ? ` · ${c.username}` : ""}
                  </span>
                  {over && <span className="block text-sm text-due">{t.overLimit}</span>}
                </span>
                <Money n={due} tone={due > 0 ? "due" : "paid"} />
              </button>
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
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [route, setRoute] = useState(initial.route);
  const [limit, setLimit] = useState(String(initial.creditLimit || ""));
  const [note, setNote] = useState(initial.note);
  const [username, setUsername] = useState(initial.username ?? "");
  const [password, setPassword] = useState("");
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
            username: username.trim().toLowerCase() || undefined,
          },
          password,
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
      <Field label={t.memberUser}>
        <TextInput value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} placeholder="rahim" />
      </Field>
      <Field label={t.memberPass}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={initial.passHash ? t.passKeep : t.memberHint}
        />
      </Field>
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
  onSubmit: (input: { name: string; kind: ShopKind; serviceName?: string; phone: string; address: string; upi: string }) => void;
}) {
  const { t } = useI18n();
  const [service, setService] = useState("");
  const [kind, setKind] = useState<ShopKind>("custom");
  const [shop, setShop] = useState("");
  const ready = Boolean(service.trim() && shop.trim());
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        const named = service.trim();
        const byLabel = SERVICES.find((s) => s.id !== "custom" && t.svc[s.id].toLowerCase() === named.toLowerCase());
        const resolved: ShopKind = byLabel?.id ?? "custom";
        onSubmit({
          name: shop.trim(),
          kind: resolved,
          serviceName: resolved === "custom" ? named : undefined,
          phone: "",
          address: "",
          upi: "",
        });
        setService("");
        setShop("");
        setKind("custom");
      }}
    >
      <Field label={t.nameService}>
        <TextInput value={service} onChange={(e) => { setService(e.target.value); setKind("custom"); }} placeholder={t.serviceEg} required />
      </Field>
      <div>
        <p className="mb-2 text-sm text-muted">{t.pickOne}</p>
        <div className="flex flex-wrap gap-2">
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
      </div>
      <Field label={t.nameShop}>
        <TextInput value={shop} onChange={(e) => setShop(e.target.value)} required />
      </Field>
      <Btn type="submit" tone="stamp" disabled={!ready}>
        {submitLabel}
      </Btn>
    </form>
  );
}

function SettingsView() {
  const go = useGo();
  const { t } = useI18n();
  const [paste, setPaste] = useState("");
  const who = go.session?.uid === "demo-owner" ? t.demoOwnerName : go.session?.name;
  return (
    <div className="grid gap-4">
      <h2 className="font-semibold">{t.settings}</h2>
      <section className="sheet p-4">
        <h3 className="font-medium">{t.backendLine}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          {t.backendLine} {FIREBASE_PROJECT}. {t.googleLine}{" "}
          {go.session?.backend === "firebase"
            ? `${t.now} ${go.session.email || go.session.name}. ${t.project} ${go.config?.projectId ?? ""}.`
            : t.readyGoogle}
        </p>
        <textarea className="field mt-3" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t.pasteConfig} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            tone="ink"
            onClick={() => {
              const cfg = parseFirebaseConfig(paste);
              if (cfg) go.saveConfig(cfg);
            }}
          >
            {t.save}
          </Btn>
          <Btn tone="ghost" onClick={() => void navigator.clipboard.writeText(FIRESTORE_RULES)}>
            {t.copyRulesShort}
          </Btn>
          {go.session?.backend === "demo" && (
            <Btn tone="stamp" disabled={go.busy} onClick={() => void go.signInOwner()}>
              {t.ownerGoogle}
            </Btn>
          )}
        </div>
      </section>
      {go.session?.backend === "demo" && (
        <section className="sheet p-4">
          <h3 className="font-medium">{t.demoTitle}</h3>
          <p className="mt-1 text-sm text-muted">{t.demoBody}</p>
          <Btn className="mt-3" tone="ghost" onClick={go.resetDemo}>
            {t.refill}
          </Btn>
        </section>
      )}
      <p className="text-sm text-muted">
        {t.now} {who}
      </p>
      <Btn tone="ghost" onClick={() => void go.signOut()}>
        {t.out}
      </Btn>
    </div>
  );
}
