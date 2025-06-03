// ========== 初期セットアップ ==========
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// コース画像
const trackImg = new Image();
trackImg.src   = "cource.png";

// オフスクリーンマスク
const maskCan = document.createElement("canvas");
const maskCtx = maskCan.getContext("2d");

trackImg.onload = () => {
  maskCan.width  = trackImg.width;
  maskCan.height = trackImg.height;
  maskCtx.drawImage(trackImg,0,0);
  requestAnimationFrame(update);
};

// ========== カートパラメータ ==========
const kart = {
  x:620, y:710, angle:-Math.PI/2,
  speed:0, width:28, height:16,
  maxSpeed:4.5, accel:.20, friction:.97, turnRate:.08
};

// ========== 入力（キー＋タッチ） ==========
const keys = Object.create(null);
addEventListener("keydown", e => keys[e.key]=true);
addEventListener("keyup",   e => keys[e.key]=false);

/* タッチボタンを擬似キーに変換 */
function bindTouch(id,key){
  const btn=document.getElementById(id);
  const set=v=>{keys[key]=v;};
  ["touchstart","mousedown"].forEach(ev=>btn.addEventListener(ev,e=>{
    e.preventDefault();set(true);
  }));
  ["touchend","touchcancel","mouseup","mouseleave"]
    .forEach(ev=>btn.addEventListener(ev,()=>set(false)));
}
bindTouch("btnGas","ArrowUp");
bindTouch("btnBrake","ArrowDown");
bindTouch("btnLeft","ArrowLeft");
bindTouch("btnRight","ArrowRight");

/* モバイル Safari での意図しないスクロール防止 */
addEventListener("touchmove",e=>e.preventDefault(),{passive:false});

// ========== 路面判定 ==========
function isRoad(x,y){
  if(x<0||y<0||x>=maskCan.width||y>=maskCan.height) return false;
  const [r,g,b] = maskCtx.getImageData(x,y,1,1).data;
  const diff=Math.max(r,g,b)-Math.min(r,g,b), br=(r+g+b)/3;
  return diff<12 && br>=60 && br<=140;      // 無彩色グレー帯
}

// ========== ゲームループ ==========
function update(){
  requestAnimationFrame(update);

  /* --- 入力 → 速度 & 角度 --- */
  if(keys.ArrowUp)   kart.speed+=kart.accel;
  if(keys.ArrowDown) kart.speed-=kart.accel*1.3;
  kart.speed*=kart.friction;
  kart.speed=Math.max(-kart.maxSpeed*.4,Math.min(kart.maxSpeed,kart.speed));

  if(keys.ArrowLeft)  kart.angle-=kart.turnRate*(kart.speed/kart.maxSpeed);
  if(keys.ArrowRight) kart.angle+=kart.turnRate*(kart.speed/kart.maxSpeed);

  const nx=kart.x+Math.cos(kart.angle)*kart.speed;
  const ny=kart.y+Math.sin(kart.angle)*kart.speed;

  if(isRoad(nx,ny)){ kart.x=nx; kart.y=ny; }
  else{ kart.speed*=-0.2; }

  /* --- 描画 --- */
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(trackImg,0,0);

  ctx.save();
    ctx.translate(kart.x,kart.y);
    ctx.rotate(kart.angle);
    ctx.fillStyle="#f33"; ctx.fillRect(-kart.width/2,-kart.height/2,kart.width,kart.height);
    ctx.fillStyle="#222";
    const w=kart.width*.6,h=kart.height*.3;
    ctx.fillRect(-w/2,-kart.height/2-1,w,h);
    ctx.fillRect(-w/2,kart.height/2-h+1,w,h);
  ctx.restore();
}
