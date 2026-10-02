import type {
  Customer,
  Item,
  Order,
  OrderLine,
  OrderStatus,
  Payment,
  Shop,
  ShopBlob,
  ShopKind,
} from "./types";

export function todayISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shiftISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

export function monthKey(iso = todayISO()) {
  return iso.slice(0, 7);
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1 + delta, 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}`;
}

const ML_MONTHS = [
  "ജനുവരി",
  "ഫെബ്രുവരി",
  "മാർച്ച്",
  "ഏപ്രിൽ",
  "മേയ്",
  "ജൂൺ",
  "ജൂലൈ",
  "ഓഗസ്റ്റ്",
  "സെപ്റ്റംബർ",
  "ഒക്ടോബർ",
  "നവംബർ",
  "ഡിസംബർ",
];

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${ML_MONTHS[(m ?? 1) - 1] ?? ""} ${y ?? ""}`;
}

export function inr(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
  }).format(v);
}

export function qtyText(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function orderTotal(order: { lines: OrderLine[] }) {
  return order.lines.reduce((s, l) => s + l.qty * l.price, 0);
}

export const SERVICES: { id: ShopKind; label: string }[] = [
  { id: "bakery", label: "ബേക്കറി" },
  { id: "stationery", label: "സ്റ്റേഷനറി" },
  { id: "kirana", label: "കിരാണ" },
  { id: "wholesale", label: "ഹോൾസെയിൽ" },
  { id: "steel", label: "സ്റ്റീൽ" },
  { id: "paint", label: "പെയിന്റ്" },
  { id: "hotel", label: "ഹോട്ടൽ" },
  { id: "medical", label: "മെഡിക്കൽ" },
  { id: "textile", label: "ടെക്സ്റ്റൈൽ" },
  { id: "electronics", label: "ഇലക്ട്രോണിക്സ്" },
  { id: "rice", label: "അരി" },
  { id: "newspaper", label: "പത്രം" },
  { id: "milk", label: "പാൽ" },
  { id: "water", label: "വെള്ളം" },
  { id: "vegetable", label: "പച്ചക്കറി" },
  { id: "farm", label: "ഫാം" },
  { id: "house", label: "വീട്" },
  { id: "help", label: "വീട്ടുജോലി" },
  { id: "tuition", label: "ട്യൂഷൻ" },
  { id: "laundry", label: "അലക്ക്" },
  { id: "custom", label: "മറ്റൊന്ന്" },
];

export function kindLabel(kind: ShopKind) {
  return SERVICES.find((s) => s.id === kind)?.label ?? "മറ്റ് സർവീസ്";
}

export function shopService(shop: { kind: ShopKind; serviceName?: string }) {
  if (shop.kind === "custom") return shop.serviceName?.trim() || "മറ്റ് സർവീസ്";
  return kindLabel(shop.kind);
}

export function statusLabel(s: OrderStatus) {
  if (s === "pending") return "പുതിയത്";
  if (s === "packed") return "പാക്ക്";
  if (s === "out") return "വഴിയിൽ";
  if (s === "delivered") return "എത്തി";
  return "റദ്ദ്";
}

export function methodLabel(m: Payment["method"]) {
  if (m === "cash") return "ക്യാഷ്";
  if (m === "upi") return "UPI";
  return "ബാങ്ക്";
}

export function shopCode(existing: string[]) {
  const used = new Set(existing);
  for (let i = 0; i < 30; i++) {
    const code = "GO" + String(Math.floor(1000 + Math.random() * 9000));
    if (!used.has(code)) return code;
  }
  return "GO" + String(Date.now()).slice(-4);
}

export function phonesMatch(a: string, b: string) {
  const d = (s: string) => s.replace(/\D/g, "").slice(-10);
  const left = d(a);
  const right = d(b);
  return left.length === 10 && left === right;
}

export function billFor(
  customerId: string,
  month: string,
  orders: Order[],
  payments: Payment[],
) {
  const mine = orders.filter((o) => o.customerId === customerId && o.status !== "cancelled");
  const creditBefore = mine
    .filter((o) => o.mode === "credit" && o.date.slice(0, 7) < month)
    .reduce((s, o) => s + orderTotal(o), 0);
  const paidBefore = payments
    .filter((p) => p.customerId === customerId && p.date.slice(0, 7) < month)
    .reduce((s, p) => s + p.amount, 0);
  const opening = creditBefore - paidBefore;
  const sales = mine
    .filter((o) => o.mode === "credit" && o.date.slice(0, 7) === month)
    .reduce((s, o) => s + orderTotal(o), 0);
  const cash = mine
    .filter((o) => o.mode === "cash" && o.date.slice(0, 7) === month)
    .reduce((s, o) => s + orderTotal(o), 0);
  const collected = payments
    .filter((p) => p.customerId === customerId && p.date.slice(0, 7) === month)
    .reduce((s, p) => s + p.amount, 0);
  return { opening, sales, cash, collected, due: opening + sales - collected };
}

export function balance(customerId: string, orders: Order[], payments: Payment[]) {
  const sales = orders
    .filter((o) => o.customerId === customerId && o.mode === "credit" && o.status !== "cancelled")
    .reduce((s, o) => s + orderTotal(o), 0);
  const paid = payments.filter((p) => p.customerId === customerId).reduce((s, p) => s + p.amount, 0);
  return sales - paid;
}

export function applyStock(items: Item[], lines: OrderLine[], dir: 1 | -1): Item[] {
  const map = new Map(lines.map((l) => [l.itemId, l.qty]));
  return items.map((it) => {
    const q = map.get(it.id);
    if (q == null) return it;
    return { ...it, stock: Math.round((it.stock - dir * q) * 100) / 100 };
  });
}

export async function passHash(password: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function memberEmail(username: string) {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${slug}@members.go1729.app`;
}

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function nextShopMemberNo(customers: { username?: string }[]) {
  const nums = customers.map((c) => Number(c.username)).filter((n) => Number.isInteger(n) && n > 0);
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

export function memberLoginId(shopCode: string, username: string) {
  return `${shopCode.trim().toUpperCase()}-${username.trim()}`;
}

export function emptyBlob(shop: Shop, ownerUid: string): ShopBlob {
  return { shop, ownerUid, items: [], customers: [], orders: [], payments: [], rev: 1 };
}

export function recipeUpsertItem(b: ShopBlob, item: Item): ShopBlob {
  const exists = b.items.some((i) => i.id === item.id);
  return {
    ...b,
    rev: b.rev + 1,
    items: exists ? b.items.map((i) => (i.id === item.id ? item : i)) : [item, ...b.items],
  };
}

export function recipeUpsertCustomer(b: ShopBlob, customer: Customer): ShopBlob {
  const username = customer.username?.trim().toLowerCase() || undefined;
  if (username && b.customers.some((c) => c.id !== customer.id && (c.username || "").toLowerCase() === username)) {
    throw new Error("@userTaken");
  }
  const exists = b.customers.some((c) => c.id === customer.id);
  const next: Customer = { ...customer, username };
  return {
    ...b,
    rev: b.rev + 1,
    customers: exists
      ? b.customers.map((c) =>
          c.id === customer.id
            ? {
                ...c,
                ...next,
                username: username || c.username,
                passHash: next.passHash || c.passHash,
                memberUid: next.memberUid || c.memberUid,
                linkedUid: c.linkedUid,
              }
            : c,
        )
      : [next, ...b.customers],
  };
}

export function recipePlaceOrder(b: ShopBlob, order: Order): ShopBlob {
  return {
    ...b,
    rev: b.rev + 1,
    orders: [order, ...b.orders],
    items: applyStock(b.items, order.lines, 1),
  };
}

export function recipeStatus(b: ShopBlob, orderId: string, status: OrderStatus): ShopBlob {
  const prev = b.orders.find((o) => o.id === orderId);
  if (!prev || prev.status === status) return b;
  let items = b.items;
  if (prev.status !== "cancelled" && status === "cancelled") items = applyStock(items, prev.lines, -1);
  if (prev.status === "cancelled" && status !== "cancelled") items = applyStock(items, prev.lines, 1);
  return {
    ...b,
    rev: b.rev + 1,
    items,
    orders: b.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
  };
}

export function recipePayment(b: ShopBlob, payment: Payment): ShopBlob {
  return { ...b, rev: b.rev + 1, payments: [payment, ...b.payments] };
}

export function recipeLink(b: ShopBlob, customerId: string, linkedUid: string, phone: string): ShopBlob {
  const customer = b.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error("@customerMissing");
  if (!phonesMatch(customer.phone, phone)) throw new Error("@phoneMismatch");
  if (customer.linkedUid && customer.linkedUid !== linkedUid) throw new Error("@nameLinked");
  return {
    ...b,
    rev: b.rev + 1,
    customers: b.customers.map((c) => (c.id === customerId ? { ...c, linkedUid } : c)),
  };
}
