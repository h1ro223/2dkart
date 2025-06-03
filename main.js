// ============== 基本セットアップ ==============
const canvas = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

// ---------- トラック画像をロード ----------
const trackImg = new Image();
trackImg.src = 'cource.png';

// オフスクリーンキャンバスにコピーして “路面マスク” を作る
const maskCan = document.createElement('canvas');
const maskCtx = maskCan.getContext('2d');

trackImg.onload = () => {
  maskCan.width  = trackImg.width;
  maskCan.height = trackImg.height;
  maskCtx.drawImage(trackImg, 0, 0);
  requestAnimationFrame(update);      // 画像が準備できてからゲーム開始
};

// ============== カート設定 ==============
const kart = {
  x: 620,  y: 710,          // コース画像内のスタート地点（適宜調整）
  angle: -Math.PI / 2,
  speed: 0,
  width: 28,
  height: 16,
  maxSpeed: 4,
  accel: 0.15,
  friction: 0.96,
  turnRate: 0.05
};

// ============== 入力管理 ==============
const keys = {};
onkeydown = e => keys[e.key] = true;
onkeyup   = e => keys[e.key] = false;

// ============== ユーティリティ ==============
// 指定座標が“灰色ロード”かどうかを判定
function isRoad(x, y){
  // 画面外は NG
  if(x<0 || y<0 || x>=maskCan.width || y>=maskCan.height) return false;

  const [r,g,b] = maskCtx.getImageData(x, y, 1, 1).data;   // αは無視
  // コース画像ではロードがほぼ同じトーンのグレーなので
  return r > 120 && r < 170 && g > 120 && g < 170 && b > 120 && b < 170;
}

// ============== メインループ ==============
function update(){
  requestAnimationFrame(update);

  /* ---- 物理更新 ---- */
  if(keys['ArrowUp'])   kart.speed += kart.accel;
  if(keys['ArrowDown']) kart.speed -= kart.accel*1.2;
  kart.speed *= kart.friction;
  kart.speed = Math.max(-kart.maxSpeed*0.4, Math.min(kart.maxSpeed, kart.speed));

  if(keys['ArrowLeft'])  kart.angle -= kart.turnRate * (kart.speed/kart.maxSpeed);
  if(keys['ArrowRight']) kart.angle += kart.turnRate * (kart.speed/kart.maxSpeed);

  // 移動先を試算
  const nextX = kart.x + Math.cos(kart.angle) * kart.speed;
  const nextY = kart.y + Math.sin(kart.angle) * kart.speed;

  // 移動先がロードなら進む／オフロードなら減速してバウンド
  if(isRoad(nextX, nextY)){
    kart.x = nextX;
    kart.y = nextY;
  }else{
    kart.speed *= -0.3;   // 簡易反発
  }

  /* ---- 描画 ---- */
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(trackImg,0,0);          // 背景にコース画像

  // カート
  ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-kart.width/2, -kart.height/2, kart.width, kart.height);
    ctx.fillStyle = '#222';
    const w = kart.width*0.6, h = kart.height*0.3;
    ctx.fillRect(-w/2, -kart.height/2-1, w, h);       // 前輪
    ctx.fillRect(-w/2,  kart.height/2-h+1, w, h);     // 後輪
  ctx.restore();
}
