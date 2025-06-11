// === script.js (最終版) ===
// 1. メンバーデータ + 画像のプレロード
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

function preloadAll() {
  return fetch("members.json")
    .then(res => res.json())
    .then(data => {
      members = data;
      baseAspect = canvas.height / canvas.width;
      const promises = members.map(m => new Promise(res => {
        const img = new Image();
        img.src = m.image;
        img.onload = () => { preloadedImages[m.name_ja] = img; res(); };
        img.onerror = () => { preloadedImages[m.name_ja] = null; res(); };
      }));
      return Promise.all(promises);
    });
}

// 2. 初期化
preloadAll().then(initialize);
function initialize() {
  setupListeners();
  updateAndRender();
}

// 3. 更新→描画
function updateAndRender() {
  updateGrid();
  renderGrid();
}

// 4. グリッド更新（全員・期別・カスタム）
function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cbAll = document.getElementById("showAll");
  const cbKi  = document.getElementById("showKi");
  const selKi = document.getElementById("kibetsuSelect");

  if (cbAll.checked) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m,i)=> grid[i] = m.name_ja);
  }
  else if (cbKi.checked) {
    const filtered = members.filter(m=>m.ki===selKi.value).map(m=>m.name_ja);
    grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
    filtered.forEach((n,i)=> grid[i] = n);
  }
  else {
    grid = Array(cols * rows).fill(null).map((_,i)=> grid[i]||null);
  }
  resizeCanvas(cols, grid.length);
}
function resizeCanvas(cols, total) {
  const rows = Math.ceil(total/cols);
  const cellW = canvas.width/cols;
  const cellH = cellW*baseAspect;
  const header = document.getElementById("showKonmei").checked ? 40 : 0;
  canvas.height = rows*cellH + header;
}

// 5. 描画
function renderGrid(targetCanvas=canvas, targetCtx=ctx) {
  const isDownload = targetCanvas!==canvas;
  const scale = targetCanvas.width/baseCanvasWidth;

  // 背景
  targetCtx.fillStyle='#fff4f6';
  targetCtx.fillRect(0,0,targetCanvas.width,targetCanvas.height);

  // ヘッダー
  const showKon = document.getElementById("showKonmei").checked;
  const hdr = showKon?40*scale:0;
  if(showKon) {
    targetCtx.fillStyle='#F676A6';
    targetCtx.font=`${24*scale}px KozGoPr6N`;
    targetCtx.textAlign='left';
    const v = document.getElementById("konmeiSelect").value;
    const txt = v==='other'?document.getElementById("customKonmei").value.trim():v;
    targetCtx.fillText(txt,10*scale,30*scale);
  }

  // グリッドサイズ
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = targetCanvas.width/cols;
  const cellH = cellW*baseAspect;

  // フラグ
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick  = document.getElementById("showNickname").checked;
  const showKi    = document.getElementById("showKi").checked;
  const showBlk   = document.getElementById("showColorBlock").checked;
  const showTxt   = document.getElementById("showColorText").checked;

  // 互斥
  if(showBlk&&showTxt) document.getElementById("showColorText").checked=false;
  if(showTxt&&showBlk) document.getElementById("showColorBlock").checked=false;

  grid.forEach((name,i)=>{
    const r = Math.floor(i/cols), c = i%cols;
    const x = c*cellW, y = r*cellH+hdr;
    // 背景＆罫線
    targetCtx.fillStyle='#fff4f6'; targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle='#F676A6'; targetCtx.strokeRect(x,y,cellW,cellH);

    if(!name) {
      if(!isDownload){
        targetCtx.fillStyle='#F676A6';
        targetCtx.font=`${24*scale}px KozGoPr6N`;
        targetCtx.textAlign='center';targetCtx.textBaseline='middle';
        targetCtx.fillText('+',x+cellW/2,y+cellH/2);
      }
      return;
    }
    const mem = members.find(m=>m.name_ja===name);
    let yOff=y+5*scale;

    // 写真
    if(showPhoto&&preloadedImages[name]){
      const img=preloadedImages[name]; const asp=img.naturalWidth/img.naturalHeight;
      let h=cellH*0.25,w=h*asp;
      if(w>cellW*0.8){w=cellW*0.8;h=w/asp;}
      targetCtx.drawImage(img,x+(cellW-w)/2,yOff,w,h);
      yOff+=h+5*scale;
    }

    // 使用高さ
    let used=0; if(showPhoto) used+=cellH*0.3; if(showNick) used+=cellH*0.1; if(showBlk||showTxt) used+=cellH*0.15;
    const avail=cellH-used - (showPhoto?5*scale:0);

    // 名前
    const len=name.length;
    let fz=Math.min(avail*0.4,(cellW-20*scale)/(len*0.6));
    targetCtx.fillStyle='#F676A6';targetCtx.textAlign='center';targetCtx.textBaseline='top';
    targetCtx.font=`${fz*scale}px KozGoPr6N`;
    targetCtx.fillText(name,x+cellW/2,yOff);
    yOff+=fz+3*scale;

    // ネック
    if(showNick){
      const sz=Math.min(20*scale,avail*0.15);
      targetCtx.font=`${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.nickname,x+cellW/2,yOff);
      yOff+=sz+3*scale;
    }

    // 期テキスト
    if(showKi){
      const sz=Math.min(20*scale,avail*0.15);
      targetCtx.font=`${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.ki,x+cellW/2,yOff);
      yOff+=sz+3*scale;
    }

    // 推しカラー(文字)
    if(showTxt){
      const map={'#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青','#00FF00':'緑','#FFFFFF':'白','#FF69B4':'濃いピンク','#FFB6C1':'薄ピンク','#32CD32':'黄緑'};
      targetCtx.textBaseline='middle';
      const arr=mem.colors,sep=' x ';
      let tot=0;
      arr.forEach((c,i)=>{ const t=map[c]||''; tot+=ctx.measureText(t).width; if(i<arr.length-1) tot+=ctx.measureText(sep).width; });
      let xx=x+(cellW-tot)/2;
      arr.forEach((c,i)=>{
        const t=map[c]||'';
        targetCtx.fillStyle=(c==='#FFFFFF')?'#f5f2f2':c;
        targetCtx.font=`${18*scale}px KozGoPr6N`;
        targetCtx.fillText(t,xx,y+cellH*0.75);
        xx+=targetCtx.measureText(t).width;
        if(i<arr.length-1){ targetCtx.fillStyle='#F676A6'; targetCtx.fillText(sep.trim(),xx,y+cellH*0.75); xx+=targetCtx.measureText(sep.trim()).width; }
      });
    }
    // 推しカラー(色)
    else if(showBlk){
      const arr=mem.colors; const blk=Math.min(cellW/(arr.length*1.2),40*scale); const tw=blk*arr.length;
      arr.forEach((c,j)=>{ targetCtx.fillStyle=c||'#f0f0f0'; targetCtx.fillRect(x+(cellW-tw)/2+j*blk,y+cellH*0.8,blk,blk); });
    }

    // 選択文字
    if(!isDownload){
      targetCtx.fillStyle='#F676A6';
      targetCtx.font=`${12*scale}px KozGoPr6N`;
      targetCtx.textAlign='right';targetCtx.textBaseline='top';
      targetCtx.fillText('選択',x+cellW-10*scale,y+10*scale);
    }
  });
}

