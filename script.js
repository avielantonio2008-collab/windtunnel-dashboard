// Import Firebase SDKs from the CDN (works for GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGZcG4TJNXMPrN8Gj5MYV3wd4GTHk0r8I",
  authDomain: "aeropulse-8ffb6.firebaseapp.com",
  databaseURL: "https://aeropulse-8ffb6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aeropulse-8ffb6",
  storageBucket: "aeropulse-8ffb6.firebasestorage.app",
  messagingSenderId: "597190603677",
  appId: "1:597190603677:web:d95333ec65edf9877df574",
  measurementId: "G-Q1VKYQMJBD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Reference the "windtunnel" node
const dataRef = ref(db, "windtunnel");

// Listen for real-time updates
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) {
    console.log("No data available");
    return;
  }

  // Update all your dashboard fields
  document.getElementById("viscosity").textContent = data.viscosity ?? "--";
  document.getElementById("density").textContent = data.density ?? "--";
  document.getElementById("pressure").textContent = data.pressure ?? "--";
  document.getElementById("temperature").textContent = data.temperature ?? "--";
  document.getElementById("humidity").textContent = data.humidity ?? "--";
  document.getElementById("pressureDiff").textContent = data.pressureDiff ?? "--";
  document.getElementById("lift").textContent = data.lift ?? "--";
  document.getElementById("reynolds").textContent = data.reynolds ?? "--";
  document.getElementById("airspeed").textContent = data.airspeed ?? "--";
  document.getElementById("aoa").textContent = data.aoa ?? "--";
  document.getElementById("flowType").textContent = data.flowType ?? "---";
  document.getElementById("angleControl").textContent = (data.aoa ?? "--") + "°";
});
