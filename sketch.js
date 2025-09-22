/*  Siklus Air — p5.js
    - Navbar ada di HTML (Materi/Evaluasi/Biodata)
    - Simulasi: Evaporasi, Kondensasi (menempel ke awan & awan membesar), Presipitasi (tetes + trail), Kumpulan/Runoff (alir + riak)
    - Teks penjelas TIDAK permanen: muncul sebagai "toast" 4 detik saat tombol ℹ ditekan
*/

let STAGES = ["Evaporasi", "Kondensasi", "Presipitasi", "Kumpulan"];
let currentStage = 0,
  playing = true;
let particles = [],
  clouds = [],
  ripples = [],
  toasts = [];
let sun,
  ui,
  lakeY,
  sunIntensity = 0.6;

/* ---------- p5 lifecycle ---------- */
function setup() {
  const holder = document.querySelector(".canvas-holder");
  const w = holder ? holder.clientWidth : window.innerWidth - 32;
  const h = Math.max(480, Math.min(600, Math.round(window.innerHeight * 0.58)));
  createCanvas(w, h).parent(holder || document.body);
  lakeY = height * 0.78;

  sun = new Sun(width * 0.12, height * 0.18, 44);

  for (let i = 0; i < 3; i++) {
    const cx = width * 0.45 + i * 160;
    const cy = height * 0.22 + (i % 2 ? 12 : -8);
    clouds.push(new Cloud(cx, cy, 90 + random(10)));
  }

  spawnParticles(70);
  ui = new UI();
  ui.buildStageChips();
  bindControls();
}

function windowResized() {
  const holder = document.querySelector(".canvas-holder");
  const w = holder ? holder.clientWidth : window.innerWidth - 32;
  const h = Math.max(480, Math.min(600, Math.round(window.innerHeight * 0.58)));
  resizeCanvas(w, h);
  lakeY = height * 0.78;
}

function draw() {
  drawBackground();
  sun.update(playing ? 0.01 + sunIntensity * 0.02 : 0);
  sun.display(sunIntensity);

  // reset cloud condensation counts per frame
  for (const c of clouds) {
    c.resetFrame();
    c.update(playing ? 0.18 : 0);
  }

  for (const p of particles) {
    p.update();
  }

  for (const c of clouds) {
    c.applySwelling();
    c.display();
  }
  for (const p of particles) {
    p.display();
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].display();
    if (ripples[i].dead) ripples.splice(i, 1);
  }

  drawLake();

  // draw toast messages (appear only when asked)
  for (let i = toasts.length - 1; i >= 0; i--) {
    toasts[i].update();
    toasts[i].display();
    if (toasts[i].dead) toasts.splice(i, 1);
  }
}

/* ---------- World ---------- */
function drawBackground() {
  for (let y = 0; y < height; y++) {
    stroke(lerpColor(color(12, 18, 42), color(7, 12, 28), y / height));
    line(0, y, width, y);
  }
  noStroke();
  fill(22, 36, 72);
  beginShape();
  vertex(0, height * 0.64);
  for (let x = 0; x <= width; x += 40) {
    vertex(
      x,
      height * 0.64 -
        noise(x * 0.002, frameCount * 0.005) * 50 -
        sin(x * 0.01) * 6
    );
  }
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);
}
function drawLake() {
  let c1 = color(30, 95, 160, 230),
    c2 = color(20, 65, 120, 245);
  for (let y = lakeY; y < height; y++) {
    stroke(lerpColor(c1, c2, map(y, lakeY, height, 0, 1)));
    line(0, y, width, y);
  }
  noFill();
  stroke(200, 230, 255, 70);
  for (let i = 0; i < 10; i++) {
    let yy = lakeY + i * 12 + ((frameCount * 0.4) % 12);
    bezier(40, yy, width * 0.3, yy + 5, width * 0.7, yy - 5, width - 40, yy);
  }
}

