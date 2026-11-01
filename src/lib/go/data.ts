import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { auth, db, withSecondary } from "./firebase";
import { linesTotal, loginEmail, newCode, normCode, normUsername } from "./logic";
import type { Customer, Item, Notice, Order, OrderLine, OrderStatus, PayMethod, Payment, Shop } from "./types";

// All v2 data lives under new collection names. The legacy collections used by the
// old app (goShops, goCodes, goOwners, goMembers, goCounters, goNotifications) are
// only ever READ here (one-time import), never written.
export const C = {
  shops: "v2_shops",
  codes: "v2_codes",
  logins: "v2_logins",
  members: "v2_members",
} as const;

const shopRef = (id: string) => doc(db, C.shops, id);
const sub = (shopId: string, name: string) => collection(db, C.shops, shopId, name);
const rid = () => doc(collection(db, "_")).id;
const now = () => Date.now();

// ---------- auth ----------
export async function ownerGoogleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function customerSignIn(shopCode: string, username: string, pin: string) {
  const code = normCode(shopCode);
  const user = normUsername(username);
  if (!code || !user || !pin) throw new Error("missing");
  const login = await getDoc(doc(db, C.logins, `${code}_${user}`));
  if (!login.exists()) throw new Error("no-login");
  const v = Number(login.data().v ?? 1);
  await signInWithEmailAndPassword(auth, loginEmail(code, user, v), pin);
}

export const logout = () => signOut(auth);

export async function changeOwnPin(pin: string) {
  if (!auth.currentUser) throw new Error("not signed in");
  await updatePassword(auth.currentUser, pin);
}

export async function readMember(uid: string) {
  const m = await getDoc(doc(db, C.members, uid));
  return m.exists() ? (m.data() as { shopId: string; customerId: string }) : null;
}

