import { useEffect, useMemo, useState } from "react";
import {
  createShop,
  findOldShops,
  importOldShop,
  logout,
  placeOrder,
  recordPayment,
  saveCustomer,
  saveItem,
  setCustomerLogin,
  setOrderStatus,
  updateShop,
  watchOwnerShops,
} from "@/lib/go/data";
import { balanceOf, dayKey, inr } from "@/lib/go/logic";
import { useT } from "@/lib/go/i18n";
import type { Item, Order, PayMethod, Session, Shop } from "@/lib/go/types";
import { useShopData, type ShopData } from "./use-shop";
import { OrderPad } from "./order-pad";
import { Bell } from "./notices";
import { Bill } from "./bill";
import { Button, Card, Dock, Due, Empty, Field, Sheet, Stat, StatusPill, TopBar, errText, useToast, when } from "./ui";

type Owner = Extract<Session, { kind: "owner" }>;
type Tab = "home" | "customers" | "items" | "shop";

function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast(errText(e), true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

export function OwnerApp({ session }: { session: Owner }) {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState<string | null>(() => localStorage.getItem("go.shop"));
  const [adding, setAdding] = useState(false);
  useEffect(() => watchOwnerShops(session.uid, setShops, (e) => setErr(e.message)), [session.uid]);
  const pick = (id: string) => {
    localStorage.setItem("go.shop", id);
    setCurrent(id);
    setAdding(false);
  };
  if (err && !shops)
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6 text-center">
        <p className="text-due">{err}</p>
        <Button onClick={() => void logout()}>Sign out</Button>
      </div>
    );
  if (!shops) return <div className="p-6 text-center text-muted">…</div>;
  const shop = shops.find((s) => s.id === current) ?? shops[0];
  if (!shop || adding) return <Setup session={session} onDone={pick} onCancel={shop ? () => setAdding(false) : undefined} />;
  return <ShopApp key={shop.id} session={session} shopId={shop.id} shops={shops} onPick={pick} onAdd={() => setAdding(true)} />;
}

function Setup({ session, onDone, onCancel }: { session: Owner; onDone: (id: string) => void; onCancel?: () => void }) {
  const { t, toggle } = useT();
  const { busy, run } = useRun();
  const [f, setF] = useState({ name: "", phone: "", upi: "", address: "" });
  const [old, setOld] = useState<Awaited<ReturnType<typeof findOldShops>> | null>(null);
  useEffect(() => {
    findOldShops(session.uid).then(setOld, () => setOld([]));
  }, [session.uid]);
  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stamp">{t("setupTitle")}</h1>
        <button className="text-xs text-muted" onClick={toggle}>
          {t("language")}
        </button>
      </div>
      {!!old?.length && (
        <Card className="space-y-2">
          <h2 className="font-bold">{t("importOld")}</h2>
          {old.map((o) => (
            <Button
              key={o.id}
              tone="soft"
              className="w-full"
              disabled={busy}
              onClick={() => void run(async () => onDone(await importOldShop(session.uid, o)), t("imported"))}
            >
              {busy ? t("importing") : `${o.blob.shop?.name ?? o.id} (${o.blob.customers?.length ?? 0} ${t("customers")})`}
            </Button>
          ))}
        </Card>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => onDone(await createShop(session.uid, f)));
        }}
      >
        <Field label={t("shopName")} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label={t("phone")} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Field label={t("upiId")} placeholder="shop@upi" value={f.upi} onChange={(e) => setF({ ...f, upi: e.target.value })} />
        <Field label={t("address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <Button className="w-full" disabled={busy || !f.name.trim()} type="submit">
          {t("createShop")}
        </Button>
      </form>
      <div className="flex justify-between text-sm text-muted">
        {onCancel ? <button onClick={onCancel}>{t("cancel")}</button> : <span />}
        <button onClick={() => void logout()}>{t("signOut")}</button>
      </div>
    </main>
  );
}

