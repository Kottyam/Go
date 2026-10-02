import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_FIREBASE, explainFirebase, FIREBASE_PROJECT, type FbUser } from "./config";
import {
  emptyBlob,
  recipeDropExtra,
  recipeExtra,
  recipeLink,
  recipePayment,
  recipePlaceOrder,
  recipeSkip,
  recipeStatus,
  recipeUpsertCustomer,
  recipeUpsertItem,
  shopCode,
  passHash,
  nextShopMemberNo,
  phoneDigits,
  memberLoginId,
} from "./logic";
import { seed } from "./seed";
import type { Customer, Extra, FirebaseConfig, Item, Order, OrderStatus, Payment, Session, Shop, ShopBlob } from "./types";

const DEMO_KEY = "go-ledger-demo-v2";
const CFG_KEY = "go-firebase-config";
const SESSION_KEY = "go-session-v1";

function loadFirebase() {
  return import("./firebase");
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type GoApi = {
  ready: boolean;
  busy: boolean;
  notice: string | null;
  clearNotice: () => void;
  blobs: ShopBlob[];
  active: ShopBlob | null;
  activeShopId: string | null;
  session: Session | null;
  config: FirebaseConfig | null;
  setActiveShop: (id: string) => void;
  enterDemoOwner: () => void;
  enterDemoCustomer: (customerId: string) => void;
  loginMember: (shopCode: string, username: string, password: string) => Promise<void>;
  saveConfig: (config: FirebaseConfig | null) => void;
  signInOwner: () => Promise<void>;
  lookupShop: (code: string) => Promise<ShopBlob | null>;
  claimCustomer: (shopId: string, customerId: string, phone: string, user: FbUser) => Promise<void>;
  enterLinkedCustomer: (blob: ShopBlob, customer: Customer, user: FbUser) => void;
  signOut: () => Promise<void>;
  resetDemo: () => void;
  addShop: (input: Omit<Shop, "id" | "code">) => Promise<void>;
  saveItem: (shopId: string, item: Item) => Promise<void>;
  saveCustomer: (shopId: string, customer: Customer, password?: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  resetMemberPassword: (shopId: string, customerId: string) => Promise<void>;
  placeOrder: (shopId: string, order: Order) => Promise<void>;
  setStatus: (shopId: string, orderId: string, status: OrderStatus) => Promise<void>;
  collect: (shopId: string, payment: Payment) => Promise<void>;
  toggleSkip: (shopId: string, customerId: string, date: string) => Promise<void>;
  addExtra: (shopId: string, extra: Extra) => Promise<void>;
  dropExtra: (shopId: string, extraId: string) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  google: () => Promise<FbUser>;
  googleAccount: FbUser | null;
};

const GoContext = createContext<GoApi | null>(null);

export function useGo() {
  const ctx = useContext(GoContext);
  if (!ctx) throw new Error("useGo outside provider");
  return ctx;
}

function loadDemo() {
  const saved = readJSON<ShopBlob[]>(DEMO_KEY);
  return saved && saved.length > 0 ? saved : seed();
}

export function GoProvider({ children }: { children: ReactNode }) {
  const [blobs, setBlobs] = useState<ShopBlob[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [config, setConfig] = useState<FirebaseConfig | null>(DEFAULT_FIREBASE);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<FbUser | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(0);
  const blobsRef = useRef(blobs);
  blobsRef.current = blobs;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const saved = readJSON<FirebaseConfig>(CFG_KEY);
    const cfg = saved?.projectId === FIREBASE_PROJECT ? saved : DEFAULT_FIREBASE;
    if (!saved) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    const ses = readJSON<Session>(SESSION_KEY);
    const demo = loadDemo();
    setConfig(cfg);
    setSession(ses);
    if (ses?.backend === "firebase") {
      setBlobs([]);
      setActiveShopId(ses.kind === "customer" ? ses.shopId : null);
    } else {
      setBlobs(demo);
      setActiveShopId(demo[0]?.shop.id ?? null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !config) return;
    let stop = () => {};
    let gone = false;
    const enterOwner = (user: FbUser) => {
      const live = sessionRef.current;
      if (live?.kind === "customer") return;
      if (live?.backend === "firebase" && live.kind === "owner" && live.uid === user.uid) return;
      const next: Session = { kind: "owner", backend: "firebase", name: user.name, uid: user.uid, email: user.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      sessionRef.current = next;
      setGoogleAccount(user);
      setBlobs([]);
      setActiveShopId(null);
      setSession(next);
    };
    void (async () => {
      try {
        const fb = await loadFirebase();
        if (gone) return;
        stop = fb.watchGoogleUser(config, (next) => {
          if (!next) return;
          if (sessionStorage.getItem("go-auth-role") === "customer") return;
          enterOwner(next);
        });
        const user = await fb.takeRedirectUser(config);
        if (gone) return;
        const role = sessionStorage.getItem("go-auth-role");
        if (user && role !== "customer") {
          sessionStorage.removeItem("go-auth-role");
          enterOwner(user);
          setNotice(`@google|${user.email || user.name}`);
        } else if (role === "customer") {
          sessionStorage.setItem("go-customer-return", "1");
          sessionStorage.removeItem("go-auth-role");
        }
      } catch (e) {
        if (!gone) setNotice(explainFirebase(e));
      }
    })();
    return () => {
      gone = true;
      stop();
    };
  }, [ready, config]);

  useEffect(() => {
    if (!ready) return;
    if (session?.backend === "firebase") return;
    if (blobs.length === 0) return;
    localStorage.setItem(DEMO_KEY, JSON.stringify(blobs));
  }, [blobs, ready, session]);

  useEffect(() => {
    if (!ready) return;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session, ready]);

  useEffect(() => {
    if (!ready || session?.backend !== "firebase" || !config) return;
    let stop = () => {};
    let cancelled = false;
    const uid = session.uid;
    const shopId = session.kind === "customer" ? session.shopId : "";
    void (async () => {
      if (cancelled) return;
      if (session.kind === "owner") {
        const unsub = (await loadFirebase()).subscribeOwner(
          config,
          uid,
          (next) => {
            if (pending.current > 0) return;
            if (next.length === 0 && blobsRef.current.length > 0) return;
            setBlobs(next);
            setActiveShopId((cur) => (cur && next.some((b) => b.shop.id === cur) ? cur : (next[0]?.shop.id ?? null)));
          },
          (error) => setNotice(explainFirebase(error)),
        );
        if (cancelled) unsub();
        else stop = unsub;
      } else if (shopId) {
        const unsub = (await loadFirebase()).subscribeShop(config, shopId, (blob) => {
          if (pending.current > 0 || !blob) return;
          setBlobs([blob]);
          setActiveShopId(blob.shop.id);
        });
        if (cancelled) unsub();
        else stop = unsub;
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [ready, session, config]);

  async function commit(shopId: string, recipe: (blob: ShopBlob) => ShopBlob) {
    const current = blobsRef.current.find((b) => b.shop.id === shopId);
    if (!current) {
      setNotice("@shopMissing");
      return;
    }
    let optimistic: ShopBlob;
    try {
      optimistic = recipe(current);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "@saveFailed");
      return;
    }
    setBlobs((curr) => curr.map((b) => (b.shop.id === shopId ? optimistic : b)));
    const live = sessionRef.current;
    const cfg = configRef.current;
    if (live?.backend !== "firebase" || !cfg) return;
    pending.current += 1;
    setBusy(true);
    try {
      const fresh = await (await loadFirebase()).mutateShop(cfg, shopId, recipe);
      setBlobs((curr) => curr.map((b) => (b.shop.id === shopId ? fresh : b)));
    } catch (e) {
      setBlobs((curr) => curr.map((b) => (b.shop.id === shopId ? current : b)));
      setNotice(explainFirebase(e));
    } finally {
      pending.current = Math.max(0, pending.current - 1);
      setBusy(false);
    }
  }

  const api = useMemo<GoApi>(() => {
    const active = blobs.find((b) => b.shop.id === activeShopId) ?? blobs[0] ?? null;
    return {
      ready,
      busy,
      notice,
      clearNotice: () => setNotice(null),
      blobs,
      active,
      activeShopId: active?.shop.id ?? null,
      session,
      config,
      setActiveShop: (id: string) => setActiveShopId(id),
      enterDemoOwner: () => {
        const demo = loadDemo();
        setBlobs(demo);
        setActiveShopId(demo[0]?.shop.id ?? null);
        setSession({ kind: "owner", backend: "demo", name: "ഷോപ്പ് ഉടമ", uid: "demo-owner", email: "" });
      },
      enterDemoCustomer: (customerId: string) => {
        const demo = blobsRef.current.length ? blobsRef.current : loadDemo();
        const blob = demo.find((b) => b.customers.some((c) => c.id === customerId));
        const customer = blob?.customers.find((c) => c.id === customerId);
        if (!blob || !customer) {
          setNotice("@customerMissing");
          return;
        }
        setBlobs(demo);
        setActiveShopId(blob.shop.id);
        setSession({
          kind: "customer",
          backend: "demo",
          name: customer.name,
          uid: "demo-" + customer.id,
          email: "",
          shopId: blob.shop.id,
          customerId: customer.id,
        });
      },
      loginMember: async (shopCode, username, password) => {
        const code = shopCode.trim().toUpperCase();
        const name = username.trim();
        if (!code || !name || !password) {
          setNotice("@badLogin");
          return;
        }
        const hash = await passHash(password);
        const enter = (blob: ShopBlob, customer: Customer, backend: "demo" | "firebase", uid: string, email: string) => {
          if (backend === "demo") setBlobs(blobsRef.current.length ? blobsRef.current : loadDemo());
          else setBlobs([blob]);
          setActiveShopId(blob.shop.id);
          setSession({
            kind: "customer",
            backend,
            name: customer.name,
            uid,
            email,
            shopId: blob.shop.id,
            customerId: customer.id,
          });
        };
        const demo = blobsRef.current.length ? blobsRef.current : loadDemo();
        const local = demo.find((b) => b.shop.code.toUpperCase() === code);
        const localCustomer = local?.customers.find((c) => c.username === name && c.passHash === hash);
        if (local && localCustomer && sessionRef.current?.backend !== "firebase") {
          enter(local, localCustomer, "demo", "demo-" + localCustomer.id, "");
          return;
        }
        const cfg = configRef.current;
        if (!cfg) {
          setNotice("@badLogin");
          return;
        }
        setBusy(true);
        try {
          const fb = await loadFirebase();
          const blob = await fb.shopByCode(cfg, code);
          const customer = blob?.customers.find((c) => c.username === name);
          if (!blob || !customer || customer.passHash !== hash) {
            setNotice("@badLogin");
            return;
          }
          const loginId = memberLoginId(blob.shop.code, name);
          try {
            const user = await fb.signInMember(cfg, loginId, password);
            enter(blob, customer, "firebase", user.uid, user.email);
          } catch {
            const user = await fb.signInAnon(cfg);
            enter(blob, customer, "firebase", user.uid, user.email);
          }
        } catch (e) {
          setNotice(explainFirebase(e));
        } finally {
          setBusy(false);
        }
      },
      saveConfig: (next) => {
        if (next && next.projectId !== FIREBASE_PROJECT) {
          setNotice(`@wrongProject|${FIREBASE_PROJECT}|${next.projectId}`);
          return;
        }
        configRef.current = next;
        setConfig(next);
        if (next) localStorage.setItem(CFG_KEY, JSON.stringify(next));
        else localStorage.removeItem(CFG_KEY);
        setNotice(next ? "@configSaved" : "@configCleared");
      },
      signInOwner: async () => {
        const cfg = configRef.current;
        if (!cfg) {
          setNotice("@needConfig");
          throw new Error("@needConfig");
        }
        setBusy(true);
        try {
          const user = await (await loadFirebase()).signInGoogle(cfg, "owner");
          const next: Session = { kind: "owner", backend: "firebase", name: user.name, uid: user.uid, email: user.email };
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          sessionRef.current = next;
          setGoogleAccount(user);
          setBlobs([]);
          setActiveShopId(null);
          setSession(next);
          setNotice(`@google|${user.email || user.name}`);
        } catch (e) {
          setNotice(explainFirebase(e));
          throw e;
        } finally {
          setBusy(false);
        }
      },
      google: async () => {
        const cfg = configRef.current;
        if (!cfg) {
          const message = "@needConfig";
          setNotice(message);
          throw new Error(message);
        }
        try {
          const user = await (await loadFirebase()).signInGoogle(cfg, "customer");
          setGoogleAccount(user);
          return user;
        } catch (e) {
          setNotice(explainFirebase(e));
          throw e;
        }
      },
      lookupShop: async (code: string) => {
        const cfg = configRef.current;
        if (!cfg) {
          setNotice("@needConfig");
          return null;
        }
        try {
          const blob = await (await loadFirebase()).shopByCode(cfg, code);
          if (!blob) setNotice("@noShopCode");
          return blob;
        } catch (e) {
          setNotice(explainFirebase(e));
          return null;
        }
      },
      claimCustomer: async (shopId, customerId, phone, user) => {
        const cfg = configRef.current;
        if (!cfg) throw new Error("@noConfig");
        setBusy(true);
        pending.current += 1;
        try {
          const fresh = await (await loadFirebase()).mutateShop(cfg, shopId, (b) => recipeLink(b, customerId, user.uid, phone));
          const customer = fresh.customers.find((c) => c.id === customerId);
          if (!customer) throw new Error("@customerMissing");
          setBlobs([fresh]);
          setActiveShopId(fresh.shop.id);
          setSession({
            kind: "customer",
            backend: "firebase",
            name: customer.name,
            uid: user.uid,
            email: user.email,
            shopId: fresh.shop.id,
            customerId,
          });
        } catch (e) {
          setNotice(explainFirebase(e));
          throw e;
        } finally {
          pending.current = Math.max(0, pending.current - 1);
          setBusy(false);
        }
      },
      enterLinkedCustomer: (blob, customer, user) => {
        setBlobs([blob]);
        setActiveShopId(blob.shop.id);
        setSession({
          kind: "customer",
          backend: "firebase",
          name: customer.name,
          uid: user.uid,
          email: user.email,
          shopId: blob.shop.id,
          customerId: customer.id,
        });
      },
      signOut: async () => {
        const live = sessionRef.current;
        const cfg = configRef.current;
        if (live?.backend === "firebase" && cfg) {
          try {
            await (await loadFirebase()).signOutFirebase(cfg);
          } catch {
            /* still leave the local session */
          }
        }
        const demo = loadDemo();
        setSession(null);
        setGoogleAccount(null);
        setBlobs(demo);
        setActiveShopId(demo[0]?.shop.id ?? null);
      },
      resetDemo: () => {
        const demo = seed();
        setBlobs(demo);
        setActiveShopId(demo[0]?.shop.id ?? null);
        localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
        setNotice("@demoReset");
      },
      addShop: async (input) => {
        const live = sessionRef.current;
        if (!live || live.kind !== "owner") return;
        const shop: Shop = {
          ...input,
          id: crypto.randomUUID(),
          code: shopCode(blobsRef.current.map((b) => b.shop.code)),
        };
        const blob = emptyBlob(shop, live.uid);
        setBlobs((curr) => [...curr, blob]);
        setActiveShopId(shop.id);
        if (live.backend !== "firebase" || !configRef.current) return;
        pending.current += 1;
        setBusy(true);
        try {
          await (await loadFirebase()).createShop(configRef.current, live.uid, blob, live.name, live.email);
        } catch (e) {
          setBlobs((curr) => curr.filter((b) => b.shop.id !== shop.id));
          setNotice(explainFirebase(e));
        } finally {
          pending.current = Math.max(0, pending.current - 1);
          setBusy(false);
        }
      },
      saveItem: (shopId, item) => commit(shopId, (b) => recipeUpsertItem(b, item)),
      saveCustomer: async (shopId, customer, password) => {
        const shop = blobsRef.current.find((b) => b.shop.id === shopId);
        if (!shop) {
          setNotice("@shopMissing");
          return;
        }
        let next = { ...customer, username: customer.username?.trim() || undefined };
        if (!next.username) {
          const pass = phoneDigits(next.phone);
          if (pass.length < 6) {
            setNotice("@passShort");
            return;
          }
          next.username = nextShopMemberNo(shop.customers);
          password = pass;
          next.mustChangePass = true;
        }
        if (password) {
          if (password.length < 6) {
            setNotice("@passShort");
            return;
          }
          next.passHash = await passHash(password);
        }
        await commit(shopId, (b) => recipeUpsertCustomer(b, next));
        const live = sessionRef.current;
        const cfg = configRef.current;
        if (password && live?.backend === "firebase" && cfg && next.username) {
          try {
            const uid = await (await loadFirebase()).provisionMember(
              cfg,
              memberLoginId(shop.shop.code, next.username),
              password,
              shopId,
              next.id,
            );
            await commit(shopId, (b) => {
              const current = b.customers.find((c) => c.id === next.id);
              if (!current) return b;
              return recipeUpsertCustomer(b, { ...current, memberUid: uid });
            });
          } catch (e) {
            setNotice(explainFirebase(e));
          }
        }
      },
      placeOrder: async (shopId, order) => {
        if (order.lines.length === 0) {
          setNotice("@needItem");
          return;
        }
        await commit(shopId, (b) => recipePlaceOrder(b, order));
      },
      setStatus: (shopId, orderId, status) => commit(shopId, (b) => recipeStatus(b, orderId, status)),
      collect: (shopId, payment) => {
        if (payment.amount <= 0) {
          setNotice("@needAmount");
          return Promise.resolve();
        }
        return commit(shopId, (b) => recipePayment(b, payment));
      },
      toggleSkip: (shopId, customerId, date) => commit(shopId, (b) => recipeSkip(b, customerId, date)),
      addExtra: (shopId, extra) => {
        if (extra.amount <= 0 || !extra.name.trim()) {
          setNotice("@needAmount");
          return Promise.resolve();
        }
        return commit(shopId, (b) => recipeExtra(b, { ...extra, name: extra.name.trim() }));
      },
      dropExtra: (shopId, extraId) => commit(shopId, (b) => recipeDropExtra(b, extraId)),
      deleteShop: async (shopId) => {
        const live = sessionRef.current;
        if (!live || live.kind !== "owner") return;
        const shop = blobsRef.current.find((b) => b.shop.id === shopId);
        if (!shop) return;
        const rest = blobsRef.current.filter((b) => b.shop.id !== shopId);
        setBlobs(rest);
        setActiveShopId(rest[0]?.shop.id ?? null);
        if (live.backend !== "firebase" || !configRef.current) return;
        pending.current += 1;
        setBusy(true);
        try {
          await (await loadFirebase()).deleteShop(configRef.current, live.uid, shopId, shop.shop.code);
        } catch (e) {
          setBlobs((curr) => (curr.some((b) => b.shop.id === shopId) ? curr : [shop, ...curr]));
          setNotice(explainFirebase(e));
        } finally {
          pending.current = Math.max(0, pending.current - 1);
          setBusy(false);
        }
      },
      changePassword: async (password) => {
        const live = sessionRef.current;
        if (!live || live.kind !== "customer") return;
        if (password.trim().length < 6) {
          setNotice("@passShort");
          return;
        }
        const cfg = configRef.current;
        if (live.backend === "firebase" && cfg) {
          try {
            await (await loadFirebase()).changeMemberPassword(cfg, password.trim());
          } catch (e) {
            setNotice(explainFirebase(e));
            return;
          }
        }
        const hash = await passHash(password.trim());
        await commit(live.shopId, (b) => {
          const customer = b.customers.find((c) => c.id === live.customerId);
          if (!customer) throw new Error("@customerMissing");
          return recipeUpsertCustomer(b, { ...customer, passHash: hash, mustChangePass: false });
        });
        setNotice("@passChanged");
      },
      resetMemberPassword: async (shopId, customerId) => {
        const shop = blobsRef.current.find((b) => b.shop.id === shopId);
        const customer = shop?.customers.find((c) => c.id === customerId);
        if (!shop || !customer || !customer.username) {
          setNotice("@customerMissing");
          return;
        }
        const pass = phoneDigits(customer.phone);
        if (pass.length < 6) {
          setNotice("@passShort");
          return;
        }
        const hash = await passHash(pass);
        await commit(shopId, (b) => {
          const current = b.customers.find((c) => c.id === customerId);
          if (!current) throw new Error("@customerMissing");
          return recipeUpsertCustomer(b, { ...current, passHash: hash, mustChangePass: true });
        });
        const live = sessionRef.current;
        const cfg = configRef.current;
        if (live?.backend === "firebase" && cfg) {
          try {
            await (await loadFirebase()).provisionMember(cfg, memberLoginId(shop.shop.code, customer.username), pass, shopId, customerId);
          } catch (e) {
            const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
            if (!code.includes("wrong-password") && !code.includes("invalid-credential")) {
              setNotice(explainFirebase(e));
              return;
            }
          }
        }
        setNotice("@passChanged");
      },
      googleAccount,
    };
    // commit identity changes each render; methods close over latest via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, blobs, busy, config, googleAccount, notice, ready, session]);

  return <GoContext.Provider value={api}>{children}</GoContext.Provider>;
}
