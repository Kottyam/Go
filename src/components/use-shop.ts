import { useEffect, useState } from "react";
import { watchCustomerData, watchOwnerData, watchShop } from "@/lib/go/data";
import type { Customer, Item, Notice, Order, Payment, Shop } from "@/lib/go/types";

export type ShopData = {
  shop: Shop | null;
  customers: Customer[];
  items: Item[];
  orders: Order[];
  payments: Payment[];
  notices: Notice[];
  error: string;
  ready: boolean;
};

const empty: ShopData = { shop: null, customers: [], items: [], orders: [], payments: [], notices: [], error: "", ready: false };
const byNew = <T extends { createdAt: number }>(r: T[]) => [...r].sort((a, b) => b.createdAt - a.createdAt);

export function useShopData(shopId: string | null, customerId?: string): ShopData {
  const [d, setD] = useState<ShopData>(empty);
  useEffect(() => {
    if (!shopId) return;
    setD(empty);
    const err = (e: Error) => setD((s) => ({ ...s, error: e.message }));
    const off1 = watchShop(shopId, (shop) => setD((s) => ({ ...s, shop, ready: true })), err);
    const w = {
      customers: (customers: Customer[]) => setD((s) => ({ ...s, customers: [...customers].sort((a, b) => a.name.localeCompare(b.name)) })),
      items: (items: Item[]) => setD((s) => ({ ...s, items })),
      orders: (orders: Order[]) => setD((s) => ({ ...s, orders: byNew(orders) })),
      payments: (payments: Payment[]) => setD((s) => ({ ...s, payments: byNew(payments) })),
      notices: (notices: Notice[]) => setD((s) => ({ ...s, notices: byNew(notices) })),
      error: err,
    };
    const off2 = customerId ? watchCustomerData(shopId, customerId, w) : watchOwnerData(shopId, w);
    return () => {
      off1();
      off2();
    };
  }, [shopId, customerId]);
  return d;
}
