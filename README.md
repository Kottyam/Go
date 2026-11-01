# Go Service (v2)

Credit-ledger & ordering app for small shops. TanStack Start + React 19 + Firebase (Firestore database **`default`**, project `go-1729-b9fc3`).

- **Owner**: signs in with Google → dashboard (today's orders, total dues, customers), items, shop settings, optional import from the old app.
- **Customer**: Shop ID + username + PIN → balance, order, UPI pay, history, notifications.
- English / Malayalam toggle. Android build kept (`npm run build:android`).

## Data
New data lives only in `v2_*` collections (`v2_shops` + subcollections, `v2_codes`, `v2_logins`, `v2_members`).
The live collections used by goservice.online (`goShops`, `goCodes`, `goOwners`, `goMembers`, `goCounters`, `goNotifications`) are **never written**; the importer only reads them.

## Scripts
`npm run dev` · `npm run dev:emu` (needs `firebase emulators:start --only auth,firestore`) · `npm run typecheck` · `npm test` · `npm run test:rules` (emulator) · `npm run lint` · `npm run build`

## Firestore rules
`firestore.rules.backup` = live rules as fetched. `firestore.rules` = the same text byte-for-byte plus an additive `v2_*` block. Rules were **not deployed** automatically; apply them in Firebase console → Firestore → database `default` → Rules (compare with the backup first).
