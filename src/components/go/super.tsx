import { LogOut, Plus } from "lucide-react";
import { serviceText, useI18n } from "@/lib/go/i18n";
import { useState } from "react";
import { useGo } from "@/lib/go/store";
import { NotificationBell } from "./notifications";
import { Btn, Field, Select, TextInput } from "./ui";

export function SuperApp() {
  const go = useGo();
  const { lang, t } = useI18n();
  const owners = go.directory?.owners ?? [];
  const shops = go.directory?.shops ?? [];
  const totalCustomers = shops.reduce((n, b) => n + b.customers.length, 0);
  const totalOrders = shops.reduce((n, b) => n + b.orders.length, 0);
  const totalCollected = shops.reduce((n, b) => n + b.payments.reduce((s, p) => s + p.amount, 0), 0);
  const [shopName, setShopName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [work, setWork] = useState<"order" | "fixed" | "daily">("order");
  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-3xl overflow-x-hidden">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t.superTitle}</p>
          <p className="truncate text-xs text-muted">{t.superLead}</p>
        </div>
        <NotificationBell />
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => void go.signOut()} aria-label={t.out}>
          <LogOut size={18} />
        </button>
      </header>
      <div className="grid gap-3 px-4 py-4">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="sheet p-3"><p className="text-xs text-muted">Businesses</p><p className="text-2xl font-semibold">{shops.length}</p></div>
          <div className="sheet p-3"><p className="text-xs text-muted">Customers</p><p className="text-2xl font-semibold">{totalCustomers}</p></div>
          <div className="sheet p-3"><p className="text-xs text-muted">Orders</p><p className="text-2xl font-semibold">{totalOrders}</p></div>
          <div className="sheet p-3"><p className="text-xs text-muted">Collections</p><p className="text-lg font-semibold">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(totalCollected)}</p></div>
        </section>
        <section className="sheet grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <Plus size={17} />
            <h2 className="font-semibold">Add shop</h2>
          </div>
          <Field label="Shop name">
            <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Example shop" />
          </Field>
          <Field label="Service">
            <TextInput value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Canteen, bakery, water supply..." />
          </Field>
          <Field label="Billing mode">
            <Select value={work} onChange={(e) => setWork(e.target.value as "order" | "fixed" | "daily")}>
              <option value="order">Booked delivery</option>
              <option value="fixed">Month pass</option>
              <option value="daily">Comes daily</option>
            </Select>
          </Field>
          <Btn
            tone="stamp"
            disabled={!shopName.trim() || !serviceName.trim() || go.busy}
            onClick={() => {
              void go.addShopAsSuper({
                name: shopName.trim(),
                kind: "custom",
                serviceName: serviceName.trim(),
                work,
                phone: "",
                address: "",
                upi: "",
              });
              setShopName("");
              setServiceName("");
            }}
          >
            Create shop
          </Btn>
        </section>
        {owners.length === 0 && <p className="text-sm text-muted">{t.noPeople}</p>
        {owners.map((owner) => {
          const mine = shops.filter((s) => owner.shopIds.includes(s.shop.id) || s.ownerUid === owner.id);
          return (
            <section key={owner.id} className="sheet grid gap-3 p-4">
              <div>
                <p className="text-lg font-semibold">{owner.name || owner.email || owner.id}</p>
                <p className="break-all text-sm text-muted">{owner.email}</p>
                <p className="break-all text-xs text-muted">
                  {t.googleId}: {owner.id}
                </p>
              </div>
              {mine.map((blob) => (
                <div key={blob.shop.id} className="grid gap-2 rounded-xl border border-line p-3">
                  <p className="font-medium">{blob.shop.name}</p>
                  <p className="text-sm text-muted">
                    {serviceText(lang, blob.shop)} · {blob.shop.code} · {blob.customers.length}
                  </p>
                  <Btn tone="ghost" disabled={go.busy} onClick={() => void go.removeOwnedShop(owner.id, blob.shop.id, blob.shop.code)}>
                    {t.deleteForever}
                  </Btn>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