// 6. イベント
function setupListeners() {
  // 推しカラー互斥
  const blk=document.getElementById('showColorBlock'), txt=document.getElementById('showColorText');
  blk.addEventListener('change',e=>{ if(e.target.checked) txt.checked=false; updateAndRender(); });
  txt.addEventListener('change',e=>{ if(e.target.checked) blk.checked=false; updateAndRender(); });

  // 期別
  const cbKi=document.getElementById('showKi'), selKi=document.getElementById('kibetsuSelect');
  cbKi.addEventListener('change',()=>{ document.getElementById('showAll').checked=false; updateAndRender(); });
  selKi.addEventListener('change',()=>{ if(cbKi.checked) updateAndRender(); });

  // それ以外
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKi),#controls select:not(#kibetsuSelect)')
    .forEach(el=>el.addEventListener('change',updateAndRender));

  // ポップアップ
  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect();
    const offY=document.getElementById("showKonmei").checked?40:0;
    const mx=e.clientX-rect.left, my=e.clientY-rect.top-offY;
    const cols=+document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW=canvas.width/cols, cellH=cellW*baseAspect;
    const col=Math.floor(mx/cellW), row=Math.floor(my/cellH), idx=row*cols+col;
    if(idx>=0&&idx<grid.length) showPopup(idx);
  });

  // ダウンロード
  document.getElementById('downloadButton').addEventListener('click',()=>{
    const tmp=document.createElement('canvas');tmp.width=canvas.width*2;tmp.height=canvas.height*2;
    const tctx=tmp.getContext('2d');tctx.fillStyle='#fff4f6';tctx.fillRect(0,0,tmp.width,tmp.height);
    renderGrid(tmp,tctx);
    const a=document.createElement('a');a.download='penlight_colors_300dpi.png';a.href=tmp.toDataURL();a.click();
  });
}

// 7. ポップアップ
function showPopup(idx) {
  currentIndex = idx;
  const popup=document.getElementById('popup');
  const periods=[...new Set(members.map(m=>m.ki))];
  let html='';
  periods.forEach(p=>{
    html+=`<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m=>m.ki===p).forEach(m=> html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
    html+='</div></details>';
  });
  html+=`<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.innerHTML=html;popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(it=>it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));it.classList.add('selected');});
  document.getElementById('popupSelectBtn').onclick=()=>{const s=popup.querySelector('.member-item.selected span');if(s){grid[currentIndex]=s.textContent;popup.style.display='none';updateAndRender();}};
  document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';
}
