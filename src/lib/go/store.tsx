import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { explainFirebase, type FbUser } from "./config";
import {
  emptyBlob,
  recipeLink,
  recipePayment,
  recipePlaceOrder,
  recipeStatus,
  recipeUpsertCustomer,
  recipeUpsertItem,
  shopCode,
} from "./logic";
import { seed } from "./seed";
import type { Customer, FirebaseConfig, Item, Order, OrderStatus, Payment, Session, Shop, ShopBlob } from "./types";

const DEMO_KEY = "go-ledger-demo-v1";
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
  saveConfig: (config: FirebaseConfig | null) => void;
  signInOwner: () => Promise<void>;
  lookupShop: (code: string) => Promise<ShopBlob | null>;
  claimCustomer: (shopId: string, customerId: string, phone: string, user: FbUser) => Promise<void>;
  enterLinkedCustomer: (blob: ShopBlob, customer: Customer, user: FbUser) => void;
  signOut: () => Promise<void>;
  resetDemo: () => void;
  addShop: (input: Omit<Shop, "id" | "code">) => Promise<void>;
  saveItem: (shopId: string, item: Item) => Promise<void>;
  saveCustomer: (shopId: string, customer: Customer) => Promise<void>;
  placeOrder: (shopId: string, order: Order) => Promise<void>;
  setStatus: (shopId: string, orderId: string, status: OrderStatus) => Promise<void>;
  collect: (shopId: string, payment: Payment) => Promise<void>;
  google: () => Promise<FbUser>;
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
  const [config, setConfig] = useState<FirebaseConfig | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(0);
  const blobsRef = useRef(blobs);
  blobsRef.current = blobs;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const cfg = readJSON<FirebaseConfig>(CFG_KEY);
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
        const unsub = (await loadFirebase()).subscribeOwner(config, uid, (next) => {
          if (pending.current > 0) return;
          setBlobs(next);
          setActiveShopId((cur) => (cur && next.some((b) => b.shop.id === cur) ? cur : (next[0]?.shop.id ?? null)));
        });
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
      setNotice("ഷോപ്പ് കണ്ടില്ല");
      return;
    }
    let optimistic: ShopBlob;
    try {
      optimistic = recipe(current);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "സേവ് ആയില്ല");
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
          setNotice("കസ്റ്റമർ കണ്ടില്ല");
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
      saveConfig: (next) => {
        configRef.current = next;
        setConfig(next);
        if (next) localStorage.setItem(CFG_KEY, JSON.stringify(next));
        else localStorage.removeItem(CFG_KEY);
        setNotice(next ? "Firebase കോൺഫിഗ് സേവ് ചെയ്തു" : "Firebase കോൺഫിഗ് മാറ്റി");
      },
      signInOwner: async () => {
        const cfg = configRef.current;
        if (!cfg) {
          setNotice("ആദ്യം Firebase കോൺഫിഗ് ഒട്ടിക്കുക");
          return;
        }
        setBusy(true);
        try {
          const user = await (await loadFirebase()).signInGoogle(cfg);
          setBlobs([]);
          setSession({ kind: "owner", backend: "firebase", name: user.name, uid: user.uid, email: user.email });
        } catch (e) {
          setNotice(explainFirebase(e));
        } finally {
          setBusy(false);
        }
      },
      google: async () => {
        const cfg = configRef.current;
        if (!cfg) {
          const message = "ആദ്യം Firebase കോൺഫിഗ് ഒട്ടിക്കുക";
          setNotice(message);
          throw new Error(message);
        }
        try {
          return await (await loadFirebase()).signInGoogle(cfg);
        } catch (e) {
          setNotice(explainFirebase(e));
          throw e;
        }
      },
      lookupShop: async (code: string) => {
        const cfg = configRef.current;
        if (!cfg) {
          setNotice("ആദ്യം Firebase കോൺഫിഗ് ഒട്ടിക്കുക");
          return null;
        }
        try {
          const blob = await (await loadFirebase()).shopByCode(cfg, code);
          if (!blob) setNotice("ഈ കോഡിൽ ഷോപ്പ് ഇല്ല. ഉടമ കോഡ് പറഞ്ഞത് നോക്കുക.");
          return blob;
        } catch (e) {
          setNotice(explainFirebase(e));
          return null;
        }
      },
      claimCustomer: async (shopId, customerId, phone, user) => {
        const cfg = configRef.current;
        if (!cfg) throw new Error("Firebase കോൺഫിഗ് ഇല്ല");
        setBusy(true);
        pending.current += 1;
        try {
          const fresh = await (await loadFirebase()).mutateShop(cfg, shopId, (b) => recipeLink(b, customerId, user.uid, phone));
          const customer = fresh.customers.find((c) => c.id === customerId);
          if (!customer) throw new Error("കസ്റ്റമർ കണ്ടില്ല");
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
        setBlobs(demo);
        setActiveShopId(demo[0]?.shop.id ?? null);
      },
      resetDemo: () => {
        const demo = seed();
        setBlobs(demo);
        setActiveShopId(demo[0]?.shop.id ?? null);
        localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
        setNotice("ഡെമോ ഡാറ്റ വീണ്ടും നിറച്ചു");
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
        setBusy(true);
        try {
          await (await loadFirebase()).createShop(configRef.current, live.uid, blob, live.name, live.email);
        } catch (e) {
          setBlobs((curr) => curr.filter((b) => b.shop.id !== shop.id));
          setNotice(explainFirebase(e));
        } finally {
          setBusy(false);
        }
      },
      saveItem: (shopId, item) => commit(shopId, (b) => recipeUpsertItem(b, item)),
      saveCustomer: (shopId, customer) => commit(shopId, (b) => recipeUpsertCustomer(b, customer)),
      placeOrder: async (shopId, order) => {
        if (order.lines.length === 0) {
          setNotice("ഒരു ഐറ്റമെങ്കിലും ചേർക്കുക");
          return;
        }
        await commit(shopId, (b) => recipePlaceOrder(b, order));
      },
      setStatus: (shopId, orderId, status) => commit(shopId, (b) => recipeStatus(b, orderId, status)),
      collect: (shopId, payment) => {
        if (payment.amount <= 0) {
          setNotice("തുക എഴുതുക");
          return Promise.resolve();
        }
        return commit(shopId, (b) => recipePayment(b, payment));
      },
    };
    // commit identity changes each render; methods close over latest via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, blobs, busy, config, notice, ready, session]);

  return <GoContext.Provider value={api}>{children}</GoContext.Provider>;
}
