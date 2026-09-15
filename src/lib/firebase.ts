import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc,
  query, 
  where 
} from "firebase/firestore";

export const firebaseConfig = {
  projectId: "gen-lang-client-0184221253",
  appId: "1:4119005247:web:df3379e035d7ccfafa508a",
  apiKey: "AIzaSyC9URH_rdEqhpskYoPxIeCTew54KFWQv9A",
  authDomain: "gen-lang-client-0184221253.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-telegramweb-76581674-b942-4e4b-a0df-5ce6a9cc399d",
  storageBucket: "gen-lang-client-0184221253.firebasestorage.app",
  messagingSenderId: "4119005247",
};

let app: any = null;
let db: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (firebaseConfig.firestoreDatabaseId) {
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("[Firebase Client] Initialization note:", e);
}

export { app, db, collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where };
