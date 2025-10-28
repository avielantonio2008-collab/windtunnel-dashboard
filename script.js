// Import the Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Reference your data node
const dataRef = ref(db, "windtunnel");

// Listen for real-time updates
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

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
