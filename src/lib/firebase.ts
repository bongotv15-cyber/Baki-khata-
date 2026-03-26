import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAB8Nk28F03D1bivCttYag8cbZKtE_-WTM",
  authDomain: "nijam-store-e5c26.firebaseapp.com",
  projectId: "nijam-store-e5c26",
  storageBucket: "nijam-store-e5c26.firebasestorage.app",
  messagingSenderId: "469142740254",
  appId: "1:469142740254:web:14960611536a8136befd0f",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