/* ---------- Entities ---------- */
class Sun {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.a = 0;
  }
  update(s) {
    this.a += s;
  }
  display(intensity) {
    noStroke();
    for (let i = 6; i >= 1; i--) {
      let rr = this.r + i * 12,
        alpha = 8 + i * 7 + intensity * 20;
      fill(255, 210, 110, alpha);
      circle(this.x, this.y, rr * 2);
    }
    fill(255, 225, 130);
    circle(this.x, this.y, this.r * 2);
    push();
    translate(this.x, this.y);
    rotate(this.a);
    stroke(255, 225, 130, 140 + intensity * 80);
    strokeWeight(3);
    for (let i = 0; i < 12; i++) {
      let a = (TWO_PI / 12) * i;
      line(
        cos(a) * (this.r + 8),
        sin(a) * (this.r + 8),
        cos(a) * (this.r + 26),
        sin(a) * (this.r + 26)
      );
    }
    pop();
  }
}
class Cloud {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.base = w;
    this.sw = 0;
    this.off = random(1000);
    this.frameCount = 0;
  }
  update(speed) {
    this.x += sin(frameCount * 0.005 + this.off) * 0.05 * speed;
  }
  resetFrame() {
    this.frameCount = 0;
  }
  addCondensed() {
    this.frameCount++;
  }
  applySwelling() {
    this.sw = lerp(this.sw, constrain(this.frameCount * 0.3, 0, 35), 0.1);
  }
  get radius() {
    return (this.base + this.sw) * 0.5;
  }
  display() {
    const w = this.base + this.sw;
    noStroke();
    fill(210, 220, 255, 200);
    ellipse(this.x, this.y, w * 0.8, w * 0.5);
    fill(200, 210, 245, 170);
    ellipse(this.x - w * 0.3, this.y + 6, w * 0.55, w * 0.35);
    ellipse(this.x + w * 0.3, this.y + 4, w * 0.6, w * 0.4);
    ellipse(this.x, this.y - 10, w * 0.7, w * 0.42);
  }
}
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 2;
    this.alpha = 160;
    this.dead = false;
  }
  update() {
    if (!playing) return;
    this.r += 1.6;
    this.alpha -= 3;
    if (this.alpha <= 0) this.dead = true;
  }
  display() {
    noFill();
    stroke(190, 220, 255, this.alpha);
    ellipse(this.x, this.y + 2, this.r * 2, this.r * 0.6);
  }
}
class Toast {
  constructor(text) {
    this.text = text;
    this.t = 0;
    this.dead = false;
    this.max = 240; // frames ~4s @60fps
    // random position top area; width limits handled in draw
    this.x = width * 0.5;
    this.y = 60;
  }
  update() {
    this.t++;
    if (this.t > this.max) this.dead = true;
  }
  display() {
    const alpha =
      this.t < 20
        ? map(this.t, 0, 20, 0, 200)
        : this.t > this.max - 20
        ? map(this.t, this.max - 20, this.max, 200, 0)
        : 200;
    const w = min(width - 40, 560),
      h = 54;
    const bx = this.x - w / 2,
      by = this.y;
    fill(14, 21, 48, alpha);
    stroke(36, 50, 88, alpha);
    rect(bx, by, w, h, 12);
    noStroke();
    fill(210, 225, 255, alpha + 30);
    textAlign(LEFT, TOP);
    textSize(14);
    text(this.text, bx + 12, by + 10, w - 24, h - 20);
  }
}

/* particle with phases */
class WaterParticle {
  constructor(x, y, kind = 0) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.5, -0.25);
    this.size = random(3, 6);
    this.a = random(TWO_PI);
    this.prevX = this.x;
    this.prevY = this.y;
    this.resetColor();
  }
  resetColor() {
    if (this.kind === 0) this.col = color(120, 190, 255, 150); // uap
    if (this.kind === 1) this.col = color(196, 181, 253, 230); // kondensasi
    if (this.kind === 2) this.col = color(155, 205, 255, 255); // hujan
    if (this.kind === 3) this.col = color(52, 211, 153, 230); // kumpulan
  }
  nearestCloud() {
    let best = null,
      dmin = 1e9;
    for (const c of clouds) {
      const d = dist(this.x, this.y, c.x, c.y);
      if (d < dmin) {
        dmin = d;
        best = c;
      }
    }
    return best;
  }
  update() {
    if (!playing) return;
    this.prevX = this.x;
    this.prevY = this.y;

    if (currentStage === 0) {
      // evaporasi
      this.kind = 0;
      this.resetColor();
      this.vy += map(sunIntensity, 0, 1, -0.004, -0.012);
      this.y += this.vy + sin((this.a += 0.06)) * 0.08;
      this.x += this.vx + sin(this.a) * 0.025;
      if (this.y < height * 0.28) {
        this.kind = 1;
        this.resetColor();
        this.vx *= 0.2;
        this.vy = 0;
      }
    } else if (currentStage === 1) {
      // kondensasi: tarik ke tepi awan
      this.kind = 1;
      this.resetColor();
      const c = this.nearestCloud();
      if (c) {
        const ang =
          noise(this.x * 0.02, this.y * 0.02, frameCount * 0.01) * TWO_PI;
        const ringR = c.radius + 10 + sin(frameCount * 0.05 + this.a) * 2;
        const tx = c.x + cos(ang) * ringR;
        const ty = c.y + sin(ang) * ringR * 0.55;
        this.x = lerp(this.x, tx, 0.05);
        this.y = lerp(this.y, ty, 0.06);
        if (dist(this.x, this.y, c.x, c.y) < c.radius + 16) c.addCondensed();
      }
    } else if (currentStage === 2) {
      // presipitasi
      if (this.kind !== 2) {
        this.kind = 2;
        this.resetColor();
        this.vx = random(-0.15, 0.15);
        this.vy = random(2.8, 4.2);
      }
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.06;
      if (this.y > lakeY - 2) {
        ripples.push(new Ripple(this.x, lakeY));
        this.kind = 3;
        this.resetColor();
        this.y = lakeY - 3;
        this.vx = random(0.4, 1.2);
        this.vy = 0;
      }
    } else if (currentStage === 3) {
      // runoff
      this.kind = 3;
      this.resetColor();
      this.y = lerp(this.y, lakeY - 3, 0.12);
      this.x += this.vx + 0.48;
      this.vx = lerp(this.vx, 0.6, 0.02);
      if (this.x > width + 12) this.respawnBottom();
    }

    if (this.x < -12) this.x = width + 12;
    if (this.x > width + 12) this.x = -12;
    if (currentStage === 0 && this.y > height + 20) this.respawnBottom();
  }
  respawnBottom() {
    this.x = random(20, width - 20);
    this.y = random(lakeY - 2, lakeY + 10);
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.5, -0.25);
    this.kind = 0;
    this.resetColor();
    this.prevX = this.x;
    this.prevY = this.y;
  }
  display() {
    noStroke();
    if (this.kind === 0) {
      // uap
      fill(140, 190, 255, 70);
      circle(this.x, this.y, this.size * 2.2);
      fill(this.col);
      circle(this.x, this.y, this.size * 0.9);
      fill(255, 255, 255, 110);
      circle(
        this.x - this.size * 0.22,
        this.y - this.size * 0.22,
        this.size * 0.35
      );
    } else if (this.kind === 1) {
      // butir kondensasi
      fill(this.col);
      circle(this.x, this.y, this.size * 1.1);
      fill(255, 255, 255, 120);
      circle(
        this.x - this.size * 0.2,
        this.y - this.size * 0.2,
        this.size * 0.3
      );
    } else if (this.kind === 2) {
      // hujan
      stroke(this.col);
      strokeWeight(2);
      line(this.prevX, this.prevY, this.x, this.y);
      noStroke();
      fill(this.col);
      push();
      translate(this.x, this.y);
      rotate(atan2(this.y - this.prevY, this.x - this.prevX) + HALF_PI);
      ellipse(0, 0, this.size * 0.9, this.size * 1.8);
      pop();
    } else {
      // kumpulan
      fill(this.col);
      circle(this.x, this.y, this.size * 0.9);
      fill(255, 255, 255, 120);
      circle(
        this.x - this.size * 0.2,
        this.y - this.size * 0.2,
        this.size * 0.28
      );
    }
  }
}