function ShopApp({ session, shopId, shops, onPick, onAdd }: { session: Owner; shopId: string; shops: Shop[]; onPick: (id: string) => void; onAdd: () => void }) {
  const { t } = useT();
  const d = useShopData(shopId);
  const [tab, setTab] = useState<Tab>("home");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  if (!d.shop) return <div className="p-6 text-center text-muted">{d.error || "…"}</div>;
  const shop = d.shop;
  const pendingCount = d.orders.filter((o) => o.status === "placed").length;
  return (
    <div className="min-h-dvh pb-24">
      <TopBar title={shop.name} sub={`${t("shopId")}: ${shop.code}`} right={<Bell shopId={shop.id} notices={d.notices} />} />
      <main className="mx-auto max-w-lg space-y-4 p-4">
        {d.error && <p className="rounded-xl bg-due-bg p-3 text-sm text-due">{d.error}</p>}
        {tab === "home" && <Home d={d} shop={shop} onCustomer={setOpenCustomer} />}
        {tab === "customers" && <Customers d={d} shop={shop} onOpen={setOpenCustomer} />}
        {tab === "items" && <Items shop={shop} items={d.items} />}
        {tab === "shop" && <ShopSettings session={session} shop={shop} shops={shops} onPick={onPick} onAdd={onAdd} />}
      </main>
      <Dock<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "home", label: t("home"), badge: pendingCount },
          { id: "customers", label: t("customers") },
          { id: "items", label: t("items") },
          { id: "shop", label: t("more") },
        ]}
      />
      {openCustomer && <CustomerSheet d={d} shop={shop} id={openCustomer} onClose={() => setOpenCustomer(null)} />}
    </div>
  );
}

function Home({ d, shop, onCustomer }: { d: ShopData; shop: Shop; onCustomer: (id: string) => void }) {
  const { t } = useT();
  const today = dayKey(Date.now());
  const todays = d.orders.filter((o) => dayKey(o.createdAt) === today && o.status !== "cancelled");
  const dues = useMemo(() => d.customers.map((c) => ({ c, due: balanceOf(c.id, d.orders, d.payments) })), [d]);
  const totalDue = dues.reduce((s, x) => s + Math.max(x.due, 0), 0);
  const todo = d.orders.filter((o) => o.status === "placed" || o.status === "accepted");
  const recent = d.orders.filter((o) => o.status === "delivered" || o.status === "cancelled").slice(0, 8);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("todayOrders")} value={todays.length} />
        <Stat label={t("totalDues")} value={<span className="text-lg">{inr(totalDue)}</span>} tone="due" />
        <Stat label={t("customers")} value={d.customers.length} />
      </div>
      <p className="text-center text-xs text-muted">
        {t("today")}: {inr(todays.reduce((s, o) => s + o.total, 0))}
      </p>
      <section className="space-y-2">
        <h2 className="font-bold">{t("pending")}</h2>
        {!todo.length && <Empty>{t("noOrders")}</Empty>}
        {todo.map((o) => (
          <OrderRow key={o.id} shop={shop} order={o} onCustomer={onCustomer} />
        ))}
      </section>
      {!!recent.length && (
        <section className="space-y-2">
          <h2 className="font-bold">{t("orders")}</h2>
          {recent.map((o) => (
            <OrderRow key={o.id} shop={shop} order={o} onCustomer={onCustomer} />
          ))}
        </section>
      )}
    </>
  );
}

