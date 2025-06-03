// ================= 基本セットアップ =================
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// -- コース画像 --
const trackImg = new Image();
trackImg.src = "cource.png";

// -- 路面マスク用オフスクリーン --
const maskCan = document.createElement("canvas");
const maskCtx = maskCan.getContext("2d");

// 画像ロード後にゲーム開始
trackImg.onload = () => {
  maskCan.width  = trackImg.width;
  maskCan.height = trackImg.height;
  maskCtx.drawImage(trackImg, 0, 0);

  initGame();
  requestAnimationFrame(update);
};

// ================= ゲーム定数 =================
const TOTAL_LAPS = 3;

// スタート／ゴールライン（座標は画像基準）★要調整
const START_ZONE = { x: 645, y: 330, w: 100, h: 30 };

// AI 移動用ウェイポイント（コース中心付近を数カ所）★要調整
const WAYPOINTS = [
  {x:700,y:340},{x:700,y:120},{x:560,y:120},{x:560,y:260},
  {x:400,y:260},{x:400,y:100},{x:240,y:100},{x:240,y:580},
  {x:400,y:580},{x:400,y:700},{x:600,y:700},{x:600,y:420}
];

// ================= カート共通クラス =================
class Kart {
  constructor(x,y,angle,color){
    this.x=x; this.y=y; this.angle=angle;
    this.speed=0;
    this.width=28; this.height=16;
    this.color=color;
    this.maxSpeed=3.6;
    this.accel=0.16;
    this.friction=0.97;
    this.turnRate=0.08;
  }
  updatePhysics(inputLeft,inputRight,inputAccel,inputBrake){
    // 速度
    if(inputAccel) this.speed+=this.accel;
    if(inputBrake) this.speed-=this.accel*1.3;
    this.speed*=this.friction;
    this.speed=Math.max(-this.maxSpeed*0.4,
                        Math.min(this.maxSpeed,this.speed));

    // ステアリング
    const steerFactor = (this.speed/this.maxSpeed);
    if(inputLeft)  this.angle-=this.turnRate*steerFactor;
    if(inputRight) this.angle+=this.turnRate*steerFactor;

    // 移動試行
    const nx = this.x + Math.cos(this.angle)*this.speed;
    const ny = this.y + Math.sin(this.angle)*this.speed;

    if(isRoad(nx,ny)){ this.x=nx; this.y=ny; }
    else{ this.speed*=-0.25; }
  }
  draw(){
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle=this.color;
    ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
    ctx.fillStyle="#222";
    const w=this.width*0.6,h=this.height*0.3;
    ctx.fillRect(-w/2,-this.height/2-1,w,h);   // 前輪
    ctx.fillRect(-w/2, this.height/2-h+1,w,h); // 後輪
    ctx.restore();
  }
}

// ================== 変数 ==================
let player;
let ai;
let keys;
let lapCount, finished;
let inStartZone, startTimestamp;
let gameState;   // "countdown" | "running" | "finished"
let countdownStart;        // epoch ms
let aiTargetIdx;

// ================== 初期化 ==================
function initGame(){
  /* プレイヤー & AI をスタートライン中央に並べる */
  const startX = START_ZONE.x + START_ZONE.w/2;
  const startY = START_ZONE.y + START_ZONE.h/2 + 20; // 少し後ろ
  const angleUp = -Math.PI/2;

  player = new Kart(startX, startY, angleUp, "#f33");
  ai     = new Kart(startX-40, startY+20, angleUp, "#39f");

  keys = Object.create(null);
  lapCount = 0;
  finished = false;
  inStartZone = false;
  aiTargetIdx = 0;

  /* 入力 */
  addEventListener("keydown",e=>keys[e.key]=true);
  addEventListener("keyup",  e=>keys[e.key]=false);

  /* カウントダウン開始 */
  gameState = "countdown";
  countdownStart = performance.now();
}