// ---------- live lists ----------
function live<T>(q: Query<DocumentData>, set: (rows: T[]) => void, onErr: (e: Error) => void) {
  return onSnapshot(
    q,
    (snap) => set(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
    (e) => onErr(e),
  );
}

export function watchOwnerShops(uid: string, set: (s: Shop[]) => void, err: (e: Error) => void) {
  return live<Shop>(query(collection(db, C.shops), where("ownerUid", "==", uid)), set, err);
}

export function watchShop(id: string, set: (s: Shop | null) => void, err: (e: Error) => void) {
  return onSnapshot(
    shopRef(id),
    (d) => set(d.exists() ? ({ id: d.id, ...d.data() } as Shop) : null),
    (e) => err(e),
  );
}

export type Watchers = {
  customers: (r: Customer[]) => void;
  items: (r: Item[]) => void;
  orders: (r: Order[]) => void;
  payments: (r: Payment[]) => void;
  notices: (r: Notice[]) => void;
  error: (e: Error) => void;
};

export function watchOwnerData(shopId: string, w: Watchers) {
  const offs = [
    live<Customer>(query(sub(shopId, "customers")), w.customers, w.error),
    live<Item>(query(sub(shopId, "items")), w.items, w.error),
    live<Order>(query(sub(shopId, "orders")), w.orders, w.error),
    live<Payment>(query(sub(shopId, "payments")), w.payments, w.error),
    live<Notice>(query(sub(shopId, "notices"), where("to", "==", "owner")), w.notices, w.error),
  ];
  return () => offs.forEach((f) => f());
}

export function watchCustomerData(shopId: string, cid: string, w: Watchers) {
  const mine = (name: string, field = "customerId") => query(sub(shopId, name), where(field, "==", cid));
  const offs = [
    onSnapshot(
      doc(db, C.shops, shopId, "customers", cid),
      (d) => w.customers(d.exists() ? [{ id: d.id, ...d.data() } as Customer] : []),
      w.error,
    ),
    live<Item>(query(sub(shopId, "items")), w.items, w.error),
    live<Order>(mine("orders"), w.orders, w.error),
    live<Payment>(mine("payments"), w.payments, w.error),
    live<Notice>(mine("notices", "to"), w.notices, w.error),
  ];
  return () => offs.forEach((f) => f());
}

// ---------- shop ----------
export async function createShop(uid: string, input: Pick<Shop, "name" | "phone" | "upi" | "address">, wantCode?: string) {
  const id = rid();
  let code = wantCode ? normCode(wantCode) : "";
  for (let tries = 0; tries < 8; tries++) {
    if (!code) code = newCode();
    const taken = await getDoc(doc(db, C.codes, code));
    if (!taken.exists()) break;
    code = "";
  }
  if (!code) throw new Error("Could not reserve a shop ID, try again");
  const shop: Omit<Shop, "id"> = { ...input, code, ownerUid: uid, createdAt: now() };
  const b = writeBatch(db);
  b.set(shopRef(id), shop);
  b.set(doc(db, C.codes, code), { shopId: id });
  await b.commit();
  return id;
}

export const updateShop = (id: string, patch: Partial<Pick<Shop, "name" | "phone" | "upi" | "address">>) =>
  updateDoc(shopRef(id), patch);

// ---------- items ----------
export async function saveItem(shopId: string, item: Omit<Item, "id"> & { id?: string }) {
  const { id, ...rest } = item;
  await setDoc(doc(sub(shopId, "items"), id || rid()), rest);
}

// ---------- customers ----------
export async function saveCustomer(shopId: string, c: Partial<Customer> & { name: string }) {
  const id = c.id || rid();
  const ref = doc(sub(shopId, "customers"), id);
  if (c.id) {
    await updateDoc(ref, { name: c.name, phone: c.phone ?? "", note: c.note ?? "" });
  } else {
    const fresh: Omit<Customer, "id"> = {
      name: c.name,
      phone: c.phone ?? "",
      note: c.note ?? "",
      username: "",
      loginEmail: "",
      memberUid: "",
      createdAt: now(),
    };
    await setDoc(ref, fresh);
  }
  return id;
}

/**
 * Give a customer a login (Shop ID + username + PIN), or reset their PIN.
 * Firebase can't change another user's password from the client, so a reset
 * creates a fresh account (version v+1) and re-points the customer at it.
 */
export async function setCustomerLogin(shop: Shop, customer: Customer, usernameRaw: string, pin: string) {
  const username = normUsername(usernameRaw);
  if (username.length < 3) throw new Error("Username must be at least 3 letters/numbers");
  if (pin.length < 6) throw new Error("PIN must be at least 6 digits");
  const loginRef = doc(db, C.logins, `${shop.code}_${username}`);
  const existing = await getDoc(loginRef);
  if (existing.exists() && existing.data().customerId !== customer.id) throw new Error("That username is taken in this shop");
  const v = existing.exists() ? Number(existing.data().v ?? 1) + 1 : 1;
  const email = loginEmail(shop.code, username, v);
  const cref = doc(db, C.shops, shop.id, "customers", customer.id);
  const b = writeBatch(db);
  if (customer.username && customer.username !== username) b.delete(doc(db, C.logins, `${shop.code}_${customer.username}`));
  b.set(loginRef, { shopId: shop.id, customerId: customer.id, v });
  b.update(cref, { username, loginEmail: email, memberUid: "" });
  await b.commit();
  const uid = await withSecondary(async (s) => {
    const cred = await createUserWithEmailAndPassword(s.auth, email, pin);
    await setDoc(doc(s.db, C.members, cred.user.uid), { shopId: shop.id, customerId: customer.id });
    await signOut(s.auth);
    return cred.user.uid;
  });
  await updateDoc(cref, { memberUid: uid });
}

// ---------- orders ----------
export async function placeOrder(
  shopId: string,
  by: "owner" | "customer",
  customer: Pick<Customer, "id" | "name">,
  lines: OrderLine[],
  note = "",
) {
  const clean = lines.filter((l) => l.qty > 0);
  if (!clean.length) throw new Error("Add at least one item");
  const t = now();
  const order: Omit<Order, "id"> = {
    customerId: customer.id,
    customerName: customer.name,
    lines: clean,
    total: linesTotal(clean),
    status: by === "owner" ? "delivered" : "placed",
    by,
    note,
    createdAt: t,
    updatedAt: t,
  };
  const id = rid();
  const b = writeBatch(db);
  b.set(doc(sub(shopId, "orders"), id), order);
  if (by === "customer") {
    b.set(doc(sub(shopId, "notices")), notice("owner", customer.id, `New order from ${customer.name}: ₹${order.total}`));
  }
  await b.commit();
  return id;
}

export async function setOrderStatus(shopId: string, order: Order, status: OrderStatus, by: "owner" | "customer") {
  const b = writeBatch(db);
  b.update(doc(sub(shopId, "orders"), order.id), { status, updatedAt: now() });
  if (by === "owner") {
    b.set(doc(sub(shopId, "notices")), notice(order.customerId, "owner", `Your order of ₹${order.total} is ${status}`));
  } else {
    b.set(doc(sub(shopId, "notices")), notice("owner", order.customerId, `${order.customerName} cancelled an order of ₹${order.total}`));
  }
  await b.commit();
}

// ---------- payments ----------
export async function recordPayment(shopId: string, customer: Pick<Customer, "id" | "name">, amount: number, method: PayMethod, note = "") {
  if (!(amount > 0)) throw new Error("Enter an amount");
  const pay: Omit<Payment, "id"> = { customerId: customer.id, customerName: customer.name, amount, method, note, createdAt: now() };
  const b = writeBatch(db);
  b.set(doc(sub(shopId, "payments")), pay);
  b.set(doc(sub(shopId, "notices")), notice(customer.id, "owner", `Payment of ₹${amount} received. Thank you!`));
  await b.commit();
}

/** Customer says "I paid by UPI" — tells the owner, who then records it. */
export const tellOwnerPaid = (shopId: string, customer: Pick<Customer, "id" | "name">, amount: number) =>
  setDoc(doc(sub(shopId, "notices")), notice("owner", customer.id, `${customer.name} says they paid ₹${amount} by UPI`));

// ---------- notices ----------
function notice(to: string, from: string, text: string): Omit<Notice, "id"> {
  return { to, from, text, read: false, createdAt: now() };
}
export const markRead = (shopId: string, id: string) => updateDoc(doc(sub(shopId, "notices"), id), { read: true });

// ---------- one-time import from the old app (read-only on old data) ----------
type OldBlob = {
  shop?: { name?: string; phone?: string; upi?: string; address?: string; code?: string };
  items?: { id: string; name: string; unit?: string; price?: number; active?: boolean }[];
  customers?: { id: string; name: string; phone?: string; note?: string }[];
  orders?: {
    id: string;
    customerId: string;
    customerName?: string;
    date?: string;
    lines?: OrderLine[];
    mode?: string;
    status?: string;
    note?: string;
  }[];
  payments?: { id: string; customerId: string; customerName?: string; date?: string; amount?: number; method?: string; note?: string }[];
};

export async function findOldShops(uid: string) {
  const owner = await getDoc(doc(db, "goOwners", uid));
  const ids: string[] = owner.exists() ? ((owner.data().shopIds as string[]) ?? []) : [];
  const out: { id: string; blob: OldBlob }[] = [];
  for (const id of ids) {
    try {
      const s = await getDoc(doc(db, "goShops", id));
      if (s.exists()) out.push({ id, blob: s.data() as OldBlob });
    } catch {
      /* skip shops we can't read */
    }
  }
  return out;
}

export async function importOldShop(uid: string, old: { id: string; blob: OldBlob }) {
  const s = old.blob.shop ?? {};
  const shopId = await createShop(
    uid,
    { name: s.name || "My shop", phone: s.phone ?? "", upi: s.upi ?? "", address: s.address ?? "" },
    s.code,
  );
  await updateDoc(shopRef(shopId), { importedFrom: old.id });
  const at = (iso?: string) => (iso ? new Date(iso + (iso.length <= 10 ? "T09:00" : "")).getTime() || now() : now());
  const ops: [string, string, DocumentData][] = [];
  for (const i of old.blob.items ?? [])
    ops.push(["items", i.id, { name: i.name, unit: i.unit ?? "", price: Number(i.price ?? 0), active: i.active !== false }]);
  for (const c of old.blob.customers ?? [])
    ops.push(["customers", c.id, { name: c.name, phone: c.phone ?? "", note: c.note ?? "", username: "", loginEmail: "", memberUid: "", createdAt: now() }]);
  const statusMap: Record<string, OrderStatus> = { pending: "placed", packed: "accepted", out: "accepted", delivered: "delivered", cancelled: "cancelled" };
  for (const o of old.blob.orders ?? []) {
    const lines = o.lines ?? [];
    const t = at(o.date);
    const total = linesTotal(lines);
    const status = statusMap[o.status ?? ""] ?? "delivered";
    ops.push(["orders", o.id, { customerId: o.customerId, customerName: o.customerName ?? "", lines, total, status, by: "owner", note: o.note ?? "", createdAt: t, updatedAt: t }]);
    // Old cash orders never added to the due; keep balances identical with a matching payment.
    if (o.mode === "cash" && status !== "cancelled")
      ops.push(["payments", "cash_" + o.id, { customerId: o.customerId, customerName: o.customerName ?? "", amount: total, method: "cash", note: "Paid at order", createdAt: t }]);
  }
  for (const p of old.blob.payments ?? [])
    ops.push(["payments", p.id, { customerId: p.customerId, customerName: p.customerName ?? "", amount: Number(p.amount ?? 0), method: (p.method as PayMethod) || "cash", note: p.note ?? "", createdAt: at(p.date) }]);
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    for (const [col, id, data] of ops.slice(i, i + 400)) b.set(doc(sub(shopId, col), id), data);
    await b.commit();
  }
  return shopId;
}

export async function hasAnyV2Shop(uid: string) {
  const s = await getDocs(query(collection(db, C.shops), where("ownerUid", "==", uid)));
  return !s.empty;
}
