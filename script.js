/* ==============================================================
   AeroPulse – TRUE Aerodynamic Flow + Futuristic Glow
   • Real boundary layer
   • Streamlines hug airfoil surface
   • Velocity + pressure glow
   • Stall separation bubble
   • NACA 0012 + Firebase
   ============================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

/* ---------- Firebase ---------- */
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

/* ---------- DOM ---------- */
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

/* ---------- NACA 0012 Geometry ---------- */
function getNACA0012Thickness(x) {
  const t = 0.12;
  return 5 * t * (
    0.2969 * Math.sqrt(x) -
    0.1260 * x -
    0.3516 * x*x +
    0.2843 * x*x*x -
    0.1015 * x*x*x*x
  );
}

function drawNACA0012() {
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angleOfAttack * Math.PI / 180);

  const chord = Math.min(w * 0.55, 260);
  const points = 140;

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 3.5;
  ctx.shadowBlur = 35;
  ctx.shadowColor = '#00ffff';
  ctx.beginPath();

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = chord * t - chord/2;
    const y = getNACA0012Thickness(t) * chord;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const x = chord * t - chord/2;
    const y = -getNACA0012Thickness(t) * chord;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Double glow
  ctx.strokeStyle = 'rgba(0,255,255,0.8)';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.restore();
}

/* ---------- Aerodynamic Flow Particle ---------- */
class FlowParticle {
  constructor() { this.reset(); }
  reset() {
    this.x = -80 + Math.random() * 40;
    this.y = Math.random() * h;
    this.vx = 0; this.vy = 0;
    this.trail = [];
    this.maxTrail = 30;
    this.age = 0;
    this.inBoundaryLayer = false;
    this.stuck = false;
  }

  update() {
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrail) this.trail.shift();

    const cx = w/2, cy = h/2;
    const dx = this.x - cx, dy = this.y - cy;
    const dist = Math.hypot(dx, dy);
    const chord = Math.min(w * 0.55, 260);

    // Transform to airfoil-local coords
    const rot = -angleOfAttack * Math.PI / 180;
    const localX = ((this.x - cx) * Math.cos(rot) - (this.y - cy) * Math.sin(rot)) / chord + 0.5;
    const localY = ((this.x - cx) * Math.sin(rot) + (this.y - cy) * Math.cos(rot)) / chord;

    let speed = 1.0;
    let vx = 1.8, vy = 0;

    // Inside influence zone
    if (localX >= -0.1 && localX <= 1.1 && Math.abs(localY) < 0.3) {
      const thickness = getNACA0012Thickness(Math.max(0, Math.min(1, localX)));
      const distToSurface = Math.abs(localY) - thickness;

      if (distToSurface < 0.008) {
        // BOUNDARY LAYER: stick & slow down
        this.inBoundaryLayer = true;
        speed = 0.15 + 0.3 * localX;
        const tangent = localY > 0 ? 1 : -1;
        vx = speed * 0.95;
        vy = tangent * speed * 0.05;
        this.stuck = true;
      } else if (distToSurface < 0.03) {
        // Near wall: decelerate
        speed = 0.6 + 0.8 * Math.exp(-distToSurface*100);
        const angle = Math.atan2(dy, dx);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else {
        // Free stream acceleration (top faster)
        const accel = localY > 0 ? 1.0 + 1.8*(1-localX) : 1.0 - 0.4*(1-localX);
        speed = Math.max(0.6, accel);
        const angle = Math.atan2(dy, dx);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }

      // STALL: separate at high AoA
      if (angleOfAttack > 13 && localX > 0.25 && localY > 0.02) {
        vy += 1.2;
        vx *= 0.6;
        speed *= 0.6;
      }
    } else {
      this.inBoundaryLayer = false;
      this.stuck = false;
    }

    // Apply velocity
    this.vx = vx; this.vy = vy;
    this.x += vx;
    this.y += vy;

    this.age++;
    if (this.x > w + 100 || this.age > 400) this.reset();
  }

  draw() {
    if (this.trail.length < 2) return;

    // Velocity-based glow color
    const speed = Math.hypot(this.vx, this.vy);
    const hue = this.inBoundaryLayer ? 30 : (180 + speed * 30); // orange in BL, cyan fast
    const alpha = this.inBoundaryLayer ? 0.9 : 0.7;
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
    ctx.lineWidth = this.inBoundaryLayer ? 2.5 : 1.6;

    ctx.beginPath();
    this.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Glowing head
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 6);
    g.addColorStop(0, `hsla(${hue}, 100%, 90%, 1)`);
    g.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI*2);
    ctx.fill();
  }
}

const particles = Array.from({length: 160}, () => new FlowParticle());

/* ---------- Animation ---------- */
function animate() {
  ctx.fillStyle = 'rgba(10,10,26,0.07)';
  ctx.fillRect(0,0,w,h);

  particles.forEach(p => { p.update(); p.draw(); });
  drawNACA0012();

  requestAnimationFrame(animate);
}
animate();

/* ---------- Firebase ---------- */
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

/* ---------- Mouse Demo ---------- */
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const dist = mx - w/2;
  angleOfAttack = (dist/(w/3))*22;
  if (angleOfAttack < -22) angleOfAttack = -22;
  if (angleOfAttack > 22) angleOfAttack = 22;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;
});
