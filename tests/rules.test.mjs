// Security-rules tests for the v2 collections. Run against the emulators:
//   firebase emulators:exec --only firestore,auth "npm run test:rules"
import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, updateDoc, writeBatch, collection, getDocs, query, where } from "firebase/firestore";

const cfg = { apiKey: "fake", projectId: "go-1729-b9fc3", appId: "x" };
let n = 0;
async function client(email) {
  const app = initializeApp(cfg, "t" + n++);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app, "default");
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  let uid = null;
  if (email) uid = (await createUserWithEmailAndPassword(auth, email, "secret123")).user.uid;
  return { app, db, uid };
}
const denied = async (p) => assert.rejects(p, (e) => e.code === "permission-denied");
const run = Date.now().toString(36);
const CODE = ("T" + run).toUpperCase().slice(0, 6);

test("v2 owner/customer flow and isolation", async () => {
  const owner = await client(`owner${run}@example.com`);
  const shopId = "shop" + run;
  // create shop + code together
  let b = writeBatch(owner.db);
  b.set(doc(owner.db, "v2_shops", shopId), { name: "S", code: CODE, ownerUid: owner.uid, phone: "", upi: "", address: "", createdAt: 1 });
  b.set(doc(owner.db, "v2_codes", CODE), { shopId });
  await b.commit();
  // somebody else cannot claim the same code or steal the shop
  const other = await client(`other${run}@example.com`);
  await denied(setDoc(doc(other.db, "v2_codes", CODE), { shopId: "x" }));
  await denied(updateDoc(doc(other.db, "v2_shops", shopId), { name: "hacked" }));
  await denied(getDoc(doc(other.db, "v2_shops", shopId)));
  await denied(updateDoc(doc(owner.db, "v2_shops", shopId), { ownerUid: other.uid }));

  // customers + login
  const email = `ravi.1.${CODE.toLowerCase()}@m.goservice.online`;
  b = writeBatch(owner.db);
  b.set(doc(owner.db, "v2_shops", shopId, "customers", "c1"), { name: "Ravi", phone: "", note: "", username: "ravi", loginEmail: email, memberUid: "", createdAt: 1 });
  b.set(doc(owner.db, "v2_shops", shopId, "customers", "c2"), { name: "Anu", phone: "", note: "", username: "", loginEmail: "", memberUid: "", createdAt: 1 });
  b.set(doc(owner.db, "v2_logins", `${CODE}_ravi`), { shopId, customerId: "c1", v: 1 });
  b.set(doc(owner.db, "v2_shops", shopId, "items", "i1"), { name: "Bread", unit: "pc", price: 40, active: true });
  await b.commit();
  await denied(setDoc(doc(other.db, "v2_logins", `${CODE}_evil`), { shopId, customerId: "c1", v: 1 }));

  const cust = await client(email);
  // wrong customer id → denied; right one → ok
  await denied(setDoc(doc(cust.db, "v2_members", cust.uid), { shopId, customerId: "c2" }));
  await setDoc(doc(cust.db, "v2_members", cust.uid), { shopId, customerId: "c1" });
  // not active until owner confirms memberUid
  await denied(getDoc(doc(cust.db, "v2_shops", shopId)));
  await updateDoc(doc(owner.db, "v2_shops", shopId, "customers", "c1"), { memberUid: cust.uid });
  assert.equal((await getDoc(doc(cust.db, "v2_shops", shopId))).data().name, "S");
  await getDoc(doc(cust.db, "v2_shops", shopId, "customers", "c1"));
  await denied(getDoc(doc(cust.db, "v2_shops", shopId, "customers", "c2")));
  await getDocs(collection(cust.db, "v2_shops", shopId, "items"));
  await denied(setDoc(doc(cust.db, "v2_shops", shopId, "items", "i2"), { name: "x", unit: "", price: 1, active: true }));

  // orders
  const ord = (cid, status = "placed") => ({ customerId: cid, customerName: "Ravi", lines: [], total: 40, status, by: "customer", note: "", createdAt: 2, updatedAt: 2 });
  await setDoc(doc(cust.db, "v2_shops", shopId, "orders", "o1"), ord("c1"));
  await denied(setDoc(doc(cust.db, "v2_shops", shopId, "orders", "o2"), ord("c2")));
  await denied(setDoc(doc(cust.db, "v2_shops", shopId, "orders", "o3"), ord("c1", "delivered")));
  await denied(updateDoc(doc(cust.db, "v2_shops", shopId, "orders", "o1"), { total: 1 }));
  await setDoc(doc(owner.db, "v2_shops", shopId, "orders", "o4"), { ...ord("c2"), by: "owner", status: "delivered" });
  const mine = await getDocs(query(collection(cust.db, "v2_shops", shopId, "orders"), where("customerId", "==", "c1")));
  assert.equal(mine.size, 1);
  await denied(getDocs(collection(cust.db, "v2_shops", shopId, "orders")));
  await updateDoc(doc(cust.db, "v2_shops", shopId, "orders", "o1"), { status: "cancelled", updatedAt: 3 });

  // payments: owner only writes
  await denied(setDoc(doc(cust.db, "v2_shops", shopId, "payments", "p1"), { customerId: "c1", amount: 999 }));
  await setDoc(doc(owner.db, "v2_shops", shopId, "payments", "p1"), { customerId: "c1", customerName: "Ravi", amount: 10, method: "cash", note: "", createdAt: 3 });
  await getDocs(query(collection(cust.db, "v2_shops", shopId, "payments"), where("customerId", "==", "c1")));

  // notices
  await setDoc(doc(cust.db, "v2_shops", shopId, "notices", "n1"), { to: "owner", from: "c1", text: "hi", read: false, createdAt: 1 });
  await denied(setDoc(doc(cust.db, "v2_shops", shopId, "notices", "n2"), { to: "owner", from: "c2", text: "x", read: false, createdAt: 1 }));

  // public lookup used at login
  const anon = await client(null);
  assert.equal((await getDoc(doc(anon.db, "v2_logins", `${CODE}_ravi`))).data().v, 1);
  await denied(getDoc(doc(anon.db, "v2_shops", shopId)));
  // catch-all still denies unknown collections
  await denied(setDoc(doc(owner.db, "random", "x"), { a: 1 }));
  for (const c of [owner, other, cust, anon]) await deleteApp(c.app);
});
