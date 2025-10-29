/* ==============================================================
   AeroPulse – Realistic Airflow + NACA 0012 + Firebase
   • Streamline-based flow field
   • Velocity coloring (blue = slow, cyan = fast)
   • Stall separation at high AoA
   • Glow airfoil + live data
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
  w = canvas.clientWidth; h = canvas.clientHeight;
  canvas.width = w; canvas.height = h;
}
resize();
window.addEventListener('resize', resize);

/* ---------- NACA 0012 ---------- */
function drawNACA0012() {
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angleOfAttack * Math.PI / 180);

  const chord = Math.min(w * 0.55, 260);
  const a = [0.2969, -0.1260, -0.3516, 0.2843, -0.1015];
  const points = 120;

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 30;
  ctx.shadowColor = '#00ffff';
  ctx.beginPath();

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord *
      (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    i === 0 ? ctx.moveTo(x, yt) : ctx.lineTo(x, yt);
  }
  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const x = chord * t - chord/2;
    const yt = 5 * 0.12 * chord *
      (a[0]*Math.sqrt(t) + a[1]*t + a[2]*t*t + a[3]*t*t*t + a[4]*t*t*t*t);
    ctx.lineTo(x, -yt);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,255,255,0.7)';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.restore();
}

/* ---------- Realistic Flow Field ---------- */
class Streamline {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = -50;
    this.y = Math.random() * h;
    this.age = 0;
    this.maxAge = 300;
    this.trail = [];
    this.maxTrail = 40;
  }
  update() {
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrail) this.trail.shift();

    const cx = w/2, cy = h/2;
    const dx = this.x - cx, dy = this.y - cy;
    const dist = Math.hypot(dx, dy);
    const chord = Math.min(w * 0.55, 260);

    let vx = 1.0, vy = 0;
    let speed = 1.0;

    if (dist < chord * 1.2) {
      // Inside influence zone
      const localX = ((this.x - cx) * Math.cos(-angleOfAttack * Math.PI/180) - (this.y - cy) * Math.sin(-angleOfAttack * Math.PI/180)) / chord + 0.5;
      const localY = ((this.x - cx) * Math.sin(-angleOfAttack * Math.PI/180) + (this.y - cy) * Math.cos(-angleOfAttack * Math.PI/180)) / chord;

      if (localX >= 0 && localX <= 1) {
        const thickness = 0.12 * (
          0.2969*Math.sqrt(localX) - 0.1260*localX - 0.3516*localX**2 + 0.2843*localX**3 - 0.1015*localX**4
        );
        const distToSurface = Math.abs(localY) - thickness;

        if (distToSurface < 0.05) {
          // Very close → follow surface
          const tangentX = 1;
          const tangentY = (localY > 0 ? 1 : -1) * 0.3;
          const len = Math.hypot(tangentX, tangentY);
          vx = tangentX / len * 1.3;
          vy = tangentY / len * 1.3;
          speed = 1.3;
        } else {
          // Potential flow acceleration
          const accel = 1.0 + 2.0 * Math.exp(-distToSurface*distToSurface*200);
          speed = Math.min(accel, 3.0);
          const angle = Math.atan2(dy, dx);
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        }

        // Stall: separate flow at high AoA
        if (angleOfAttack > 14 && localX > 0.3 && localY > 0) {
          vy += 0.8;
          vx *= 0.7;
          speed *= 0.7;
        }
      }
    }

    // Apply velocity
    this.x += vx * 1.8;
    this.y += vy * 1.8;

    this.age++;
    if (this.x > w + 50 || this.age > this.maxAge) this.reset();
  }
  draw() {
    if (this.trail.length < 2) return;

    ctx.strokeStyle = this.getColor();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    this.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  getColor() {
    const speed = this.trail.length > 1 ?
      Math.hypot(this.x - this.trail[this.trail.length-2].x, this.y - this.trail[this.trail.length-2].y) : 1;
    const normSpeed = Math.min(speed / 5, 1);
    const hue = 180 + normSpeed * 60; // blue → cyan
    return `hsl(${hue}, 100%, 65%)`;
  }
}

const streamlines = Array.from({length: 120}, () => new Streamline());

/* ---------- Animation Loop ---------- */
function animate() {
  ctx.fillStyle = 'rgba(10,10,26,0.08)';
  ctx.fillRect(0,0,w,h);

  streamlines.forEach(s => { s.update(); s.draw(); });
  drawNACA0012();

  requestAnimationFrame(animate);
}
animate();

/* ---------- Firebase Listener ---------- */
onValue(ref(db, "windtunnel"), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  el.viscosity.innerHTML   = `${(data.viscosity??0).toFixed(3)}<span class="unit">×10⁻⁵ Pa·s</span>`;
  el.density.innerHTML     = `${(data.density??0).toFixed(3)}<span class="unit">kg/m³</span>`;
  el.pressure.innerHTML    = `${(data.pressure??0).toFixed(1)}<span class="unit">kPa</span>`;
  el.temperature.innerHTML = `${(data.temperature??0).toFixed(1)}<span class="unit">°C</span>`;
  el.humidity.innerHTML    = `${Math.round(data.humidity??0)}<span class="unit">%</span>`;
  el.pressureDiff.innerHTML= `${(data.pressureDiff??0).toFixed(2)}<span class="unit">kPa</span>`;
  el.lift.innerHTML        = `${Math.round(data.lift??0)}<span class="unit">N</span>`;
  el.reynolds.innerHTML    = `${(data.reynolds??0).toFixed(1)}<span class="unit">×10⁶</span>`;
  el.airspeed.innerHTML    = `${(data.airspeed??0).toFixed(1)}<span class="unit">m/s</span>`;

  angleOfAttack = data.angleOfAttack ?? 0;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;

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

/* ---------- Mouse control (demo) ---------- */
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const dist = mx - w/2;
  angleOfAttack = (dist/(w/3))*20;
  if (angleOfAttack < -20) angleOfAttack = -20;
  if (angleOfAttack > 20) angleOfAttack = 20;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;
});