// ================== 路面判定 ==================
function isRoad(x,y){
  if(x<0||y<0||x>=maskCan.width||y>=maskCan.height) return false;
  const [r,g,b] = maskCtx.getImageData(x,y,1,1).data;
  const diff=Math.max(r,g,b)-Math.min(r,g,b);
  return diff < 15;           // ほぼ無彩色ならロード
}

// ================== ゲームループ ==================
function update(ts){
  requestAnimationFrame(update);

  /* ---------- 状態遷移 ---------- */
  if(gameState==="countdown"){
    const t = (ts - countdownStart)/1000;   // 秒
    if(t>=4){           // 3秒 + "GO!" 1秒
      gameState="running";
      startTimestamp=ts;
    }
  }

  if(gameState==="running" && !finished){
    // ---- プレイヤー入力 ----
    player.updatePhysics(
      keys.ArrowLeft, keys.ArrowRight,
      keys.ArrowUp,   keys.ArrowDown
    );

    // ---- AI 操作 ----
    updateAI(ai);

    // ---- ラップ判定 ----
    const nowInZone = collideRectCircle(START_ZONE, player.x, player.y, 8);
    if(!inStartZone && nowInZone){
      if(lapCount===0){
        // スタート時: ラップ 0 → 1
        lapCount=1;
      }else{
        lapCount++;
        if(lapCount > TOTAL_LAPS){
          finished = true;
          gameState = "finished";
        }
      }
    }
    inStartZone = nowInZone;
  }

  /* ---------- 描画 ---------- */
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(trackImg,0,0);

  // ライン可視化デバッグ（必要なら）
  //ctx.strokeStyle="rgba(255,0,0,.4)";
  //ctx.strokeRect(START_ZONE.x,START_ZONE.y,START_ZONE.w,START_ZONE.h);

  player.draw();
  ai.draw();

  drawHUD(ts);
}

/* === AI カートの簡易ロジック === */
function updateAI(bot){
  const tgt = WAYPOINTS[aiTargetIdx];
  const dx = tgt.x - bot.x, dy = tgt.y - bot.y;
  const dist = Math.hypot(dx,dy);

  // 方向をターゲットへ
  const desiredAngle = Math.atan2(dy,dx);
  const diff = normalizeAngle(desiredAngle - bot.angle);
  const turnLeft  = diff < 0;
  const turnRight = diff > 0;

  // スピードはプレイヤーより少し遅め
  bot.updatePhysics(turnLeft,turnRight,true,false);

  // 近づいたら次ウェイポイント
  if(dist < 50){
    aiTargetIdx = (aiTargetIdx+1) % WAYPOINTS.length;
  }
}

/* === HUD & カウントダウン表示 === */
function drawHUD(ts){
  ctx.fillStyle="#fff";
  ctx.font="28px sans-serif";
  ctx.textAlign="left";
  ctx.fillText(`Lap ${Math.min(lapCount,TOTAL_LAPS)}/${TOTAL_LAPS}`, 20, 40);

  if(gameState==="countdown"){
    const t = (ts - countdownStart)/1000;
    let msg = "";
    if(t<1)      msg="3";
    else if(t<2) msg="2";
    else if(t<3) msg="1";
    else         msg="GO!";
    ctx.font="bold 96px sans-serif";
    ctx.textAlign="center";
    ctx.fillText(msg, canvas.width/2, canvas.height/2+32);
  }
  if(gameState==="finished"){
    ctx.font="bold 72px sans-serif";
    ctx.textAlign="center";
    ctx.fillText("FINISH!", canvas.width/2, canvas.height/2+32);
  }
}

/* === 便利関数 === */
// rect と円（カート中心点）の簡易衝突
function collideRectCircle(rect,cx,cy,r){
  const rx = Math.max(rect.x, Math.min(cx, rect.x+rect.w));
  const ry = Math.max(rect.y, Math.min(cy, rect.y+rect.h));
  return (cx-rx)**2 + (cy-ry)**2 < r**2;
}
// 角度差を -π..π に正規化
function normalizeAngle(a){
  while(a> Math.PI) a-=2*Math.PI;
  while(a<-Math.PI) a+=2*Math.PI;
  return a;
}