/* ---------- UI ---------- */
class ButtonChip {
  constructor(i, label) {
    this.i = i;
    this.el = document.createElement("button");
    this.el.className = "chip";
    this.el.textContent = label;
    this.el.onclick = () => {
      currentStage = this.i;
      ui.updateStageChips();
    };
  }
  mount(p) {
    p.appendChild(this.el);
  }
  setActive(b) {
    this.el.classList.toggle("active", !!b);
  }
}
class UI {
  constructor() {
    this.chips = [];
  }
  buildStageChips() {
    const cont = document.getElementById("stageChips");
    cont.innerHTML = "";
    this.chips = [];
    STAGES.forEach((nm, i) => {
      const c = new ButtonChip(i, nm);
      c.mount(cont);
      this.chips.push(c);
    });
    this.updateStageChips();
  }
  updateStageChips() {
    this.chips.forEach((c, i) => c.setActive(i === currentStage));
  }
}

/* ---------- Controls ---------- */
function bindControls() {
  const g = (id) => document.getElementById(id);
  g("btnPlay").onclick = () => (playing = !playing);
  g("btnSpawn").onclick = () => spawnParticles(25);
  g("btnPrev").onclick = prevStage;
  g("btnNext").onclick = nextStage;

  const slider = g("sunSlider");
  if (slider) {
    sunIntensity = slider.value / 100;
    slider.oninput = (e) => (sunIntensity = +e.target.value / 100);
  }

  // tombol info → tampilkan toast sesuai tahap (4 detik)
  g("btnInfo").onclick = () => showStageToast();
}

function keyPressed() {
  if (keyCode === 32) playing = !playing;
  else if (keyCode === RIGHT_ARROW) nextStage();
  else if (keyCode === LEFT_ARROW) prevStage();
}

function nextStage() {
  currentStage = (currentStage + 1) % STAGES.length;
  ui.updateStageChips();
}
function prevStage() {
  currentStage = (currentStage - 1 + STAGES.length) % STAGES.length;
  ui.updateStageChips();
}

function spawnParticles(n = 15) {
  for (let i = 0; i < n; i++) {
    particles.push(
      new WaterParticle(
        random(20, width - 20),
        random(lakeY - 2, lakeY + 10),
        0
      )
    );
  }
}

/* ---------- Toast helper ---------- */
function showStageToast() {
  const msgs = [
    "Evaporasi: air di permukaan menguap menjadi uap air.",
    "Kondensasi: uap menempel & mengelompok membentuk awan.",
    "Presipitasi: butir air membesar & jatuh sebagai hujan.",
    "Kumpulan/Runoff: air mengalir dan berkumpul kembali.",
  ];
  toasts.push(new Toast(msgs[currentStage]));
}
