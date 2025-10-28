/* ==============================================================
   AeroPulse – Wind-Tunnel Dashboard (Firebase Edition)
   ============================================================== */

// ---------- Firebase Config ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

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

// Initialize Firebase (new modular syntax)
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------- DOM Elements ----------
const el = {
  viscosity: document.getElementById('viscosity'),
  density: document.getElementById('density'),
  pressure: document.getElementById('pressure'),
  temperature: document.getElementById('temperature'),
  humidity: document.getElementById('humidity'),
  pressureDiff: document.getElementById('pressureDiff'),
  lift: document.getElementById('lift'),
  reynolds: document.getElementById('reynolds'),
  airspeed: document.getElementById('airspeed'),
  aoa: document.getElementById('aoa'),
  angleControl: document.getElementById('angleControl'),
  flowType: document.getElementById('flowType')
};

// ---------- Firebase Live Data ----------
const sensorRef = ref(db, "sensors");
onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  el.viscosity.innerHTML   = `${data.viscosity.toFixed(3)}<span class="unit">×10⁻⁵ Pa·s</span>`;
  el.density.innerHTML     = `${data.density.toFixed(3)}<span class="unit">kg/m³</span>`;
  el.pressure.innerHTML    = `${data.pressure.toFixed(1)}<span class="unit">kPa</span>`;
  el.temperature.innerHTML = `${data.temperature.toFixed(1)}<span class="unit">°C</span>`;
  el.humidity.innerHTML    = `${Math.round(data.humidity)}<span class="unit">%</span>`;
  el.pressureDiff.innerHTML= `${data.pressureDiff.toFixed(2)}<span class="unit">kPa</span>`;
  el.lift.innerHTML        = `${Math.round(data.lift)}<span class="unit">N</span>`;
  el.reynolds.innerHTML    = `${data.reynolds.toFixed(1)}<span class="unit">×10⁶</span>`;
  el.airspeed.innerHTML    = `${data.airspeed.toFixed(1)}<span class="unit">m/s</span>`;

  const angleOfAttack = data.aoa;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;

  const re = data.reynolds * 1e6;
  if (re > 3e6) {
    el.flowType.textContent = 'TURBULENT';
    el.flowType.className = 'flow-status turbulent';
  } else {
    el.flowType.textContent = 'LAMINAR';
    el.flowType.className = 'flow-status laminar';
  }
});
