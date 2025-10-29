/* ==============================================================
   AeroPulse – OVER-ENGINEERED Aerodynamic Flow Visualization
   • 100-panel vortex method
   • Blasius boundary layer
   • Real separation detection
   • 300 glowing photon tracers
   • Firebase + NACA 0012 + AoA
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

/* ---------- NACA 0012 ---------- */
function naca0012(x) {
  const t = 0.12;
  return 5 * t * (0.2969*Math.sqrt(x) - 0.1260*x - 0.3516*x*x + 0.2843*x*x*x - 0.1015*x*x*x*x);
}

function drawNACA0012() {
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angleOfAttack * Math.PI / 180);

  const chord = Math.min(w * 0.55, 280);
  const N = 160;
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 40;
  ctx.shadowColor = '#00ffff';
  ctx.beginPath();

  for (let i = 0; i <= N; i++) {
    const x = (i/N)*chord - chord/2;
    const y = naca0012(i/N) * chord;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const x = (i/N)*chord - chord/2;
    const y = -naca0012(i/N) * chord;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,255,255,0.85)';
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.restore();
}

/* ---------- Panel Method (Vortex Panels) ---------- */
class PanelMethod {
  constructor() {
    this.chord = 1.0;
    this.N = 100;
    this.panels = [];
    this.gamma = new Array(this.N).fill(0);
    this.setupPanels();
  }

  setupPanels() {
    this.panels = [];
    for (let i = 0; i < this.N; i++) {
      const x1 = i / this.N;
      const x2 = (i + 1) / this.N;
      const y1 = naca0012(x1);
      const y2 = naca0012(x2);
      const xc = (x1 + x2) / 2;
      const yc = naca0012(xc);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;
      this.panels.push({ x1, y1, x2, y2, xc, yc, len, nx, ny, gamma: 0 });
    }
  }

  solve(alphaDeg) {
    const alpha = alphaDeg * Math.PI / 180;
    const N = this.N;
    const A = new Array(N);
    const b = new Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      A[i] = new Array(N).fill(0);
      const pi = this.panels[i];
      b[i] = -Math.cos(alpha) * pi.nx - Math.sin(alpha) * pi.ny;

      for (let j = 0; j < N; j++) {
        if (i === j) {
          A[i][j] = Math.PI;
        } else {
          const pj = this.panels[j];
          const dx = pi.xc - pj.xc;
          const dy = pi.yc - pj.yc;
          const r = Math.hypot(dx, dy);
          if (r < 1e-6) continue;
          const ux = -dy / (2 * Math.PI * r * r);
          const uy = dx / (2 * Math.PI * r * r);
          A[i][j] = ux * pi.nx + uy * pi.ny;
        }
      }
    }

    // Solve A * gamma = b
    this.gamma = this.gaussJordan(A, b);
  }

  gaussJordan(A, b) {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      for (let k = i + 1; k < n; k++) {
        const c = -aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          if (i === j) aug[k][j] = 0;
          else aug[k][j] += c * aug[i][j];
        }
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n] / aug[i][i];
      for (let k = i - 1; k >= 0; k--) {
        aug[k][n] -= aug[k][i] * x[i];
      }
    }
    return x;
  }

  velocityAt(x, y, alpha) {
    let u = Math.cos(alpha);
    let v = Math.sin(alpha);
    for (let i = 0; i < this.N; i++) {
      const p = this.panels[i];
      const dx = x - p.xc;
      const dy = y - p.yc;
      const r = Math.hypot(dx, dy);
      if (r < 1e-6) continue;
      const ux = -dy * p.gamma / (2 * Math.PI * r * r);
      const uy = dx * p.gamma / (2 * Math.PI * r * r);
      u += ux;
      v += uy;
    }
    return { u, v, speed: Math.hypot(u, v) };
  }
}

const panel = new PanelMethod();

/* ---------- Flow Particle (Photon-like) ---------- */
class Photon {
  constructor() { this.reset(); }
  reset() {
    this.x = -100 + Math.random() * 50;
    this.y = Math.random() * h;
    this.trail = [];
    this.maxTrail = 50;
    this.age = 0;
    this.inBL = false;
    this.separated = false;
  }

  update() {
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrail) this.trail.shift();

    const cx = w/2, cy = h/2;
    const chord = Math.min(w * 0.55, 280);
    const scale = chord;

    const rot = -angleOfAttack * Math.PI / 180;
    const localX = ((this.x - cx) * Math.cos(rot) - (this.y - cy) * Math.sin(rot)) / scale + 0.5;
    const localY = ((this.x - cx) * Math.sin(rot) + (this.y - cy) * Math.cos(rot)) / scale;

    let u = 1.0, v = 0;
    let speed = 1.0;
    this.inBL = false;
    this.separated = false;

    if (localX >= -0.1 && localX <= 1.1 && Math.abs(localY) < 0.25) {
      const thickness = naca0012(Math.max(0, Math.min(1, localX)));
      const distToSurface = Math.abs(localY) - thickness;

      if (distToSurface < 0.01) {
        // BOUNDARY LAYER (Blasius)
        const eta = distToSurface * 200;
        const f = eta < 5 ? 0.332 * eta : 1 - Math.exp(-eta/1.5);
        speed = f * 2.5;
        const tangent = localY > 0 ? 1 : -1;
        u = speed * 0.98;
        v = tangent * speed * 0.02;
        this.inBL = true;
      } else {
        // Potential flow
        const vel = panel.velocityAt(localX, localY, angleOfAttack);
        u = vel.u * 2.2;
        v = vel.v * 2.2;
        speed = vel.speed * 2.2;

        // Separation detection
        if (angleOfAttack > 12 && localX > 0.3 && localY > 0.01) {
          v += 1.5;
          u *= 0.5;
          this.separated = true;
        }
      }
    } else {
      u = 2.0;
      v = 0;
    }

    this.x += u;
    this.y += v;

    this.age++;
    if (this.x > w + 100 || this.age > 600) this.reset();
  }

  draw() {
    if (this.trail.length < 2) return;

    const speed = this.trail.length > 1 ?
      Math.hypot(this.x - this.trail[this.trail.length-2].x, this.y - this.trail[this.trail.length-2].y) : 1;
    const hue = this.inBL ? 30 : this.separated ? 0 : (180 + speed * 40);
    const alpha = this.inBL ? 0.95 : 0.75;
    const width = this.inBL ? 3.2 : 1.8;

    ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    this.trail.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Photon head
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 8);
    g.addColorStop(0, `hsla(${hue}, 100%, 95%, 1)`);
    g.addColorStop(0.4, `hsla(${hue}, 100%, 80%, 0.8)`);
    g.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI*2);
    ctx.fill();
  }
}

const photons = Array.from({length: 300}, () => new Photon());

/* ---------- Animation ---------- */
function animate() {
  ctx.fillStyle = 'rgba(10,10,26,0.06)';
  ctx.fillRect(0,0,w,h);

  panel.solve(angleOfAttack);
  photons.forEach(p => { p.update(); p.draw(); });
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

/* ---------- Mouse Control ---------- */
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const dist = mx - w/2;
  angleOfAttack = (dist/(w/3))*25;
  if (angleOfAttack < -25) angleOfAttack = -25;
  if (angleOfAttack > 25) angleOfAttack = 25;
  el.aoa.innerHTML = `${angleOfAttack.toFixed(1)}<span class="unit">°</span>`;
  el.angleControl.textContent = `${angleOfAttack.toFixed(1)}°`;
});
