import type { FirebaseConfig } from "./types";

export const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }
    function superAdmin() {
      return signedIn()
        && request.auth.token.email == 'superadmin@go1729.app'
        && request.auth.token.firebase.sign_in_provider == 'password';
    }
    function ownerOfShop(id) {
      return signedIn()
        && exists(/databases/$(database)/documents/goShops/$(id))
        && get(/databases/$(database)/documents/goShops/$(id)).data.ownerUid == request.auth.uid;
    }
    function memberOfShop(id) {
      return signedIn()
        && exists(/databases/$(database)/documents/goMembers/$(request.auth.uid))
        && get(/databases/$(database)/documents/goMembers/$(request.auth.uid)).data.shopId == id;
    }

    match /goShops/{id} {
      allow read: if superAdmin() || ownerOfShop(id) || memberOfShop(id);
      allow create: if superAdmin() || (signedIn() && request.resource.data.ownerUid == request.auth.uid);
      allow update, delete: if superAdmin() || ownerOfShop(id);
    }

    match /goOwners/{id} {
      allow read, write: if superAdmin() || (signedIn() && request.auth.uid == id);
    }

    match /goCodes/{id} {
      allow read: if superAdmin()
        || ownerOfShop(resource.data.shopId)
        || memberOfShop(resource.data.shopId);
      allow write: if superAdmin()
        || (signedIn() && request.resource.data.shopId != null && ownerOfShop(request.resource.data.shopId));
    }

    match /goMembers/{id} {
      allow read: if superAdmin()
        || (signedIn() && request.auth.uid == id)
        || (signedIn() && resource.data.shopId != null && ownerOfShop(resource.data.shopId));
      allow create, update: if superAdmin()
        || (signedIn() && request.auth.uid == id);
      allow delete: if superAdmin() || (signedIn() && request.auth.uid == id);
    }

    match /goNotifications/{shopId}/{notificationId} {
      allow read: if superAdmin() || ownerOfShop(shopId) || memberOfShop(shopId);
      allow create: if superAdmin() || ownerOfShop(shopId);
      allow update, delete: if superAdmin() || ownerOfShop(shopId);
    }
  }
}`;


export const FIREBASE_PROJECT = "go-1729-b9fc3";

export const DEFAULT_FIREBASE: FirebaseConfig = {
  apiKey: "AIzaSyAQt2HjW3BoX2YsQdQ66I7ao7aHLIaMrog",
  authDomain: "go-1729-b9fc3.firebaseapp.com",
  projectId: "go-1729-b9fc3",
  storageBucket: "go-1729-b9fc3.firebasestorage.app",
  messagingSenderId: "535180088089",
  appId: "1:535180088089:web:e4cde232e4513af9feab88",
};

export type FbUser = { uid: string; name: string; email: string };

export function explainFirebase(e: unknown) {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found") || code.includes("invalid-email")) return "@badLogin";
  if (code.includes("weak-password")) return "@passShort";
  if (code.includes("operation-not-allowed")) return "@emailOff";
  if (code.includes("admin-restricted-operation")) return "Firebase is blocking account creation. Email/Password can be ON while user account creation is OFF. In Firebase Console open Authentication → Settings → User account management and enable user self-service account creation, or create member accounts with the Admin SDK.";
  if (code.includes("email-already-in-use")) return "@userTaken";
  if (code.includes("popup-blocked") || code.includes("operation-not-supported")) return "@popupBlocked";
  if (code.includes("popup-closed")) return "@popupClosed";
  if (code.includes("unauthorized-domain")) {
    const host = typeof location !== "undefined" ? location.hostname : "";
    return `@unauthorized|${host}`;
  }
  if (code.includes("permission-denied")) return "@denied";
  if (e instanceof Error && e.message.includes("does not exist")) return "@noDb";
  if (e instanceof Error && e.message) return e.message;
  return "@firebase";
}

export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  const grab = (key: string) => {
    const m = text.match(new RegExp(key + "\\s*[:=]\\s*['\\\"]([^'\\\"]+)['\\\"]"));
    return m?.[1]?.trim() ?? "";
  };
  const cfg: FirebaseConfig = {
    apiKey: grab("apiKey"),
    authDomain: grab("authDomain"),
    projectId: grab("projectId"),
    appId: grab("appId"),
    storageBucket: grab("storageBucket") || undefined,
    messagingSenderId: grab("messagingSenderId") || undefined,
  };
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;
  return cfg;
}
