import { CustomerApp } from "./customer";
import { Gate } from "./gate";
import { OwnerApp } from "./owner";
import { useGo } from "@/lib/go/store";

export function Shell() {
  const go = useGo();
  if (!go.ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink">
        <div className="text-center">
          <p className="font-display text-5xl">GO</p>
          <p className="mt-2 text-sm text-muted">ക്രെഡിറ്റ് ബിൽ</p>
        </div>
      </div>
    );
  }
  return (
    <>
      {go.notice && (
        <div className="no-print border-b border-line bg-due-bg px-4 py-3 text-sm text-due">
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
            <p>{go.notice}</p>
            <button type="button" className="min-h-11 shrink-0 font-semibold" onClick={go.clearNotice}>
              ശരി
            </button>
          </div>
        </div>
      )}
      {!go.session && <Gate />}
      {go.session?.kind === "owner" && <OwnerApp />}
      {go.session?.kind === "customer" && <CustomerApp />}
    </>
  );
}
