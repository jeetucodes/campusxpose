import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging"; // Often needed for push notifications

const firebaseConfig = {
  apiKey: "AIzaSyC_7WL3573EkKxFZ31HnO65kYX3_qjiMAA",
  authDomain: "campusxpose-7cfb6.firebaseapp.com",
  projectId: "campusxpose-7cfb6",
  storageBucket: "campusxpose-7cfb6.firebasestorage.app",
  messagingSenderId: "635233151722",
  appId: "1:635233151722:web:330e891639e8a512940593",
  measurementId: "G-QGQCS7H6X3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (Only on client-side)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics };
