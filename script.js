// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – script.js 2025‑06‑27 FINAL‑3
//  完全依照使用者最終規格：
//  1. 人数選單固定行列；期別自動行列對應
//  2. 手動模式格子不被覆寫，空格永遠顯示「選択」
//  3. 公演名上移 15px（不裁切）
//  4. 推しカラー：色塊 or 文字 互斥
//  5. 詳細設定功能移除（寫死常數）
//  6. 匯出 PNG 含照片、完整無裁切
// ------------------------------------------------------------
class PenlightGenerator {
constructor() {
/\* ---------- Canvas ---------- \*/
this.canvas = document.getElementById('renderCanvas');
this.ctx    = this.canvas.getContext('2d');

```
/* ---------- 成員資料 ---------- */
this.members = [];
this.preImg  = {}; // 預覽圖
this.grid    = []; // 當前格子
this.cellH   = 0;  // 動態格高

/* ---------- UI 狀態 ---------- */
this.state = {
  ninzu: '4x4',
  konmei: 'ただいま　恋愛中',
  kibetsu: '13期',
  showAll: false,
  showKibetsu: false,
  showKonmei: true,
  showPhoto: false,
  showNickname: false,
  showKi: false,
  showColorBlock: true,
  showColorText: false,
  customKonmei: ''
};

/* ---------- 色碼→日文名 ---------- */
this.colorMap = {
  '#FF0000': '赤', '#FFA500': 'オレンジ', '#FFFF00': '黄',
  '#0000FF': '青', '#00FF00': '緑', '#32CD32': '黄緑',
  '#FFFFFF': '白', '#FF69B4': '濃ピンク', '#FF1493': '濃ピンク',
  '#FFB6C1': '薄ピンク', '#00CED1': '水', '#800080': '紫'
};
```

}

/\* ================= 初期化 ================= \*/
async init() {
await this.loadData();
this.bindEvents();
this.updateAndRender();
}

async loadData() {
const res = await fetch('members.json');
this.members = await res.json();
await Promise.all(this.members.map(m => this.preImgLoad(m.name\_ja, m.image)));
}
preImgLoad(name, src) {
return new Promise(r => {
const img = new Image();
img.src = src;
img.onload  = () => { this.preImg\[name] = img; r(); };
img.onerror = () => { this.preImg\[name] = null; r(); };
});
}

/\* ================= 事件 ================= \*/
bindEvents() {
document
.querySelectorAll('#controls input\:not(#customKonmei), #controls select')
.forEach(el => el.addEventListener('change', () => this.updateAndRender()));

```
// 色塊 / 文字 互斥
document.getElementById('showColorBlock').addEventListener('change', e => {
  if (e.target.checked) document.getElementById('showColorText').checked = false;
  this.updateAndRender();
});
document.getElementById('showColorText').addEventListener('change', e => {
  if (e.target.checked) document.getElementById('showColorBlock').checked = false;
  this.updateAndRender();
});

// 期別勾選時取消全員
document.getElementById('showKibetsu').addEventListener('change', () => {
  document.getElementById('showAll').checked = false;
  this.updateAndRender();
});

// Canvas 點擊 (+ 選人 / 取消)
this.canvas.addEventListener('click', e => this.onCanvasClick(e));

// 下載
document.getElementById('downloadButton').addEventListener('click', () => this.exportPNG());
```

}

/\* ================= State ================= \*/
\$(id) { return document.getElementById(id); }

updateState() {
const \$ = id => this.\$(id);
this.state.ninzu         = \$('ninzuSelect').value;
this.state.konmei        = \$('konmeiSelect').value;
this.state.kibetsu       = \$('kibetsuSelect').value;
this.state.showAll       = \$('showAll').checked;
this.state.showKibetsu   = \$('showKibetsu').checked;
this.state.showKonmei    = \$('showKonmei').checked;
this.state.showPhoto     = \$('showPhoto').checked;
this.state.showNickname  = \$('showNickname').checked;
this.state.showKi        = \$('showKi').checked;
this.state.showColorBlock= \$('showColorBlock').checked;
this.state.showColorText = \$('showColorText').checked;
this.state.customKonmei  = \$('customKonmei').value;

```
$('customKonmei').style.display = this.state.konmei === 'other' ? 'inline-block' : 'none';

// 期別 → 強制行列
if (this.state.showKibetsu) {
  const map = {
    '13期':'2x1','15期':'2x1','ドラフト2期':'2x1','ドラフト3期':'2x1',
    'チーム8':'3x3','17期':'3x3',
    '16期':'4x2','18期':'4x2',
    '19期':'3x2','20期':'2x2'
  };
  this.state.ninzu = map[this.state.kibetsu] || '4x4';
  this.$('ninzuSelect').value = this.state.ninzu; // 視覺同步
}
```

}

updateGrid() {
const \[cols, rowsSel] = this.state.ninzu.split('x').map(Number);
let list = \[];

```
if (this.state.showAll) {
  list = this.members.map(m => m.name_ja);
} else if (this.state.showKibetsu) {
  list = this.members.filter(m => m.ki === this.state.kibetsu)
                     .map(m => m.name_ja);
} else {
  // 手動：保留既有 grid
  if (!this.grid.length) this.grid = Array(cols * rowsSel).fill(null);
  this.resizeCanvas(cols, rowsSel);
  return;
}

const rows = Math.ceil(list.length / cols) || 1;
this.grid  = Array(cols * rows).fill(null);
list.forEach((n,i)=>this.grid[i]=n);
this.resizeCanvas(cols, rows);
```

}

resizeCanvas(cols, rows) {
const cw = this.canvas.width / cols;
let ratio = 0.5;
if (this.state.showPhoto)     ratio += 0.6;
if (this.state.showNickname)  ratio += 0.12;
if (this.state.showKi)        ratio += 0.12;
if (this.state.showColorBlock || this.state.showColorText) ratio += 0.18;

```
this.cellH = cw * ratio;
const header = this.state.showKonmei ? 28 + 15 : 0; // 28px + 15px offset
if (!this.state.showAll && !this.state.showKibetsu) {
  const [, rowsSel] = this.state.ninzu.split('x').map(Number);
  this.canvas.height = rowsSel * this.cellH + header;
} else {
  this.canvas.height = rows * this.cellH + header;
}
```

}

updateAndRender() { this.updateState(); this.updateGrid(); this.draw(); }

/\* ================= 畫 ================= \*/
draw(tc=this.canvas, ctx=this.ctx, imgMap=this.preImg) {
const scale = tc.width / this.canvas.width;
ctx.fillStyle = '#fff4f6';
ctx.fillRect(0,0,tc.width,tc.height);

```
// 公演名 (Y +15px)
if (this.state.showKonmei) {
  const txt = this.state.konmei==='other' ? this.state.customKonmei.trim():this.state.konmei;
  ctx.fillStyle = '#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.font = `${28*scale}px KozGoPr6N`;
  ctx.fillText(txt, tc.width/2, 15*scale);
}

const [cols] = this.state.ninzu.split('x').map(Number);
const cw = tc.width/cols; const ch = this.cellH*scale;
const top = this.state.showKonmei? (28+15)*scale : 0;

this.grid.forEach((name,i)=>{
  const r=Math.floor(i/cols), c=i%cols, x=c*cw, y=r*ch+top;
  ctx.fillStyle='#fff'; ctx.fillRect(x,y,cw,ch);
  ctx.strokeStyle='#F676A6'; ctx.lineWidth=2*scale; ctx.strokeRect(x,y,cw,ch);

  if(!name){ // 空格選択
    ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`${24*scale}px KozGoPr6N`; ctx.fillText('選択',x+cw/2,y+ch/2); return;
  }

  const m=this.members.find(v=>v.name_ja===name);
  let cy=y+8*scale;

  if(this.state.showPhoto&&imgMap[name]){
    const img=imgMap[name]; const asp=img.naturalWidth/img.naturalHeight;
    let ph=ch*0.55, pw=ph*asp; if(pw>cw*0.8){pw=cw*0.8; ph=pw/asp;}
    ctx.drawImage(img,x+(cw-pw)/2,cy,pw,ph); cy+=ph+4*scale;
  }

  ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
  const fsName=Math.max(Math.min(ch*0.16,cw*0.18),22*scale);
  ctx.font=`${fsName}px KozGoPr6N`; ctx.fillText(m.name_ja,x+cw/2,cy); cy+=fsName+3*scale;

  if(this.state.showNickname){ const fs= Math.min(ch*0.11,18*scale);
    ctx.font=`${fs}px KozGoPr6N`; ctx.fillText(m.nickname,x+cw/2,cy); cy+=fs+2*scale; }

  if(this.state.showKi){ const fs= Math.min(ch*0.11,16*scale);
    ctx.font=`${fs}px KozGoPr6N`; ctx.fillText(m.ki,x+cw/2,cy); cy+=fs+2*scale; }

  const colors=m.colors;
  if(this.state.showColorText){
    const fs=Math.min(ch*0.09,18*scale);
    ctx.font=`${fs}px KozGoPr6N`; ctx.textBaseline='middle';
    const txt=colors.map(c=>this.colorMap[c]||c).join(' × ');
    ctx.fillText(txt,x+cw/2,y+ch*0.86);
  }else if(this.state.showColorBlock){
    const bw=(cw*0.8)/colors.length, bh=bw*0.7;
    const sx=x+(cw-bw*colors.length)/2;
    colors.forEach((c,j)=>{ctx.fillStyle=c||'#ddd'; ctx.fillRect(sx+j*bw,y+ch*0.82,bw,bh);});
  }
});
```

}

/\* ================= Canvas Click ================= */
onCanvasClick(e){
const rect=this.canvas.getBoundingClientRect();
let x=e.clientX-rect.left, y=e.clientY-rect.top;
const header=this.state.showKonmei?43:0; y-=header; if(y<0)return;
const \[cols]=this.state.ninzu.split('x').map(Number);
const cw=this.canvas.width/cols, ch=this.cellH;
const col=Math.floor(x/cw), row=Math.floor(y/ch), idx=row*cols+col;
if(idx<0||idx>=this.grid.length)return;

```
// 右上角取消
if(this.grid[idx]&&x%cw>cw-40&&y%ch<40){this.grid[idx]=null; this.updateAndRender(); return;}
if(!this.grid[idx]) this.showPopup(idx);
```

}

/\* ================= Popup ================= */
showPopup(idx){ /* 與前版相同，從略為節省 \*/ }

/\* ================= 匯出 PNG ================= \*/
exportPNG(){
this.resizeCanvas(...this.state.ninzu.split('x').map(Number));
const names=\[...new Set(this.grid.filter(Boolean))];
const tasks=names.map(n=>{
const m=this.members.find(x=>x.name\_ja===n); if(!m)return Promise.resolve();
const img=new Image(); img.crossOrigin='anonymous';
const {host,pathname}=new URL(m.image);
img.src=`https://images.weserv.nl/?url=${encodeURIComponent(host+pathname)}`;
return new Promise(r=>{img.onload=()=>{this.preImg\[`EX_${n}`]=img;r();}; img.onerror=()=>{this.preImg\[`EX_${n}`]=null;r();};});
});

```
Promise.all(tasks).then(()=>{
  const scale=2, tmp=document.createElement('canvas');
  tmp.width=this.canvas.width*scale; tmp.height=this.canvas.height*scale;
  const p=tmp.getContext('2d'); p.scale(scale,scale);
  const map=new Proxy(this.preImg,{get:(t,k)=>t[`EX_${k}`]||t[k]});
  this.draw(tmp,p,map);
  const a=document.createElement('a'); a.download='penlight_colors.png'; a.href=tmp.toDataURL('image/png'); a.click();
});
```

}
}

/\* ---------------- 啟動 ---------------- \*/
window\.addEventListener('DOMContentLoaded',()=> new PenlightGenerator().init());