function OrderRow({ shop, order: o, onCustomer }: { shop: Shop; order: Order; onCustomer?: (id: string) => void }) {
  const { t } = useT();
  const { busy, run } = useRun();
  const set = (s: Order["status"]) => void run(() => setOrderStatus(shop.id, o, s, "owner"));
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <button className="truncate text-left font-semibold" onClick={() => onCustomer?.(o.customerId)}>
          {o.customerName}
        </button>
        <span className="font-bold">{inr(o.total)}</span>
      </div>
      <div className="mt-1 text-sm text-muted">{o.lines.map((l) => `${l.name} × ${l.qty}`).join(", ")}</div>
      {o.note && <div className="text-sm italic text-muted">{o.note}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusPill status={o.status} />
        <span className="text-xs text-muted">{when(o.createdAt)}</span>
        <span className="flex-1" />
        {o.status === "placed" && (
          <Button tone="soft" disabled={busy} onClick={() => set("accepted")}>
            {t("accept")}
          </Button>
        )}
        {(o.status === "placed" || o.status === "accepted") && (
          <>
            <Button disabled={busy} onClick={() => set("delivered")}>
              {t("deliver")}
            </Button>
            <Button tone="danger" disabled={busy} onClick={() => set("cancelled")}>
              ✕
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function Customers({ d, shop, onOpen }: { d: ShopData; shop: Shop; onOpen: (id: string) => void }) {
  const { t } = useT();
  const { busy, run } = useRun();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", phone: "" });
  const rows = d.customers
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q))
    .map((c) => ({ c, due: balanceOf(c.id, d.orders, d.payments) }));
  return (
    <>
      <div className="flex gap-2">
        <Field className="flex-1" label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button className="self-end" onClick={() => setAdding(true)}>
          + {t("addCustomer")}
        </Button>
      </div>
      {!d.customers.length && <Empty>{t("noCustomers")}</Empty>}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {rows.map(({ c, due }) => (
          <li key={c.id}>
            <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => onOpen(c.id)}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">
                  {c.phone} {c.username && `· @${c.username}`}
                </span>
              </span>
              <Due amount={due} />
            </button>
          </li>
        ))}
      </ul>
      {adding && (
        <Sheet title={t("addCustomer")} onClose={() => setAdding(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const id = await saveCustomer(shop.id, f);
                setF({ name: "", phone: "" });
                setAdding(false);
                onOpen(id);
              });
            }}
          >
            <Field label={t("name")} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Field label={t("phone")} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <Button className="w-full" disabled={busy || !f.name.trim()} type="submit">
              {t("save")}
            </Button>
          </form>
        </Sheet>
      )}
    </>
  );
}

