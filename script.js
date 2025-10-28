/* ==============================================================
   AeroPulse – Wind-Tunnel Dashboard (Firebase + Fixed Airfoil/Particles)
   ============================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

/* ---------- Firebase config ---------- */
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- DOM elements ---------- */
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

/* ---------- Canvas ---------- */
const canvas = document.getElementById('airfoilCanvas');
const ctx = canvas.getContext('2d');
let w, h, angleOfAttack = 0;

function resize() {
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = w;
  canvas.height = h;
}
resize();
window.addEventListener('resize', resize);

/* ---------- NACA 0012 (exact equation) ---------- */
function drawNACA0012() {
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angleOfAttack * Math.PI / 180);

  const chord = Math.min(w * 0.55, 260);               // responsive chord
  const a = [0.2969, -0.1260, -0.3516, 0.2843, -0.1015];
  const points = 120;

  // ---- bright cyan line ----
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#00ffff';
  ctx.beginPath();

  // upper surface
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord *
      (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    i === 0 ? ctx.moveTo(x, yt) : ctx.lineTo(x, yt);
  }
  // lower surface
  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord *
      (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    ctx.lineTo(x, -yt);
  }
  ctx.closePath();
  ctx.stroke();

  // ---- extra glow layer ----
  ctx.strokeStyle = 'rgba(0,255,255,0.6)';
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.restore();
}

/* ---------- Particle System (flows around airfoil) ---------- */
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = -60;
    this.y = Math.random() * h;
    this.speed = 2.2 + Math.random() * 2.5;
    this.size = 2 + Math.random() * 1.5;
    this.trail = [];
    this.maxTrail = 18;
  }
  update() {
    // trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrail) this.trail.shift();

    // base movement
    this.x += this.speed;

    // ---------- flow deflection ----------
    const cx = w/2, cy = h/2;                     // airfoil centre (after rotation)
    const dx = this.x - cx, dy = this.y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 300) {                            // influence radius
      const flowAngle = Math.atan2(dy, dx);
      const deflection = (angleOfAttack * Math.PI/180) * (1 - dist/300);
      this.y += Math.sin(flowAngle + deflection) * 2.2;

      // high-AoA turbulence
      if (Math.abs(angleOfAttack) > 15 && Math.random() < 0.35) {
        this.y += (Math.random() - 0.5) * 7;
        this.x += (Math.random() - 0.5) * 2;
      }
    }

    // reset when off-screen
    if (this.x > w + 60) this.reset();
  }
  draw() {
    // trail
    ctx.strokeStyle = 'rgba(0,255,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    this.trail.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // particle glow
    const g = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size*3.5);
    g.addColorStop(0, 'rgba(0,255,255,1)');
    g.addColorStop(1, 'rgba(0,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size*3.5, 0, Math.PI*2);
    ctx.fill();
  }
}
const particles = Array.from({length: 110}, () => new Particle());

/* ---------- Animation Loop ---------- */
function animate() {
  // gentle fade (keeps trails visible)
  ctx.fillStyle = 'rgba(10,10,26,0.09)';
  ctx.fillRect(0,0,w,h);

  // particles first (so airfoil draws on top)
  particles.forEach(p => { p.update(); p.draw(); });

  // airfoil on top
  drawNACA0012();

  requestAnimationFrame(animate);
}
animate();

/* ---------- Firebase Listener ---------- */
onValue(ref(db, "windtunnel"), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // ---- UI with units (exact original formatting) ----
  el.viscosity.innerHTML   = `${(data.viscosity??0).toFixed(3)}<span class="unit">×10⁻⁵ Pa·s</span>`;
  el.density.innerHTML     = `${(data.density??0).toFixed(3)}<span class="unit">kg/m³</span>`;
  el.pressure.innerHTML    = `${(data.pressure??0).toFixed(1)}<span class="unit">kPa</span>`;
  el.temperature.innerHTML = `${(data.temperature??0).toFixed(1)}<span class="unit">°C</span>`;
  el.humidity.innerHTML    = `${Math.round(data.humidity??0)}<span class="unit">%</span>`;
  el.pressureDiff.innerHTML= `${(data.pressureDiff??0).toFixed(2)}<span class="unit">kPa</span>`;
  el.lift.innerHTML        = `${Math.round(data.lift??0)}<span class="unit">N</span>`;
  el.reynolds.innerHTML    = `${(data.reynolds??0).toFixed(1)}<span class="unit">×10⁶</span>`;
  el.airspeed.innerHTML    = `${(data.airspeed??0).toFixed(1)}<span class="unit">m/s</span>`;

  // ---- angle of attack (drives airfoil) ----
  angleOfAttack = data.angleOfAttack ?? 0;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;

  // ---- flow regime ----
  const re = (data.reynolds ?? 0) * 1e6;
  if (re > 4e6) {
    el.flowType.textContent = 'TURBULENT';
    el.flowType.className = 'flow-status turbulent';
  } else if (re > 2.3e6) {
    el.flowType.textContent = 'TRANSITIONAL';
    el.flowType.className = 'flow-status transitional';
  } else {
    el.flowType.textContent = 'LAMINAR';
    el.flowType.className = 'flow-status laminar';
  }
}, (err) => console.error("Firebase:", err));

/* ---------- Optional mouse demo control ---------- */
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
