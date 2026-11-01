import { useState } from "react";
import { changeOwnPin, logout, placeOrder, setOrderStatus, tellOwnerPaid } from "@/lib/go/data";
import { balanceOf, inr, upiUrl } from "@/lib/go/logic";
import { useT } from "@/lib/go/i18n";
import type { Session } from "@/lib/go/types";
import { useShopData } from "./use-shop";
import { OrderPad } from "./order-pad";
import { Bell } from "./notices";
import { Bill } from "./bill";
import { Button, Card, Dock, Due, Empty, Field, Sheet, StatusPill, TopBar, errText, useToast, when } from "./ui";

type Tab = "home" | "order" | "history";

export function CustomerApp({ session }: { session: Extract<Session, { kind: "customer" }> }) {
  const { t, toggle } = useT();
  const toast = useToast();
  const d = useShopData(session.shopId, session.customerId);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [payAmt, setPayAmt] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const me = d.customers[0];
  const due = balanceOf(session.customerId, d.orders, d.payments);

  if (d.error && !me)
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6 text-center">
        <p className="text-due">{d.error}</p>
        <Button onClick={() => void logout()}>{t("signOut")}</Button>
      </div>
    );
  if (!d.ready || !me || !d.shop) return <div className="p-6 text-center text-muted">…</div>;
  const shop = d.shop;
  const amount = Number(payAmt) || Math.max(due, 0);

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

  return (
    <div className="min-h-dvh pb-24">
      <TopBar
        title={shop.name}
        sub={me.name}
        right={
          <>
            <Bell shopId={shop.id} notices={d.notices} />
            <button className="rounded-lg px-2 py-1 text-xs text-muted" onClick={toggle}>
              {t("language")}
            </button>
          </>
        }
      />
      <main className="mx-auto max-w-lg space-y-4 p-4">
        {tab === "home" && (
          <>
            <Card className="text-center">
              <div className="text-sm text-muted">{t("balance")}</div>
              <div className="mt-1 text-4xl">
                <Due amount={due} />
              </div>
            </Card>
            <Card className="space-y-3">
              <h2 className="font-bold">{t("pay")}</h2>
              {shop.upi ? (
                <>
                  <Field label={t("amount")} inputMode="decimal" placeholder={String(Math.max(due, 0))} value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                  <a
                    className="flex min-h-11 w-full items-center justify-center rounded-xl bg-stamp font-semibold text-white"
                    href={upiUrl(shop.upi, shop.name, amount, `Go Service ${me.name}`)}
                  >
                    {t("payUpi")} · {inr(amount)}
                  </a>
                  <p className="text-center text-xs text-muted">UPI: {shop.upi}</p>
                  <Button
                    tone="soft"
                    className="w-full"
                    disabled={busy || amount <= 0}
                    onClick={() => void run(() => tellOwnerPaid(shop.id, me, amount), t("toldOwner"))}
                  >
                    {t("iPaid")}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted">{t("noUpi")}</p>
              )}
            </Card>
            <Button className="w-full" onClick={() => setTab("order")}>
              {t("newOrder")}
            </Button>
            <div className="flex justify-between text-sm">
              <button className="text-muted underline" onClick={() => setPinOpen(true)}>
                {t("changePin")}
              </button>
              <button className="text-muted underline" onClick={() => void logout()}>
                {t("signOut")}
              </button>
            </div>
          </>
        )}
        {tab === "order" && (
          <OrderPad
            key={padKey}
            items={d.items}
            busy={busy}
            onSubmit={(lines, note) =>
              void run(() => placeOrder(shop.id, "customer", me, lines, note), t("placed")).then((ok) => {
                if (ok) {
                  setPadKey((k) => k + 1);
                  setTab("history");
                }
              })
            }
          />
        )}
        {tab === "history" && (
          <>
            {!d.orders.length && !d.payments.length && <Empty>{t("noOrders")}</Empty>}
            <ul className="space-y-2">
              {d.orders.map((o) => (
                <li key={o.id}>
                  <Card>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{inr(o.total)}</span>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="mt-1 text-sm text-muted">{o.lines.map((l) => `${l.name} × ${l.qty}`).join(", ")}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{when(o.createdAt)}</span>
                      {o.status === "placed" && (
                        <button className="font-semibold text-due" onClick={() => void run(() => setOrderStatus(shop.id, o, "cancelled", "customer"))}>
                          {t("cancelOrder")}
                        </button>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <Bill customerId={me.id} name={me.name} shop={shop} orders={d.orders} payments={d.payments} />
          </>
        )}
      </main>
      <Dock<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "home", label: t("home") },
          { id: "order", label: t("order") },
          { id: "history", label: t("history") },
        ]}
      />
      {pinOpen && <PinSheet onClose={() => setPinOpen(false)} />}
    </div>
  );
}

function PinSheet({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [pin, setPin] = useState("");
  return (
    <Sheet title={t("changePin")} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t("newPin")} type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
        <Button
          className="w-full"
          disabled={pin.length < 6}
          onClick={() =>
            void changeOwnPin(pin)
              .then(() => {
                toast(t("saved"));
                onClose();
              })
              .catch((e) => toast(errText(e), true))
          }
        >
          {t("save")}
        </Button>
      </div>
    </Sheet>
  );
}
