import { useEffect, useState } from "react";
import { FIREBASE_PROJECT, FIRESTORE_RULES, parseFirebaseConfig, type FbUser } from "@/lib/go/config";
import { kindLabel } from "@/lib/go/logic";
import { useGo } from "@/lib/go/store";
import { Btn, Field, TextInput } from "./ui";

export function Gate() {
  const go = useGo();
  const [paste, setPaste] = useState("");
  const [code, setCode] = useState("");
  const [user, setUser] = useState<FbUser | null>(null);
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<string>("");
  const [shopId, setShopId] = useState("");
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string; route: string; linkedUid?: string }>>([]);
  const [phase, setPhase] = useState<"home" | "join">("home");

  useEffect(() => {
    if (go.session?.kind === "owner" || !go.googleAccount) return;
    if (sessionStorage.getItem("go-customer-return") !== "1") return;
    sessionStorage.removeItem("go-customer-return");
    setUser(go.googleAccount);
    setPhase("join");
  }, [go.googleAccount, go.session]);

  async function googleOwner() {
    if (paste.trim()) {
      const cfg = parseFirebaseConfig(paste);
      if (cfg) go.saveConfig(cfg);
    }
    await go.signInOwner();
  }

  async function googleJoin() {
    if (!go.config && paste.trim()) {
      const cfg = parseFirebaseConfig(paste);
      if (!cfg) return;
      go.saveConfig(cfg);
    }
    try {
      const signed = user ?? (await go.google());
      setUser(signed);
      setPhase("join");
    } catch (e) {
      /* notice set inside google() only for signInOwner; google() throws */
      const message = e instanceof Error ? e.message : "Google കയറാൻ കഴിഞ്ഞില്ല";
      if (!go.notice) {
        console.error(message);
      }
    }
  }

  async function findShop() {
    if (!user) return;
    try {
      const blob = await go.lookupShop(code);
      if (!blob) return;
      const linked = blob.customers.find((c) => c.linkedUid && c.linkedUid === user.uid);
      if (linked) {
        go.enterLinkedCustomer(blob, linked, user);
        return;
      }
      setShopId(blob.shop.id);
      setCustomers(blob.customers);
    } catch {
      /* notice already set when lookup throws before catch in store — lookup throws raw */
    }
  }

  async function claim() {
    if (!user || !picked) return;
    try {
      await go.claimCustomer(shopId, picked, phone, user);
    } catch {
      /* notice */
    }
  }

  const demoPeople = go.blobs.flatMap((b) =>
    b.customers.map((c) => ({ ...c, shop: b.shop.name, kind: b.shop.kind })),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-8">
      <section className="sheet relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 grid h-32 w-32 rotate-12 place-items-center rounded-full border-4 border-stamp font-display text-4xl text-stamp">
          GO
        </div>
        <p className="text-sm font-medium text-stamp">ക്രെഡിറ്റ് ബിൽ · ഓർഡർ · വിതരണം</p>
        <h1 className="mt-2 font-display text-5xl leading-none">GO</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
          ബേക്കറി, സ്റ്റീൽ, പെയിന്റ്, ഹോൾസെയിൽ — ഓരോ കടയ്ക്കും സ്വന്തം സാധനങ്ങളും കസ്റ്റമേഴ്സും. ഓർഡർ എൻട്രി, മാസബിൽ, പിരിവ്.
        </p>
        <div className="mt-6 grid gap-2">
          <Btn tone="stamp" onClick={go.enterDemoOwner}>
            ഡെമോ · ഷോപ്പ് ഉടമ
          </Btn>
          <p className="text-xs text-muted">മാവേലി ബേക്കറിയും കൊട്ടയം ഹോൾസെയിലും ഇപ്പോൾ തുറക്കാം. Firebase വേണ്ട.</p>
        </div>
      </section>

      <section className="mt-4 sheet p-4">
        <h2 className="font-semibold">ഡെമോ · കസ്റ്റമർ</h2>
        <ul className="mt-2 divide-y divide-line">
          {demoPeople.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
                onClick={() => go.enterDemoCustomer(c.id)}
              >
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-sm text-muted">
                    {c.shop} · {kindLabel(c.kind)}
                  </span>
                </span>
                <span className="text-sm text-stamp">കയറുക</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 sheet p-4">
        <h2 className="font-semibold">അവസാനം · Firebase ബാക്കെൻഡ്</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          ഡാറ്റ ഈ Firebase പ്രോജക്റ്റിൽ: {FIREBASE_PROJECT}. അക്കൗണ്ട് Google സൈൻ-ഇൻ.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-6 text-muted">
          <li>പുതിയ പ്രോജക്റ്റ് വേണ്ട. go-1729-b9fc3 തുറക്കുക.</li>
          <li>Authentication → Sign-in method → Google ഓൺ ചെയ്യുക.</li>
          <li>Firestore Database ഉണ്ടാക്കുക. ലൊക്കേഷൻ asia-south1.</li>
          <li>Rules-ൽ താഴെയുള്ളത് ഒട്ടിച്ച് Publish ചെയ്യുക.</li>
          <li>Project settings → Web app → firebaseConfig ഇവിടെ ഒട്ടിക്കുക.</li>
        </ol>
        {go.config && (
          <p className="mt-3 text-sm text-paid">കണക്ട് ചെയ്ത പ്രോജക്റ്റ്: {go.config.projectId}</p>
        )}
        <Field label="firebaseConfig ഒട്ടിക്കുക">
          <textarea
            className="field mt-1"
            value={paste}
            placeholder={'apiKey: "..."\nauthDomain: "..."\nprojectId: "go-1729-b9fc3"\nappId: "..."'}
            onChange={(e) => setPaste(e.target.value)}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            tone="ghost"
            onClick={() => {
              const cfg = parseFirebaseConfig(paste);
              if (cfg) go.saveConfig(cfg);
            }}
          >
            കോൺഫിഗ് സേവ്
          </Btn>
          <Btn tone="ink" disabled={go.busy} onClick={() => void googleOwner()}>
            ഉടമ · Google
          </Btn>
          <Btn tone="ghost" disabled={go.busy} onClick={() => void googleJoin()}>
            കസ്റ്റമർ · Google
          </Btn>
        </div>
        <button
          type="button"
          className="mt-3 text-sm text-muted underline"
          onClick={() => void navigator.clipboard.writeText(FIRESTORE_RULES)}
        >
          Firestore rules കോപ്പി
        </button>
        {phase === "join" && user && (
          <div className="mt-4 grid gap-3 border-t border-line pt-4">
            <p className="text-sm">
              {user.name}. ഷോപ്പ് കോഡ് ഉടമ പറയും, ഉദാഹരണം GO2048.
            </p>
            <Field label="ഷോപ്പ് കോഡ്">
              <TextInput value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GO2048" />
            </Field>
            <Btn tone="stamp" onClick={() => void findShop()}>
              ഷോപ്പ് തുറക്കുക
            </Btn>
            {customers.length > 0 && (
              <>
                <Field label="നിങ്ങളുടെ പേര്">
                  <select className="field" value={picked} onChange={(e) => setPicked(e.target.value)}>
                    <option value="">തിരഞ്ഞെടുക്കുക</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.route}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ഫോൺ നമ്പർ (ഷോപ്പിലുള്ളത്)">
                  <TextInput value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="9847011122" />
                </Field>
                <Btn tone="paid" disabled={!picked || go.busy} onClick={() => void claim()}>
                  എന്റെ അക്കൗണ്ട് ബന്ധിപ്പിക്കുക
                </Btn>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
