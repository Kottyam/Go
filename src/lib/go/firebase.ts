import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, getRedirectResult, onAuthStateChanged, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signInWithCredential, signInAnonymously, signOut, updatePassword } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  limit,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { FbUser } from "./config";
import { memberEmail } from "./logic";
import type { FirebaseConfig, GoNotification, ShopBlob } from "./types";

const apps = new Map<string, FirebaseApp>();

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function appFor(config: FirebaseConfig) {
  const key = `${config.projectId}-${config.appId}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const existing = apps.get(key);
  if (existing) return existing;
  const app = initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
      storageBucket: config.storageBucket || undefined,
      messagingSenderId: config.messagingSenderId || undefined,
    },
    key,
  );
  apps.set(key, app);
  return app;
}

function dbFor(config: FirebaseConfig): Firestore {
  return getFirestore(appFor(config), "default");
}

function toUser(user: { uid: string; displayName: string | null; email: string | null }): FbUser {
  return {
    uid: user.uid,
    name: user.displayName || user.email || "Google user",
    email: user.email || "",
  };
}

let redirectTask: Promise<FbUser | null> | null = null;

export function takeRedirectUser(config: FirebaseConfig): Promise<FbUser | null> {
  if (!redirectTask) {
    redirectTask = getRedirectResult(getAuth(appFor(config)))
      .then((result) => {
        const google = result ? GoogleAuthProvider.credentialFromResult(result) : null;
        if ((google?.idToken || google?.accessToken) && sessionStorage.getItem("go-app-return") === "1") {
          sessionStorage.removeItem("go-app-return");
          const token = encodeURIComponent(google?.idToken || "");
          const access = encodeURIComponent(google?.accessToken || "");
          window.location.href = `goservice://auth?token=${token}&access=${access}`;
          return null;
        }
        return result?.user ? toUser(result.user) : null;
      })
      .catch((error) => {
        redirectTask = null;
        throw error;
      });
  }
  return redirectTask;
}

export function watchGoogleUser(config: FirebaseConfig, onUser: (user: FbUser | null) => void) {
  return onAuthStateChanged(getAuth(appFor(config)), (user) => {
    if (!user) {
      onUser(null);
      return;
    }
    const google = user.providerData.some((p) => p.providerId === "google.com");
    const pendingOwner = sessionStorage.getItem("go-auth-role") === "owner";
    onUser(google || pendingOwner ? toUser(user) : null);
  });
}

export async function signInWithGoogleIdToken(config: FirebaseConfig, idToken: string, accessToken = ""): Promise<FbUser> {
  const cred = await signInWithCredential(getAuth(appFor(config)), GoogleAuthProvider.credential(idToken || null, accessToken || null));
  return toUser(cred.user);
}

export async function signInGoogle(config: FirebaseConfig, role: "owner" | "customer" = "owner"): Promise<FbUser> {
  sessionStorage.setItem("go-auth-role", role);
  const auth = getAuth(appFor(config));
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const bridge = (window as Window & { GoAndroid?: { openGoogle?: () => void } }).GoAndroid;
  if (sessionStorage.getItem("go-app-return") === "1") {
    await signInWithRedirect(auth, provider);
    return new Promise(() => {});
  }
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("GoServiceApp") && bridge?.openGoogle) {
    bridge.openGoogle();
    return new Promise(() => {});
  }
  const inApp = typeof navigator !== "undefined" && navigator.userAgent.includes("GoServiceApp");
  if (inApp) {
    await signInWithRedirect(auth, provider);
    return new Promise(() => {});
  }
  try {
    const cred = await signInWithPopup(auth, provider);
    sessionStorage.removeItem("go-auth-role");
    return toUser(cred.user);
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code.includes("popup-blocked") || code.includes("operation-not-supported")) {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }
    sessionStorage.removeItem("go-auth-role");
    throw e;
  }
}

