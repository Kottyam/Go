import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceOf, billFor, linesTotal, loginEmail, newCode, normCode, shiftMonth, upiUrl } from "./logic.ts";
import type { Order, Payment } from "./types.ts";

const o = (id: string, cid: string, total: number, at: string, status: Order["status"] = "delivered"): Order => ({
  id, customerId: cid, customerName: cid, lines: [], total, status, by: "owner", note: "",
  createdAt: new Date(at).getTime(), updatedAt: 0,
});
const p = (cid: string, amount: number, at: string): Payment => ({
  id: at, customerId: cid, customerName: cid, amount, method: "cash", note: "", createdAt: new Date(at).getTime(),
});

test("balance ignores cancelled orders and subtracts payments", () => {
  const orders = [o("1", "a", 100, "2026-10-01T10:00"), o("2", "a", 50, "2026-10-02T10:00", "cancelled"), o("3", "b", 70, "2026-10-02T10:00")];
  assert.equal(balanceOf("a", orders, [p("a", 30, "2026-10-03T10:00")]), 70);
  assert.equal(balanceOf("b", orders, []), 70);
});

test("monthly bill carries opening balance", () => {
  const orders = [o("1", "a", 100, "2026-09-10T10:00"), o("2", "a", 40, "2026-10-05T10:00")];
  const pays = [p("a", 60, "2026-09-20T10:00"), p("a", 10, "2026-10-06T10:00")];
  const b = billFor("a", "2026-10", orders, pays);
  assert.deepEqual([b.opening, b.sales, b.paid, b.closing], [40, 40, 10, 70]);
});

test("helpers", () => {
  assert.equal(linesTotal([{ itemId: "x", name: "x", unit: "pc", qty: 3, price: 12.5 }]), 37.5);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(normCode(" ab-12c "), "AB12C");
  assert.equal(loginEmail("AB12CD", "Ravi K", 1), "ravik.1.ab12cd@m.goservice.online");
  assert.match(newCode(), /^[A-Z2-9]{6}$/);
  assert.equal(upiUrl("shop@upi", "My Shop", 120), "upi://pay?pa=shop@upi&pn=My%20Shop&cu=INR&tn=Go%20Service&am=120.00");
});
