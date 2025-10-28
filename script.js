/* ==============================================================
   AeroPulse – Wind-Tunnel Dashboard (Firebase Integrated)
   • NACA 0012 airfoil with real angle-of-attack rotation
   • Particle flow field
   • Live data from Firebase Realtime Database
   ============================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ---------- Firebase Config ----------
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

// ---------- DOM Elements ----------
const el = {
  viscosity:   document.getElementById('viscosity'),
  density:     document.getElementById('density'),
  pressure:    document.getElementById('pressure'),
  temperature: document.getElementById('temperature'),
  humidity:    document.getElementById('humidity'),
  pressureDiff:document.getElementById('pressureDiff'),
  lift:        document.getElementById('lift'),
  reynolds:    document.getElementById('reynolds'),
  airspeed:    document.getElementById('airspeed'),
  aoa:         document.getElementById('aoa'),
  angleControl:document.getElementById('angleControl'),
  flowType:    document.getElementById('flowType')
};

// ---------- Canvas & Airfoil ----------
const canvas = document.getElementById('airfoilCanvas');
const ctx = canvas.getContext('2d');
let w, h, angleOfAttack = 0;

function resize() {
  w = canvas.clientWidth; h = canvas.clientHeight;
  canvas.width = w; canvas.height = h;
}
resize();
window.addEventListener('resize', resize);

// ---------- NACA 0012 ----------
function drawNACA0012() {
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angleOfAttack * Math.PI / 180);

  const chord = 220;
  const a = [0.2969, -0.1260, -0.3516, 0.2843, -0.1015];
  const points = 120;

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#00ffff';
  ctx.beginPath();

  // upper surface
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord * (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    i===0 ? ctx.moveTo(x, yt) : ctx.lineTo(x, yt);
  }
  // lower surface
  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord * (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    ctx.lineTo(x, -yt);
  }
  ctx.closePath();
  ctx.stroke();

  // glow
  ctx.strokeStyle = 'rgba(0,255,255,.5)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

// ---------- Particle System ----------
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = -50;
    this.y = Math.random() * h;
    this.speed = 2 + Math.random() * 3;
    this.size = 2 + Math.random() * 2;
    this.trail = [];
    this.maxTrail = 15;
  }
  update() {
    this.trail.push({x:this.x, y:this.y});
    if (this.trail.length > this.maxTrail) this.trail.shift();
    this.x += this.speed;

    const dx = this.x - w/2, dy = this.y - h/2;
    const dist = Math.hypot(dx, dy);
    if (dist < 260) {
      const flow = Math.atan2(dy, dx);
      const def = (angleOfAttack * Math.PI/180) * (1 - dist/260);
      this.y += Math.sin(flow + def) * 2;

      if (Math.abs(angleOfAttack) > 15 && Math.random() < .3) {
        this.y += (Math.random()-.5)*6;
        this.x += (Math.random()-.5)*2;
      }
    }
    if (this.x > w + 50) this.reset();
  }
  draw() {
    ctx.strokeStyle = 'rgba(0,255,255,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.trail.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    const g = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size*3);
    g.addColorStop(0,'rgba(0,255,255,1)');
    g.addColorStop(1,'rgba(0,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size*3,0,Math.PI*2);
    ctx.fill();
  }
}
const particles = Array.from({length:100},()=>new Particle());

// ---------- Animation Loop ----------
function animate() {
  ctx.fillStyle = 'rgba(10,10,26,.1)';
  ctx.fillRect(0,0,w,h);
  particles.forEach(p=>{p.update(); p.draw();});
  drawNACA0012();
  requestAnimationFrame(animate);
}
animate();

// ---------- Firebase Data Listener ----------
const dataRef = ref(db, '/'); // Root or adjust if your data is nested

onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  try {
    el.viscosity.innerHTML   = `${data.viscosity.toFixed(3)}<span class="unit">×10⁻⁵ Pa·s</span>`;
    el.density.innerHTML     = `${data.density.toFixed(3)}<span class="unit">kg/m³</span>`;
    el.pressure.innerHTML    = `${data.pressure.toFixed(1)}<span class="unit">kPa</span>`;
    el.temperature.innerHTML = `${data.temperature.toFixed(1)}<span class="unit">°C</span>`;
    el.humidity.innerHTML    = `${Math.round(data.humidity)}<span class="unit">%</span>`;
    el.pressureDiff.innerHTML= `${data.pressureDiff.toFixed(2)}<span class="unit">kPa</span>`;
    el.lift.innerHTML        = `${Math.round(data.lift)}<span class="unit">N</span>`;
    el.reynolds.innerHTML    = `${data.reynolds.toFixed(1)}<span class="unit">×10⁶</span>`;
    el.airspeed.innerHTML    = `${data.airspeed.toFixed(1)}<span class="unit">m/s</span>`;

    angleOfAttack = data.aoa || 0;
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

  } catch (err) {
    console.error('Data update error:', err);
  }
});

// ---------- Mouse Control ----------
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const dist = mx - w/2;
  angleOfAttack = (dist/(w/3))*18;
  if (angleOfAttack < -18) angleOfAttack = -18;
  if (angleOfAttack > 18) angleOfAttack = 18;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;
});
