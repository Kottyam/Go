import type { FirebaseConfig } from "./types";

export const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /goShops/{id} {
      allow read, write: if request.auth != null;
    }
    match /goOwners/{id} {
      allow read, write: if request.auth != null && request.auth.uid == id;
    }
    match /goCodes/{id} {
      allow read, write: if request.auth != null;
    }
  }
}`;

export type FbUser = { uid: string; name: string; email: string };

export function explainFirebase(e: unknown) {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  if (code.includes("popup-blocked") || code.includes("operation-not-supported")) {
    return "ഈ വിൻഡോയിൽ Google പോപ്പ്-അപ്പ് തുറക്കുന്നില്ല. ആപ്പ് പബ്ലിഷ് ചെയ്ത ശേഷം ഫോണിലോ ബ്രൗസറിലോ തുറന്ന് വീണ്ടും ശ്രമിക്കുക. ഇപ്പോൾ ഡെമോയിൽ എല്ലാം നോക്കാം.";
  }
  if (code.includes("popup-closed")) return "Google വിൻഡോ അടച്ചു. വീണ്ടും ശ്രമിക്കുക.";
  if (code.includes("unauthorized-domain")) {
    return "ഈ സൈറ്റ് Firebase-ൽ അനുവദിച്ചിട്ടില്ല. Authentication → Settings → Authorized domains-ൽ ഡൊമൈൻ ചേർക്കുക.";
  }
  if (code.includes("permission-denied")) {
    return "Firestore rules അനുവദിച്ചില്ല. ക്രമീകരണത്തിലെ റൂൾസ് കോപ്പി ചെയ്ത് Publish ചെയ്യുക.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "Firebase-മായി ബന്ധപ്പെടാൻ കഴിഞ്ഞില്ല.";
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
