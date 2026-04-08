// 🔥 Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyCgQ89hLbS0b1xDFFEqe1whzVPA3AvIufY",
  authDomain: "lawlite-auth.firebaseapp.com",
  projectId: "lawlite-auth",
  storageBucket: "lawlite-auth.firebasestorage.app",
  messagingSenderId: "1024876192416",
  appId: "1:1024876192416:web:c3befd9811cae26d85dfc5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();