function CustomerSheet({ d, shop, id, onClose }: { d: ShopData; shop: Shop; id: string; onClose: () => void }) {
  const { t } = useT();
  const { busy, run } = useRun();
  const c = d.customers.find((x) => x.id === id);
  const [mode, setMode] = useState<"main" | "order" | "pay" | "login" | "edit">("main");
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [login, setLogin] = useState({ username: "", pin: "" });
  const [made, setMade] = useState<{ username: string; pin: string } | null>(null);
  const [edit, setEdit] = useState({ name: "", phone: "", note: "" });
  if (!c) return null;
  const due = balanceOf(c.id, d.orders, d.payments);
  const orders = d.orders.filter((o) => o.customerId === c.id);
  const pays = d.payments.filter((p) => p.customerId === c.id);
  const suggestUser = c.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "customer";
  const randomPin = () => String(Math.floor(100000 + Math.random() * 900000));

  return (
    <Sheet title={c.name} onClose={onClose}>
      {mode === "main" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-paid-bg/50 p-4 text-center">
            <div className="text-xs text-muted">{t("due")}</div>
            <div className="text-3xl">
              <Due amount={due} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setMode("order")}>{t("newOrder")}</Button>
            <Button
              tone="soft"
              onClick={() => {
                setAmt(due > 0 ? String(due) : "");
                setMode("pay");
              }}
            >
              {t("recordPayment")}
            </Button>
            <Button
              tone="ghost"
              onClick={() => {
                setLogin({ username: c.username || suggestUser, pin: randomPin() });
                setMade(null);
                setMode("login");
              }}
            >
              {c.memberUid ? t("resetPin") : t("setLogin")}
            </Button>
            <Button
              tone="ghost"
              onClick={() => {
                setEdit({ name: c.name, phone: c.phone, note: c.note });
                setMode("edit");
              }}
            >
              ✎ {t("name")}
            </Button>
          </div>
          {c.memberUid && (
            <p className="text-center text-xs text-muted">
              {t("login")}: {t("shopId")} <b>{shop.code}</b> · {t("username")} <b>{c.username}</b>
            </p>
          )}
          <Bill customerId={c.id} name={c.name} phone={c.phone} shop={shop} orders={d.orders} payments={d.payments} />
          <h3 className="font-bold">{t("history")}</h3>
          <ul className="space-y-1 text-sm">
            {[
              ...orders.map((o) => ({ at: o.createdAt, key: "o" + o.id, text: o.lines.map((l) => `${l.name}×${l.qty}`).join(", "), amt: o.total, o })),
              ...pays.map((p) => ({ at: p.createdAt, key: "p" + p.id, text: `${t("paid")} (${t(p.method)})`, amt: -p.amount, o: null })),
            ]
              .sort((a, b) => b.at - a.at)
              .slice(0, 60)
              .map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-2 border-b border-line py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{r.text}</span>
                    <span className="text-xs text-muted">
                      {when(r.at)} {r.o && <StatusPill status={r.o.status} />}
                    </span>
                  </span>
                  <span className={r.amt < 0 ? "font-semibold text-paid" : "font-semibold"}>{r.amt < 0 ? `−${inr(-r.amt)}` : inr(r.amt)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
      {mode === "order" && (
        <OrderPad
          items={d.items}
          allowCustom
          busy={busy}
          onSubmit={(lines, note) => void run(() => placeOrder(shop.id, "owner", c, lines, note), t("saved")).then((ok) => ok && setMode("main"))}
        />
      )}
      {mode === "pay" && (
        <div className="space-y-3">
          <Field label={t("amount")} inputMode="decimal" autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(["cash", "upi", "bank"] as const).map((m) => (
              <Button key={m} tone={method === m ? "primary" : "ghost"} onClick={() => setMethod(m)}>
                {t(m)}
              </Button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={busy || !(Number(amt) > 0)}
            onClick={() => void run(() => recordPayment(shop.id, c, Number(amt), method), t("saved")).then((ok) => ok && setMode("main"))}
          >
            {t("recordPayment")}
          </Button>
          <Button tone="ghost" className="w-full" onClick={() => setMode("main")}>
            {t("cancel")}
          </Button>
        </div>
      )}
      {mode === "login" &&
        (made ? (
          <div className="space-y-3 text-center">
            <p className="font-semibold text-paid">{t("loginReady")}</p>
            <div className="rounded-2xl bg-paid-bg p-4 text-left text-lg">
              <div>
                {t("shopId")}: <b>{shop.code}</b>
              </div>
              <div>
                {t("username")}: <b>{made.username}</b>
              </div>
              <div>
                {t("pin")}: <b>{made.pin}</b>
              </div>
            </div>
            {c.phone && (
              <a
                className="block font-semibold text-stamp underline"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${c.phone.replace(/\D/g, "").length === 10 ? "91" : ""}${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `${shop.name} – Go Service login\n${location.origin}/?shop=${shop.code}\nShop ID: ${shop.code}\nUsername: ${made.username}\nPIN: ${made.pin}`,
                )}`}
              >
                {t("shareBill")}
              </a>
            )}
            <Button className="w-full" onClick={() => setMode("main")}>
              {t("close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t("username")} autoCapitalize="none" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
            <Field label={t("pin")} inputMode="numeric" value={login.pin} onChange={(e) => setLogin({ ...login, pin: e.target.value })} />
            <Button
              className="w-full"
              disabled={busy || login.pin.length < 6}
              onClick={() =>
                void run(() => setCustomerLogin(shop, c, login.username, login.pin)).then(
                  (ok) => ok && setMade({ username: login.username.toLowerCase().replace(/[^a-z0-9]/g, ""), pin: login.pin }),
                )
              }
            >
              {t("save")}
            </Button>
            <Button tone="ghost" className="w-full" onClick={() => setMode("main")}>
              {t("cancel")}
            </Button>
          </div>
        ))}
      {mode === "edit" && (
        <div className="space-y-3">
          <Field label={t("name")} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <Field label={t("phone")} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
          <Field label={t("note")} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          <Button
            className="w-full"
            disabled={busy || !edit.name.trim()}
            onClick={() => void run(() => saveCustomer(shop.id, { ...c, ...edit }), t("saved")).then((ok) => ok && setMode("main"))}
          >
            {t("save")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Items({ shop, items }: { shop: Shop; items: Item[] }) {
  const { t } = useT();
  const { busy, run } = useRun();
  const [edit, setEdit] = useState<(Omit<Item, "id" | "price"> & { id?: string; price: string }) | null>(null);
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <Button className="w-full" onClick={() => setEdit({ name: "", unit: "", price: "", active: true })}>
        + {t("addItem")}
      </Button>
      {!items.length && <Empty>{t("noItems")}</Empty>}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {sorted.map((i) => (
          <li key={i.id}>
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setEdit({ ...i, price: String(i.price) })}>
              <span className={i.active ? "font-semibold" : "text-muted line-through"}>{i.name}</span>
              <span>
                {inr(i.price)}
                {i.unit && <span className="text-xs text-muted"> / {i.unit}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {edit && (
        <Sheet title={edit.id ? edit.name : t("addItem")} onClose={() => setEdit(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => saveItem(shop.id, { ...edit, price: Number(edit.price) || 0 }), t("saved")).then((ok) => ok && setEdit(null));
            }}
          >
            <Field label={t("name")} required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("price")} inputMode="decimal" required value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              <Field label={t("unit")} placeholder="kg / pc" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              {t("active")}
            </label>
            <Button className="w-full" disabled={busy} type="submit">
              {t("save")}
            </Button>
          </form>
        </Sheet>
      )}
    </>
  );
}

function ShopSettings({ session, shop, shops, onPick, onAdd }: { session: Owner; shop: Shop; shops: Shop[]; onPick: (id: string) => void; onAdd: () => void }) {
  const { t, toggle } = useT();
  const { busy, run } = useRun();
  const [f, setF] = useState({ name: shop.name, phone: shop.phone, upi: shop.upi, address: shop.address });
  const link = `${location.origin}/?shop=${shop.code}`;
  return (
    <>
      <Card className="space-y-2 text-center">
        <div className="text-xs text-muted">{t("shopId")}</div>
        <div className="font-mono text-3xl font-bold tracking-widest text-stamp">{shop.code}</div>
        <div className="break-all text-xs text-muted">{link}</div>
      </Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => updateShop(shop.id, f), t("saved"));
        }}
      >
        <h2 className="font-bold">{t("shopSettings")}</h2>
        <Field label={t("shopName")} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label={t("phone")} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Field label={t("upiId")} value={f.upi} onChange={(e) => setF({ ...f, upi: e.target.value })} />
        <Field label={t("address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <Button className="w-full" disabled={busy} type="submit">
          {t("save")}
        </Button>
      </form>
      <Card className="space-y-2">
        <h2 className="font-bold">{t("myShops")}</h2>
        {shops.map((s) => (
          <Button key={s.id} tone={s.id === shop.id ? "soft" : "ghost"} className="w-full justify-between" onClick={() => onPick(s.id)}>
            <span>{s.name}</span>
            <span className="font-mono text-xs">{s.code}</span>
          </Button>
        ))}
        <Button tone="ghost" className="w-full" onClick={onAdd}>
          + {t("addShop")} / {t("importOld")}
        </Button>
      </Card>
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="truncate">{session.email}</span>
        <button className="underline" onClick={toggle}>
          {t("language")}
        </button>
        <button className="underline" onClick={() => void logout()}>
          {t("signOut")}
        </button>
      </div>
    </>
  );
}
