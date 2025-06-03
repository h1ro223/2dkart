/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------- コースパラメータ ----------
const TRACK = {
  outer: { x: 50,  y: 50,  w: 700, h: 500, r: 60 },  // 外周（長方形＋丸角）
  inner: { x: 200, y: 150, w: 400, h: 300, r: 40 },  // 内側くり抜き
  roadColor: "#7a7a7a",
  lineColor: "#ffffff",
  lineWidth: 4,
};

// ---------- カートパラメータ ----------
const kart = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  angle: -Math.PI / 2,   // 上向きスタート
  speed: 0,
  width: 34,
  height: 20,
  maxSpeed: 4,
  accel: 0.15,
  friction: 0.96,
  turnRate: 0.045,
  colorBody: "#ff0000",
  colorWheel: "#222",
};

// ---------- 入力 ----------
const keys = {};
addEventListener("keydown", (e) => (keys[e.key] = true));
addEventListener("keyup",   (e) => (keys[e.key] = false));

// ---------- 描画用ユーティリティ ----------
function roundedRectPath({ x, y, w, h, r }) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---------- ゲームループ ----------
function update() {
  requestAnimationFrame(update);

  // --- 物理更新 ---
  if (keys["ArrowUp"])   kart.speed += kart.accel;
  if (keys["ArrowDown"]) kart.speed -= kart.accel * 1.2;

  kart.speed *= kart.friction;
  kart.speed = Math.max(-kart.maxSpeed * 0.5, Math.min(kart.maxSpeed, kart.speed));

  if (keys["ArrowLeft"])  kart.angle -= kart.turnRate * (kart.speed / kart.maxSpeed);
  if (keys["ArrowRight"]) kart.angle += kart.turnRate * (kart.speed / kart.maxSpeed);

  kart.x += Math.cos(kart.angle) * kart.speed;
  kart.y += Math.sin(kart.angle) * kart.speed;

  // --- 外周で簡易衝突（出すぎないよう反発）---
  const margin = 10;
  kart.x = Math.max(TRACK.outer.x + margin, Math.min(TRACK.outer.x + TRACK.outer.w - margin, kart.x));
  kart.y = Math.max(TRACK.outer.y + margin, Math.min(TRACK.outer.y + TRACK.outer.h - margin, kart.y));

  // --- 描画 ---
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // コース（外側 → くり抜き → ライン）
  ctx.fillStyle = TRACK.roadColor;
  roundedRectPath(TRACK.outer);
  roundedRectPath(TRACK.inner);
  ctx.fill("evenodd");             // evenodd で穴を開ける

  ctx.lineWidth = TRACK.lineWidth;
  ctx.strokeStyle = TRACK.lineColor;
  roundedRectPath(TRACK.outer);
  ctx.stroke();
  roundedRectPath(TRACK.inner);
  ctx.stroke();

  // カート本体
  ctx.save();
  ctx.translate(kart.x, kart.y);
  ctx.rotate(kart.angle);
  ctx.fillStyle = kart.colorBody;
  ctx.fillRect(-kart.width / 2, -kart.height / 2, kart.width, kart.height);

  // 車輪
  ctx.fillStyle = kart.colorWheel;
  const w = kart.width * 0.5, h = kart.height * 0.25;
  ctx.fillRect(-w / 2, -kart.height / 2 - 2, w, h);          // 前
  ctx.fillRect(-w / 2,  kart.height / 2 - h + 2, w, h);      // 後
  ctx.restore();
}

update();
