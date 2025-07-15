// ================= 基本セットアップと画像ロード（変更なし） =================
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
const trackImg = new Image(); trackImg.src = "cource.png";
const maskCan = document.createElement("canvas"), maskCtx = maskCan.getContext("2d");
trackImg.onload = () => { maskCan.width = maskCan.height = 768; maskCtx.drawImage(trackImg,0,0); initGame(); requestAnimationFrame(update); };

// ================= コース定義 =================
const TOTAL_LAPS = 3;

/* ★ スタートライン範囲を “ほぼコース中央線” に合わせて微調整 */
const START_ZONE = { x: 698-40, y: 345-15, w: 80, h: 30 };

/* ★ AI 用ウェイポイントをコース中心に 12 点配置し直し */
const WAYPOINTS = [
  {x:705,y:345}, {x:705,y:135}, {x:560,y:135}, {x:560,y:265},
  {x:420,y:265}, {x:420,y:115}, {x:250,y:115}, {x:250,y:585},
  {x:420,y:585}, {x:420,y:715}, {x:620,y:715}, {x:620,y:435}
];

// ================= カートクラス（変更なし） =================
class Kart{
  constructor(x,y,angle,color){this.x=x;this.y=y;this.angle=angle;this.color=color;
    this.speed=0;this.width=28;this.height=16;this.maxSpeed=3.6;this.accel=.16;this.friction=.97;this.turnRate=.08;}
  updatePhysics(l,r,a,b){
    if(a) this.speed+=this.accel; if(b) this.speed-=this.accel*1.3;
    this.speed*=this.friction; this.speed=Math.max(-this.maxSpeed*.4,Math.min(this.maxSpeed,this.speed));
    const f=this.speed/this.maxSpeed; if(l) this.angle-=this.turnRate*f; if(r) this.angle+=this.turnRate*f;
    const nx=this.x+Math.cos(this.angle)*this.speed, ny=this.y+Math.sin(this.angle)*this.speed;
    isRoad(nx,ny)?(this.x=nx,this.y=ny):(this.speed*=-.25);
  }
  draw(){
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
    ctx.fillStyle=this.color;ctx.fillRect(-14,-8,28,16);
    ctx.fillStyle="#222";const w=17,h=5;ctx.fillRect(-w/2,-9,w,h);ctx.fillRect(-w/2,4,w,h);
    ctx.restore();
  }
}

// ================= ゲーム状態変数 =================
let player, ai, keys, lapCount, finished, inStartZone, gameState,
    countdownStart, startTimestamp, aiTargetIdx;

// ================= 初期化 =================
function initGame(){
  /* ★ プレイヤーと AI をスタートラインの **中央縦一列** に並べる */
  const cx = START_ZONE.x + START_ZONE.w/2;
  const cy = START_ZONE.y + START_ZONE.h/2;
  const angleUp = -Math.PI/2;

  player = new Kart(cx, cy + 30, angleUp, "#f33");   // 前（赤）
  ai     = new Kart(cx, cy + 70, angleUp, "#39f");   // 後ろ（青）

  keys = Object.create(null); addEventListener("keydown",e=>keys[e.key]=true); addEventListener("keyup",e=>keys[e.key]=false);

  lapCount = 0; finished = false; inStartZone = false; aiTargetIdx = 0;
  gameState = "countdown"; countdownStart = performance.now();
}

// ================= 走路判定（変更なし） =================
function isRoad(x,y){
  if(x<0||y<0||x>=768||y>=768) return false;
  const [r,g,b] = maskCtx.getImageData(x,y,1,1).data;
  return Math.max(r,g,b) - Math.min(r,g,b) < 15;
}

// ================= メインループ =================
function update(ts){
  requestAnimationFrame(update);
  /* --- 状態遷移 --- */
  if(gameState==="countdown" && (ts-countdownStart)/1000>=4){ gameState="running"; startTimestamp=ts; }
  if(gameState==="running" && !finished){
    player.updatePhysics(keys.ArrowLeft,keys.ArrowRight,keys.ArrowUp,keys.ArrowDown);
    updateAI(ai);
    const nowZone = collideRectCircle(START_ZONE,player.x,player.y,8);
    if(!inStartZone&&nowZone){ lapCount++; if(lapCount>TOTAL_LAPS){finished=true;gameState="finished";} }
    inStartZone=nowZone;
  }
  /* --- 描画 --- */
  ctx.clearRect(0,0,768,768); ctx.drawImage(trackImg,0,0);
  player.draw(); ai.draw(); drawHUD(ts);
}

/* ===== AI ロジック ===== */
function updateAI(bot){
  const t = WAYPOINTS[aiTargetIdx], dx=t.x-bot.x, dy=t.y-bot.y, dist=Math.hypot(dx,dy);
  const desired = Math.atan2(dy,dx), diff=normalizeAngle(desired-bot.angle);
  bot.updatePhysics(diff<0,diff>0,true,false);
  if(dist<45) aiTargetIdx = (aiTargetIdx+1)%WAYPOINTS.length;
}

/* ===== HUD / カウントダウン ===== */
function drawHUD(ts){
  ctx.fillStyle="#fff"; ctx.font="28px sans-serif"; ctx.fillText(`Lap ${Math.min(lapCount,TOTAL_LAPS)}/${TOTAL_LAPS}`,20,40);
  if(gameState==="countdown"){ const s=(ts-countdownStart)/1000;
    const msg=s<1?"3":s<2?"2":s<3?"1":"GO!";
    ctx.font="bold 90px sans-serif"; ctx.textAlign="center";
    ctx.fillText(msg,384,410);
  }
  if(gameState==="finished"){ ctx.font="bold 72px sans-serif"; ctx.textAlign="center"; ctx.fillText("FINISH!",384,410); }
}

/* ===== ヘルパ ===== */
function collideRectCircle(r,cx,cy,cr){ const rx=Math.max(r.x,Math.min(cx,r.x+r.w)), ry=Math.max(r.y,Math.min(cy,r.y+r.h)); return (cx-rx)**2+(cy-ry)**2<cr**2; }
function normalizeAngle(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
