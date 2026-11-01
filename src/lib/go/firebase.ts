import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAQt2HjW3BoX2YsQdQ66I7ao7aHLIaMrog",
  authDomain: "go-1729-b9fc3.firebaseapp.com",
  projectId: "go-1729-b9fc3",
  storageBucket: "go-1729-b9fc3.firebasestorage.app",
  messagingSenderId: "535180088089",
  appId: "1:535180088089:web:e4cde232e4513af9feab88",
};

/** The project's only Firestore database is the named database "default" (not "(default)"). */
export const DATABASE_ID = "default";
const EMULATOR = import.meta.env.VITE_EMULATOR === "1";

function wire(app: FirebaseApp): { auth: Auth; db: Firestore } {
  const auth = getAuth(app);
  const db = getFirestore(app, DATABASE_ID);
  if (EMULATOR) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
  }
  return { auth, db };
}

const main = initializeApp(FIREBASE_CONFIG);
export const { auth, db } = wire(main);

/** A throwaway app so the owner can create a customer login without being signed out. */
export async function withSecondary<T>(fn: (x: { auth: Auth; db: Firestore }) => Promise<T>): Promise<T> {
  const app = initializeApp(FIREBASE_CONFIG, "secondary-" + Date.now());
  try {
    return await fn(wire(app));
  } finally {
    await deleteApp(app).catch(() => {});
  }
}
