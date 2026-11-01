import type { Order, OrderLine, Payment } from "./types";

export const MEMBER_DOMAIN = "m.goservice.online";

export function inr(n: number) {
  const v = Math.round(n * 100) / 100;
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(ms: number) {
  return dayKey(ms).slice(0, 7);
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function linesTotal(lines: OrderLine[]) {
  return Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
}

/** Amount the customer owes: all non-cancelled orders minus all payments. */
export function balanceOf(customerId: string, orders: Order[], payments: Payment[]) {
  const sales = orders
    .filter((o) => o.customerId === customerId && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const paid = payments.filter((p) => p.customerId === customerId).reduce((s, p) => s + p.amount, 0);
  return Math.round((sales - paid) * 100) / 100;
}

/** Monthly statement: opening due, this month's sales and payments, closing due. */
export function billFor(customerId: string, month: string, orders: Order[], payments: Payment[]) {
  const mine = orders.filter((o) => o.customerId === customerId && o.status !== "cancelled");
  const pays = payments.filter((p) => p.customerId === customerId);
  const before = (ms: number) => monthKey(ms) < month;
  const inM = (ms: number) => monthKey(ms) === month;
  const opening =
    mine.filter((o) => before(o.createdAt)).reduce((s, o) => s + o.total, 0) -
    pays.filter((p) => before(p.createdAt)).reduce((s, p) => s + p.amount, 0);
  const monthOrders = mine.filter((o) => inM(o.createdAt));
  const monthPays = pays.filter((p) => inM(p.createdAt));
  const sales = monthOrders.reduce((s, o) => s + o.total, 0);
  const paid = monthPays.reduce((s, p) => s + p.amount, 0);
  return { opening, sales, paid, closing: opening + sales - paid, orders: monthOrders, payments: monthPays };
}

export function upiUrl(upi: string, payee: string, amount: number, note = "Go Service") {
  const q = [`pa=${upi.trim()}`, `pn=${encodeURIComponent(payee)}`, "cu=INR", `tn=${encodeURIComponent(note)}`];
  if (amount > 0) q.push(`am=${amount.toFixed(2)}`);
  return `upi://pay?${q.join("&")}`;
}

export function normCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function newCode(rand: () => number = Math.random) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}

/** Synthetic Firebase email for a customer login. `v` bumps when the owner resets the PIN. */
export function loginEmail(code: string, username: string, v: number) {
  return `${normUsername(username)}.${v}.${normCode(code).toLowerCase()}@${MEMBER_DOMAIN}`;
}

export function isMemberEmail(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith("@" + MEMBER_DOMAIN);
}

export function whatsappUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const to = digits.length === 10 ? "91" + digits : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
