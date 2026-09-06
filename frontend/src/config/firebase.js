import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAra2qdbL9537-Lvcik0o6T1iHl6g7diXs",
  authDomain: "lawlite-bd67b.firebaseapp.com",
  projectId: "lawlite-bd67b",
  storageBucket: "lawlite-bd67b.firebasestorage.app",
  messagingSenderId: "564358176562",
  appId: "1:564358176562:web:da825ce24d1e05e7a9012b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});