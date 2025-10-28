// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

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

// DOM references
const elements = {
  viscosity: document.getElementById("viscosity"),
  density: document.getElementById("density"),
  pressure: document.getElementById("pressure"),
  temperature: document.getElementById("temperature"),
  humidity: document.getElementById("humidity"),
  pressureDiff: document.getElementById("pressureDiff"),
  lift: document.getElementById("lift"),
  reynolds: document.getElementById("reynolds"),
  airspeed: document.getElementById("airspeed"),
  aoa: document.getElementById("aoa"),
  flowType: document.getElementById("flowType"),
  angleControl: document.getElementById("angleControl")
};

// Firebase Realtime Database listener
onValue(ref(db, "windtunnel"), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  elements.viscosity.textContent = data.viscosity ?? "--";
  elements.density.textContent = data.density ?? "--";
  elements.pressure.textContent = data.pressure ?? "--";
  elements.temperature.textContent = data.temperature ?? "--";
  elements.humidity.textContent = data.humidity ?? "--";
  elements.pressureDiff.textContent = data.pressureDiff ?? "--";
  elements.lift.textContent = data.lift ?? "--";
  elements.reynolds.textContent = data.reynolds ?? "--";
  elements.airspeed.textContent = data.airspeed ?? "--";
  elements.aoa.textContent = data.angleOfAttack ?? "--";
  elements.angleControl.textContent = (data.angleOfAttack ?? "--") + "°";

  const reynolds = parseFloat(data.reynolds);
  if (!isNaN(reynolds)) {
    elements.flowType.textContent = reynolds > 4000 ? "Turbulent" : reynolds > 2300 ? "Transitional" : "Laminar";
  }
});


// ========== Airfoil Visualization ========== //
const canvas = document.getElementById("airfoilCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 500;
canvas.height = 250;

const particles = [];
const numParticles = 90;
let angleOfAttack = 0;

function generateNACA0012(x) {
  // NACA 0012 thickness distribution
  const t = 0.12;
  const yt =
    5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  return yt;
}

function drawAirfoil(angle) {
  ctx.save();
  ctx.translate(100, canvas.height / 2);
  ctx.rotate((-angle * Math.PI) / 180);
  ctx.beginPath();
  for (let i = 0; i <= 1; i += 0.01) {
    const x = i * 300;
    const y = -generateNACA0012(i) * 100;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = 1; i >= 0; i -= 0.01) {
    const x = i * 300;
    const y = generateNACA0012(i) * 100;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.restore();
}

function createParticles() {
  particles.length = 0;
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 1.5,
      size: 2,
    });
  }
}

function drawParticles() {
  ctx.fillStyle = "#4fc3f7";
  for (let p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
    ctx.fill();

    p.x += p.speed;
    if (p.x > canvas.width) {
      p.x = 0;
      p.y = Math.random() * canvas.height;
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawParticles();
  drawAirfoil(angleOfAttack);
  requestAnimationFrame(animate);
}

createParticles();
animate();

