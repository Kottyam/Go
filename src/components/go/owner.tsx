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
import {
  balance,
  billFor,
  inr,
  kindLabel,
  methodLabel,
  monthKey,
  monthLabel,
  orderTotal,
  qtyText,
  shiftMonth,
  statusLabel,
  todayISO,
} from "@/lib/go/logic";
import { FIREBASE_PROJECT, FIRESTORE_RULES, parseFirebaseConfig } from "@/lib/go/config";
import { useGo } from "@/lib/go/store";
import type { Customer, Item, OrderStatus, PayMethod, ShopKind } from "@/lib/go/types";
import { OrderPad } from "./order-pad";
import { Btn, Field, Money, Select, TextInput, shortDate } from "./ui";

type View = "home" | "orders" | "bills" | "routes" | "more" | "people" | "items" | "sales" | "shops" | "settings";

const DOCK: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "ഹോം", icon: Home },
  { id: "orders", label: "ഓർഡർ", icon: ClipboardList },
  { id: "bills", label: "മാസബിൽ", icon: Receipt },
  { id: "routes", label: "വിതരണം", icon: Truck },
  { id: "more", label: "കൂടുതൽ", icon: Settings },
];

export function OwnerApp() {
  const go = useGo();
  const [view, setView] = useState<View>("home");
  const [compose, setCompose] = useState(false);
  const shop = go.active;
  const moreOn = !["home", "orders", "bills", "routes"].includes(view);

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl md:grid md:grid-cols-[13rem_1fr]">
      <aside className="no-print hidden border-r border-line p-4 md:block">
        <p className="font-display text-3xl">GO</p>
        <p className="mb-4 text-xs text-muted">ഉടമ</p>
        <nav className="grid gap-1">
          {DOCK.filter((d) => d.id !== "more").map((d) => (
            <NavBtn key={d.id} active={view === d.id} label={d.label} onClick={() => setView(d.id)} />
          ))}
          <NavBtn active={view === "people"} label="കസ്റ്റമർ" onClick={() => setView("people")} />
          <NavBtn active={view === "items"} label="ഐറ്റംസ്" onClick={() => setView("items")} />
          <NavBtn active={view === "sales"} label="സെയിൽസ്" onClick={() => setView("sales")} />
          <NavBtn active={view === "shops"} label="ഷോപ്പുകൾ" onClick={() => setView("shops")} />
          <NavBtn active={view === "settings"} label="ക്രമീകരണം" onClick={() => setView("settings")} />
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{shop?.shop.name ?? "ഷോപ്പ് ഇല്ല"}</p>
            <p className="truncate text-xs text-muted">
              {shop ? `${kindLabel(shop.shop.kind)} · ${shop.shop.code}` : "പുതിയ ഷോപ്പ് ഉണ്ടാക്കുക"}
              {go.session?.backend === "demo" ? " · ഡെമോ" : ""}
              {go.busy ? " · സേവ് ചെയ്യുന്നു" : ""}
            </p>
          </div>
          {go.blobs.length > 1 && (
            <select
              className="field max-w-40"
              value={shop?.shop.id ?? ""}
              onChange={(e) => go.setActiveShop(e.target.value)}
              aria-label="ഷോപ്പ്"
            >
              {go.blobs.map((b) => (
                <option key={b.shop.id} value={b.shop.id}>
                  {b.shop.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => void go.signOut()} aria-label="പുറത്ത്">
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
          {view === "orders" && (
            <OrdersView compose={compose} setCompose={setCompose} />
          )}
          {view === "bills" && <BillsView />}
          {view === "routes" && <RoutesView />}
          {view === "more" && (
            <MoreView
              onPick={(id) => setView(id)}
            />
          )}
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
                    {d.label}
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
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBills} className="sheet p-4 text-left">
          <p className="text-sm text-muted">ബാക്കി കടം</p>
          <p className="mt-1 text-2xl"><Money n={due} tone="due" /></p>
        </button>
        <button type="button" onClick={onRoutes} className="sheet p-4 text-left">
          <p className="text-sm text-muted">ഇന്നത്തെ ഓർഡർ</p>
          <p className="mt-1 font-display text-2xl">{todayOrders.length}</p>
          <p className="text-xs text-muted">{pending.length} എത്തിയിട്ടില്ല</p>
        </button>
      </div>
      <div className="sheet flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted">{monthLabel(month)} പിരിവ്</p>
          <p className="text-xl"><Money n={collected} tone="paid" /></p>
        </div>
        <Btn tone="gold" onClick={onOrder}>
          <Plus size={14} /> ഓർഡർ
        </Btn>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">ഇന്ന് പോകേണ്ടത്</h2>
        <ul className="sheet divide-y divide-line">
          {pending.length === 0 && <li className="p-4 text-sm text-muted">ഇന്ന് ബാക്കി ഡെലിവറി ഇല്ല.</li>}
          {pending.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.customerName}</p>
                <p className="truncate text-sm text-muted">
                  {o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")}
                </p>
              </div>
              <span className="text-sm">{statusLabel(o.status)}</span>
            </li>
          ))}
        </ul>
      </section>
      {low.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">കുറഞ്ഞ സ്റ്റോക്ക്</h2>
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
  const shop = go.active;
  const [day, setDay] = useState(todayISO());
  const [filter, setFilter] = useState<"open" | "all">("open");
  if (!shop) return <p className="text-sm text-muted">ഷോപ്പ് തിരഞ്ഞെടുക്കുക.</p>;
  const rows = shop.orders.filter((o) => {
    if (o.date !== day) return false;
    if (filter === "open" && (o.status === "delivered" || o.status === "cancelled")) return false;
    return true;
  });
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="തീയതി">
          <TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Btn tone={filter === "open" ? "ink" : "ghost"} onClick={() => setFilter("open")}>ബാക്കി</Btn>
        <Btn tone={filter === "all" ? "ink" : "ghost"} onClick={() => setFilter("all")}>എല്ലാം</Btn>
        <Btn tone="gold" onClick={() => setCompose(!compose)}>{compose ? "അടയ്ക്കുക" : "പുതിയ ഓർഡർ"}</Btn>
      </div>
      {compose && <OrderPad onDone={() => setCompose(false)} />}
      <ul className="grid gap-3">
        {rows.length === 0 && <li className="text-sm text-muted">ഈ ദിവസം ഓർഡർ ഇല്ല.</li>}
        {rows.map((o) => (
          <li key={o.id} className="sheet p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{o.customerName}</p>
                <p className="text-sm text-muted">
                  {o.mode === "credit" ? "ക്രെഡിറ്റ്" : "ക്യാഷ്"} · {statusLabel(o.status)}
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
                    {statusLabel(s)}
                  </Btn>
                ))}
                <Btn tone="ghost" onClick={() => void go.setStatus(shop.shop.id, o.id, "cancelled")}>റദ്ദ്</Btn>
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
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>മുമ്പ്</Btn>
        <h2 className="font-display text-xl">{monthLabel(month)}</h2>
        <Btn tone="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>അടുത്തത്</Btn>
      </div>
      <p className="text-sm text-muted">
        ഈ മാസത്തെ ബാക്കി <Money n={totalDue} tone="due" />. ക്രെഡിറ്റ് മാത്രം കടത്തിൽ വരും.
      </p>
      <ul className="grid gap-2">
        {rows.map(({ c, bill }) => (
          <li key={c.id}>
            <button type="button" className="sheet flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="text-sm text-muted">{c.route || "റൂട്ട് ഇല്ല"} · വാങ്ങൽ {inr(bill.sales)}</span>
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
              <p className="text-sm text-muted">{monthLabel(month)} · {open.c.phone}</p>
            </div>
            <button type="button" className="no-print grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => window.print()} aria-label="പ്രിന്റ്">
              <Printer size={18} />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">തുടക്ക ബാക്കി</dt><dd><Money n={open.bill.opening} /></dd></div>
            <div><dt className="text-muted">ക്രെഡിറ്റ് വാങ്ങൽ</dt><dd><Money n={open.bill.sales} /></dd></div>
            <div><dt className="text-muted">പിരിവ്</dt><dd><Money n={open.bill.collected} tone="paid" /></dd></div>
            <div><dt className="text-muted">ഇപ്പോഴത്തെ കടം</dt><dd><Money n={open.bill.due} tone="due" /></dd></div>
          </dl>
          {open.bill.cash > 0 && <p className="mt-2 text-sm text-muted">ക്യാഷ് വാങ്ങൽ {inr(open.bill.cash)} കടത്തിൽ ചേർത്തിട്ടില്ല.</p>}
          <ul className="mt-3 divide-y divide-line text-sm">
            {shop.orders
              .filter((o) => o.customerId === open.c.id && o.date.slice(0, 7) === month && o.status !== "cancelled")
              .map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2">
                  <span>{shortDate(o.date)} · {o.lines.map((l) => l.name).join(", ")} · {o.mode === "cash" ? "ക്യാഷ്" : "ക്രെഡിറ്റ്"}</span>
                  <span>{inr(orderTotal(o))}</span>
                </li>
              ))}
          </ul>
          {shop.shop.upi && <p className="mt-3 text-sm">UPI: {shop.shop.upi}</p>}
          <div className="no-print mt-4 grid gap-2 border-t border-line pt-4">
            <h4 className="font-semibold">പണം വാങ്ങി രേഖ</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="തുക">
                <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </Field>
              <Field label="വഴി">
                <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                  <option value="cash">ക്യാഷ്</option>
                  <option value="upi">UPI</option>
                  <option value="bank">ബാങ്ക്</option>
                </Select>
              </Field>
            </div>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="കുറിപ്പ്" />
            <Btn tone="paid" disabled={go.busy} onClick={() => void collect()}>പിരിവ് സേവ്</Btn>
          </div>
        </article>
      )}
    </div>
  );
}

function RoutesView() {
  const go = useGo();
  const shop = go.active;
  const [day, setDay] = useState(todayISO());
  const groups = useMemo(() => {
    if (!shop) return [];
    const orders = shop.orders.filter((o) => o.date === day && o.status !== "cancelled");
    const map = new Map<string, typeof orders>();
    for (const o of orders) {
      const customer = shop.customers.find((c) => c.id === o.customerId);
      const route = customer?.route || "റൂട്ട് ഇല്ല";
      map.set(route, [...(map.get(route) ?? []), o]);
    }
    return [...map.entries()];
  }, [shop, day]);
  if (!shop) return null;
  return (
    <div className="grid gap-4">
      <Field label="വിതരണ ദിവസം">
        <TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </Field>
      {groups.length === 0 && <p className="text-sm text-muted">ഈ ദിവസം വിതരണം ഇല്ല.</p>}
      {groups.map(([route, orders]) => (
        <section key={route}>
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Truck size={16} /> {route}</h2>
          <ul className="grid gap-2">
            {orders.map((o) => (
              <li key={o.id} className="sheet p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-sm text-muted">{o.lines.map((l) => `${l.name} ${qtyText(l.qty)}`).join(", ")}</p>
                  </div>
                  <span className="text-sm">{statusLabel(o.status)}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Btn tone="ghost" onClick={() => void go.setStatus(shop.shop.id, o.id, "out")}>വഴിയിൽ</Btn>
                  <Btn tone="paid" onClick={() => void go.setStatus(shop.shop.id, o.id, "delivered")}>എത്തി</Btn>
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
  const items: Array<{ id: View; label: string; hint: string; icon: typeof Users }> = [
    { id: "people", label: "കസ്റ്റമേഴ്സ്", hint: "ക്രെഡിറ്റ് പരിധി, റൂട്ട്", icon: Users },
    { id: "items", label: "ഐറ്റംസ്", hint: "വില, സ്റ്റോക്ക്", icon: Package },
    { id: "sales", label: "സെയിൽസ്", hint: "ക്യാഷും ക്രെഡിറ്റും", icon: BarChart3 },
    { id: "shops", label: "ഷോപ്പുകൾ", hint: "ബേക്കറി, ഹോൾസെയിൽ", icon: Store },
    { id: "settings", label: "ക്രമീകരണം", hint: "Firebase, ഡെമോ", icon: Settings },
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
        <h2 className="font-semibold">കസ്റ്റമേഴ്സ്</h2>
        <Btn tone="stamp" onClick={() => { setEdit(null); setOpen(true); }}><Plus size={16} /> പുതിയത്</Btn>
      </div>
      {open && (
        <PersonForm
          key={edit?.id || "new"}
          initial={start}
          onClose={() => setOpen(false)}
          onSave={async (customer) => {
            await go.saveCustomer(shop.shop.id, customer);
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
                onClick={() => { setEdit(c); setOpen(true); }}
              >
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-sm text-muted">{c.phone} · {c.route || "റൂട്ട് ഇല്ല"}</span>
                  {over && <span className="block text-sm text-due">പരിധി കഴിഞ്ഞു</span>}
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

function PersonForm({ initial, onSave, onClose }: { initial: Customer; onSave: (c: Customer) => Promise<void>; onClose: () => void }) {
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
        void onSave({
          ...initial,
          id: initial.id || crypto.randomUUID(),
          name: name.trim(),
          phone: phone.trim(),
          route: route.trim(),
          creditLimit: Number(limit || 0),
          note: note.trim(),
        });
      }}
    >
      <Field label="പേര്"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="ഫോൺ"><TextInput value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} required /></Field>
      <Field label="റൂട്ട്"><TextInput value={route} onChange={(e) => setRoute(e.target.value)} placeholder="പാലയം" /></Field>
      <Field label="ക്രെഡിറ്റ് പരിധി"><TextInput inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0 = പരിധി ഇല്ല" /></Field>
      <Field label="കുറിപ്പ്"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Btn type="submit" tone="stamp">സേവ്</Btn>
        <Btn type="button" tone="ghost" onClick={onClose}>അടയ്ക്കുക</Btn>
      </div>
    </form>
  );
}

function ItemsView() {
  const go = useGo();
  const shop = go.active;
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  if (!shop) return null;
  const blank: Item = { id: "", shopId: shop.shop.id, name: "", unit: "എണ്ണം", price: 0, stock: 0, active: true };
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">ഐറ്റംസ്</h2>
        <Btn tone="stamp" onClick={() => { setEdit(null); setOpen(true); }}><Plus size={16} /> പുതിയത്</Btn>
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
            <button type="button" className="sheet flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => { setEdit(it); setOpen(true); }}>
              <span>
                <span className={`block font-medium ${it.active ? "" : "text-muted"}`}>{it.name}</span>
                <span className="text-sm text-muted">സ്റ്റോക്ക് {qtyText(it.stock)} {it.unit}</span>
              </span>
              <Money n={it.price} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemForm({ initial, onSave, onClose }: { initial: Item; onSave: (item: Item) => Promise<void>; onClose: () => void }) {
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
          unit: unit.trim() || "എണ്ണം",
          price: Number(price || 0),
          stock: Number(stock || 0),
          active,
        });
      }}
    >
      <Field label="പേര്"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="യൂണിറ്റ്"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <Field label="വില"><TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="സ്റ്റോക്ക്"><TextInput inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        ഓർഡറിൽ കാണിക്കുക
      </label>
      <div className="flex gap-2">
        <Btn type="submit" tone="stamp">സേവ്</Btn>
        <Btn type="button" tone="ghost" onClick={onClose}>അടയ്ക്കുക</Btn>
      </div>
    </form>
  );
}

function SalesView() {
  const go = useGo();
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
      <h2 className="font-semibold">{monthLabel(month)} സെയിൽസ്</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="sheet p-3"><p className="text-sm text-muted">ക്രെഡിറ്റ്</p><Money n={credit} tone="due" /></div>
        <div className="sheet p-3"><p className="text-sm text-muted">ക്യാഷ്</p><Money n={cash} tone="paid" /></div>
        <div className="sheet p-3"><p className="text-sm text-muted">പിരിവ്</p><Money n={collected} tone="paid" /></div>
        <div className="sheet p-3"><p className="text-sm text-muted">മൊത്തം കടം</p><Money n={due} tone="due" /></div>
      </div>
      <section className="sheet p-4">
        <h3 className="mb-3 font-medium">ഏറ്റവും പോയ ഐറ്റംസ്</h3>
        <ul className="grid gap-3">
          {top.map((row) => (
            <li key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{row.name}</span>
                <span>{qtyText(row.qty)} · {inr(row.amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-paper">
                <div className="h-2 rounded-full bg-stamp" style={{ width: `${Math.max(8, (row.amount / max) * 100)}%` }} />
              </div>
            </li>
          ))}
          {top.length === 0 && <li className="text-sm text-muted">ഈ മാസം സെയിൽ ഇല്ല.</li>}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 font-medium">ഈ മാസം പിരിവ്</h3>
        <ul className="sheet divide-y divide-line">
          {shop.payments.filter((p) => p.date.slice(0, 7) === month).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>{shortDate(p.date)} · {p.customerName} · {methodLabel(p.method)}</span>
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
  const [open, setOpen] = useState(go.blobs.length === 0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ShopKind>("bakery");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [upi, setUpi] = useState("");
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">ഷോപ്പുകൾ</h2>
        <Btn tone="stamp" onClick={() => setOpen(true)}><Plus size={16} /> പുതിയ ഷോപ്പ്</Btn>
      </div>
      {open && (
        <form
          className="sheet grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void go.addShop({ name: name.trim(), kind, phone: phone.trim(), address: address.trim(), upi: upi.trim() });
            setName("");
            setOpen(false);
          }}
        >
          <Field label="ഷോപ്പ് പേര്"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="തരം">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ShopKind)}>
              <option value="bakery">ബേക്കറി</option>
              <option value="wholesale">ഹോൾസെയിൽ</option>
              <option value="kirana">കിരാണ</option>
              <option value="steel">സ്റ്റീൽ</option>
              <option value="paint">പെയിന്റ്</option>
              <option value="other">മറ്റ്</option>
            </Select>
          </Field>
          <Field label="ഫോൺ"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="വിലാസം"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="UPI"><TextInput value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="shop@upi" /></Field>
          <Btn type="submit" tone="stamp">ഷോപ്പ് ഉണ്ടാക്കുക</Btn>
        </form>
      )}
      <ul className="grid gap-2">
        {go.blobs.map((b) => (
          <li key={b.shop.id}>
            <button type="button" className="sheet w-full p-4 text-left" onClick={() => go.setActiveShop(b.shop.id)}>
              <span className="font-medium">{b.shop.name}</span>
              <span className="mt-1 block text-sm text-muted">
                {kindLabel(b.shop.kind)} · കോഡ് {b.shop.code} · {b.customers.length} കസ്റ്റമർ
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsView() {
  const go = useGo();
  const [paste, setPaste] = useState("");
  return (
    <div className="grid gap-4">
      <h2 className="font-semibold">ക്രമീകരണം</h2>
      <section className="sheet p-4">
        <h3 className="font-medium">ബാക്കെൻഡ് അക്കൗണ്ട്</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          ബാക്കെൻഡ് Firebase {FIREBASE_PROJECT}. ലോഗിൻ Google.
          {go.session?.backend === "firebase"
            ? ` ഇപ്പോൾ: ${go.session.email || go.session.name}. പ്രോജക്റ്റ് ${go.config?.projectId ?? ""}.`
            : " കോൺഫിഗ് ഒട്ടിച്ച് Google ഉടമ അമർത്തുക."}
        </p>
        <textarea className="field mt-3" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="firebaseConfig ഒട്ടിക്കുക" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            tone="ink"
            onClick={() => {
              const cfg = parseFirebaseConfig(paste);
              if (cfg) go.saveConfig(cfg);
            }}
          >
            സേവ്
          </Btn>
          <Btn tone="ghost" onClick={() => void navigator.clipboard.writeText(FIRESTORE_RULES)}>Rules കോപ്പി</Btn>
          {go.session?.backend === "demo" && (
            <Btn tone="stamp" disabled={go.busy} onClick={() => void go.signInOwner()}>Google ഉടമ</Btn>
          )}
        </div>
      </section>
      {go.session?.backend === "demo" && (
        <section className="sheet p-4">
          <h3 className="font-medium">ഡെമോ</h3>
          <p className="mt-1 text-sm text-muted">സാമ്പിൾ ബേക്കറിയും ഹോൾസെയിലും തിരികെ കൊണ്ടുവരും. നിങ്ങൾ ചേർത്ത ഡെമോ മാറ്റങ്ങൾ പോകും.</p>
          <Btn className="mt-3" tone="ghost" onClick={go.resetDemo}>ഡെമോ വീണ്ടും നിറയ്ക്കുക</Btn>
        </section>
      )}
      <Btn tone="ghost" onClick={() => void go.signOut()}>പുറത്ത് കടക്കുക</Btn>
    </div>
  );
}
