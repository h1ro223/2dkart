// ============ 基本セットアップ ============
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// ------- コース画像をロード -------
const trackImg = new Image();
trackImg.src = "cource.png";

// 路面マスク用オフスクリーン
const maskCan = document.createElement("canvas");
const maskCtx = maskCan.getContext("2d");

// 画像ロード後にゲーム開始
trackImg.onload = () => {
  maskCan.width  = trackImg.width;
  maskCan.height = trackImg.height;
  maskCtx.drawImage(trackImg, 0, 0);
  requestAnimationFrame(update);
};

// ============ カート設定 ============
const kart = {
  x: 620,        // スタート位置はコースに合わせて調整
  y: 710,
  angle: -Math.PI / 2,
  speed: 0,
  width: 28,
  height: 16,
  maxSpeed: 4.5,
  accel: 0.18,
  friction: 0.97,
  turnRate: 0.08   // ←曲がりやすく
};

// ============ 入力管理 (共通) ============
const keys = {};
addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup",   e => keys[e.key] = false);

// ============ タッチ → 疑似キー ============
function bindTouch(id, keyName){
  const btn = document.getElementById(id);
  const set = v => { keys[keyName] = v; };          // true / false
  ["touchstart","mousedown"].forEach(ev => btn.addEventListener(ev, e=>{
    e.preventDefault(); set(true);
  }));
  ["touchend","touchcancel","mouseup","mouseleave"].forEach(ev=>btn.addEventListener(ev, _=>{
    set(false);
  }));
}
bindTouch("btnGas",   "ArrowUp");
bindTouch("btnBrake", "ArrowDown");
bindTouch("btnLeft",  "ArrowLeft");
bindTouch("btnRight", "ArrowRight");

// ============ 路面判定 ============
function isRoad(x, y){
  if(x<0 || y<0 || x>=maskCan.width || y>=maskCan.height) return false;

  const [r,g,b] = maskCtx.getImageData(x, y, 1, 1).data;
  const diff = Math.max(r,g,b) - Math.min(r,g,b);     // 無彩色度
  const br   = (r+g+b)/3;                             // 明度
  return diff < 12 && br >= 60 && br <= 140;          // ≒グレー
}

// ============ メインループ ============
function update(){
  requestAnimationFrame(update);

  /* ---- 入力 → 速度／角度 ---- */
  if(keys["ArrowUp"])   kart.speed += kart.accel;
  if(keys["ArrowDown"]) kart.speed -= kart.accel * 1.3;
  kart.speed *= kart.friction;
  kart.speed = Math.max(-kart.maxSpeed*0.4, Math.min(kart.maxSpeed, kart.speed));

  if(keys["ArrowLeft"])  kart.angle -= kart.turnRate * (kart.speed/kart.maxSpeed);
  if(keys["ArrowRight"]) kart.angle += kart.turnRate * (kart.speed/kart.maxSpeed);

  const nextX = kart.x + Math.cos(kart.angle) * kart.speed;
  const nextY = kart.y + Math.sin(kart.angle) * kart.speed;

  /* ---- 路面判定 ---- */
  if(isRoad(nextX, nextY)){
    kart.x = nextX;
    kart.y = nextY;
  }else{
    kart.speed *= -0.2;          // 衝突でバウンド & 減速
  }

  /* ---- 描画 ---- */
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(trackImg,0,0);

  // --- カート ---
  ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(-kart.width/2, -kart.height/2, kart.width, kart.height);
    ctx.fillStyle = "#222";
    const w = kart.width*0.6, h = kart.height*0.3;
    ctx.fillRect(-w/2, -kart.height/2-1, w, h);       // 前輪
    ctx.fillRect(-w/2,  kart.height/2-h+1, w, h);     // 後輪
  ctx.restore();
}