function provisionApp(config: FirebaseConfig) {
  const key = `prov-${config.projectId}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const existing = apps.get(key);
  if (existing) return existing;
  const app = initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
      storageBucket: config.storageBucket || undefined,
      messagingSenderId: config.messagingSenderId || undefined,
    },
    key,
  );
  apps.set(key, app);
  return app;
}

export const SUPER_ADMIN_EMAIL = "superadmin@go1729.app";

export async function signInSuper(config: FirebaseConfig, password: string): Promise<FbUser> {
  const auth = getAuth(appFor(config));
  try {
    const cred = await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, password);
    return toUser(cred.user);
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (!code.includes("user-not-found")) throw e;
    const cred = await createUserWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, password);
    return toUser(cred.user);
  }
}

export async function signInMember(config: FirebaseConfig, username: string, password: string): Promise<FbUser> {
  const cred = await signInWithEmailAndPassword(getAuth(appFor(config)), memberEmail(username), password);
  return toUser(cred.user);
}

export async function provisionMember(
  config: FirebaseConfig,
  username: string,
  password: string,
  shopId: string,
  customerId: string,
) {
  const app = provisionApp(config);
  const auth = getAuth(app);
  const email = memberEmail(username);
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (!code.includes("email-already-in-use")) throw e;
    cred = await signInWithEmailAndPassword(auth, email, password);
  }
  const uid = cred.user.uid;
  await setDoc(doc(getFirestore(app, "default"), "goMembers", uid), {
    shopId,
    customerId,
    username: username.trim().toLowerCase(),
  });
  await signOut(auth);
  return uid;
}

export async function readMember(config: FirebaseConfig, uid: string) {
  const snap = await getDoc(doc(dbFor(config), "goMembers", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const shopId = String(data.shopId || "");
  const customerId = String(data.customerId || "");
  if (!shopId || !customerId) return null;
  return { shopId, customerId };
}

export async function shopById(config: FirebaseConfig, shopId: string): Promise<ShopBlob | null> {
  const snap = await getDoc(doc(dbFor(config), "goShops", shopId));
  return snap.exists() ? (snap.data() as ShopBlob) : null;
}

export async function allocateMemberNo(config: FirebaseConfig, used: string[]) {
  const db = dbFor(config);
  const ref = doc(db, "goCounters", "members");
  const taken = new Set(used.map((n) => n.trim()));
  let issued = "100001";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    let n = Math.max(100000, Number(snap.data()?.n || 100000));
    do {
      n += 1;
    } while (taken.has(String(n)));
    issued = String(n);
    tx.set(ref, { n }, { merge: true });
  });
  return issued;
}

export async function changeMemberPassword(config: FirebaseConfig, password: string) {
  const user = getAuth(appFor(config)).currentUser;
  if (!user || user.isAnonymous) return;
  await updatePassword(user, password);
}

export async function signInAnon(config: FirebaseConfig): Promise<FbUser> {
  const cred = await signInAnonymously(getAuth(appFor(config)));
  return toUser(cred.user);
}

export async function signOutFirebase(config: FirebaseConfig) {
  await signOut(getAuth(appFor(config)));
}

export async function createShop(
  config: FirebaseConfig,
  uid: string,
  blob: ShopBlob,
  name: string,
  email: string,
) {
  const db = dbFor(config);
  await setDoc(doc(db, "goShops", blob.shop.id), plain(blob));
  await setDoc(doc(db, "goCodes", blob.shop.code), { shopId: blob.shop.id });
  await setDoc(
    doc(db, "goOwners", uid),
    { shopIds: arrayUnion(blob.shop.id), name, email },
    { merge: true },
  );
}

export async function listPlatform(config: FirebaseConfig) {
  const db = dbFor(config);
  const ownersSnap = await getDocs(collection(db, "goOwners"));
  const shopsSnap = await getDocs(collection(db, "goShops"));
  const owners = ownersSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name || ""),
      email: String(data.email || ""),
      shopIds: ((data.shopIds as string[]) ?? []).filter(Boolean),
    };
  });
  const shops = shopsSnap.docs.map((d) => d.data() as ShopBlob);
  return { owners, shops };
}

export async function deleteShop(config: FirebaseConfig, uid: string, shopId: string, code: string) {
  const db = dbFor(config);
  await deleteDoc(doc(db, "goShops", shopId));
  if (code) await deleteDoc(doc(db, "goCodes", code));
  await setDoc(doc(db, "goOwners", uid), { shopIds: arrayRemove(shopId) }, { merge: true });
}

export async function mutateShop(
  config: FirebaseConfig,
  shopId: string,
  recipe: (blob: ShopBlob) => ShopBlob,
): Promise<ShopBlob> {
  const db = dbFor(config);
  const ref = doc(db, "goShops", shopId);
  let written: ShopBlob | null = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("@shopMissing");
    written = plain(recipe(snap.data() as ShopBlob));
    tx.set(ref, written);
  });
  if (!written) throw new Error("@saveFailed");
  return written;
}

export async function shopByCode(config: FirebaseConfig, code: string): Promise<ShopBlob | null> {
  const db = dbFor(config);
  const codeSnap = await getDoc(doc(db, "goCodes", code.trim().toUpperCase()));
  if (!codeSnap.exists()) return null;
  const shopId = String(codeSnap.data().shopId || "");
  if (!shopId) return null;
  const shopSnap = await getDoc(doc(db, "goShops", shopId));
  if (!shopSnap.exists()) return null;
  return shopSnap.data() as ShopBlob;
}

export function subscribeOwner(
  config: FirebaseConfig,
  uid: string,
  cb: (blobs: ShopBlob[]) => void,
  onError?: (error: unknown) => void,
) {
  const db = dbFor(config);
  let shopUnsubs: Array<() => void> = [];
  const stopShops = () => {
    shopUnsubs.forEach((u) => u());
    shopUnsubs = [];
  };
  const unsub = onSnapshot(
    doc(db, "goOwners", uid),
    (snap) => {
      if (!snap.exists()) return;
      const ids = ((snap.data()?.shopIds as string[]) ?? []).filter(Boolean);
      stopShops();
      if (ids.length === 0) {
        if (!snap.metadata.fromCache) cb([]);
        return;
      }
      const map = new Map<string, ShopBlob>();
      for (const id of ids) {
        const u = onSnapshot(
          doc(db, "goShops", id),
          (shopSnap) => {
            if (shopSnap.exists()) map.set(id, shopSnap.data() as ShopBlob);
            else map.delete(id);
            const list = ids.map((i) => map.get(i)).filter((b): b is ShopBlob => Boolean(b));
            if (list.length === 0) return;
            cb(list);
          },
          (error) => onError?.(error),
        );
        shopUnsubs.push(u);
      }
    },
    (error) => onError?.(error),
  );
  return () => {
    unsub();
    stopShops();
  };
}

export function subscribePlatform(
  config: FirebaseConfig,
  cb: (directory: { owners: { id: string; name: string; email: string; shopIds: string[] }[]; shops: ShopBlob[] }) => void,
  onError?: (error: unknown) => void,
) {
  const db = dbFor(config);
  let owners: { id: string; name: string; email: string; shopIds: string[] }[] = [];
  let shops: ShopBlob[] = [];
  let ownersReady = false;
  let shopsReady = false;
  const emit = () => {
    if (ownersReady && shopsReady) cb({ owners, shops });
  };
  const stopOwners = onSnapshot(
    collection(db, "goOwners"),
    (snap) => {
      owners = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ""),
          email: String(data.email || ""),
          shopIds: ((data.shopIds as string[]) ?? []).filter(Boolean),
        };
      });
      ownersReady = true;
      emit();
    },
    (error) => onError?.(error),
  );
  const stopShops = onSnapshot(
    collection(db, "goShops"),
    (snap) => {
      shops = snap.docs.map((d) => d.data() as ShopBlob);
      shopsReady = true;
      emit();
    },
    (error) => onError?.(error),
  );
  return () => {
    stopOwners();
    stopShops();
  };
}

export async function createNotification(config: FirebaseConfig, shopId: string, notification: GoNotification) {
  const db = dbFor(config);
  await setDoc(doc(db, "goNotifications", shopId, "events", notification.id), plain(notification));
}

export function subscribeNotifications(
  config: FirebaseConfig,
  shopId: string,
  cb: (notifications: GoNotification[]) => void,
  onError?: (error: unknown) => void,
) {
  const db = dbFor(config);
  const q = query(collection(db, "goNotifications", shopId, "events"), orderBy("at", "desc"), limit(30));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as GoNotification)),
    (error) => onError?.(error),
  );
}

export function subscribeShop(config: FirebaseConfig, shopId: string, cb: (blob: ShopBlob | null) => void) {
  return onSnapshot(doc(dbFor(config), "goShops", shopId), (snap) => {
    cb(snap.exists() ? (snap.data() as ShopBlob) : null);
  });
}
