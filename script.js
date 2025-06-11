// === script.js (最終完全版) ===
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

// メンバー読み込み＆画像プレロード
async function preloadAll() {
  const res = await fetch("members.json");
  members = await res.json();
  baseAspect = canvas.height / canvas.width;
  await Promise.all(members.map(m => new Promise(r => {
    const img = new Image(); img.src = m.image;
    img.onload = () => { preloadedImages[m.name_ja] = img; r(); };
    img.onerror = () => { preloadedImages[m.name_ja] = null; r(); };
  })));
}

// 初期化
preloadAll().then(() => {
  setupListeners();
  updateAndRender();
});

// 更新＋描画
function updateAndRender() {
  updateGrid();
  renderGrid();
}

// グリッド更新
function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const showAll = document.getElementById("showAll").checked;
  const useFilter = document.getElementById("showKibetsu").checked;
  const selFilter = document.getElementById("kibetsuSelect").value;

  if (showAll) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m,i)=> grid[i] = m.name_ja);
  } else if (useFilter) {
    const filtered = members.filter(m=>m.ki === selFilter).map(m=>m.name_ja);
    grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
    filtered.forEach((n,i)=> grid[i] = n);
  } else {
    grid = Array(cols * rows).fill(null).map((_,i)=> grid[i]||null);
  }
  resizeCanvas(cols, grid.length);
}
function resizeCanvas(cols, total) {
  const rows = Math.ceil(total / cols);
  const cellW = canvas.width / cols;
  const cellH = cellW * baseAspect;
  const header = document.getElementById("showKonmei").checked ? 40 : 0;
  canvas.height = rows * cellH + header;
}

// 描画
function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width / baseCanvasWidth;

  // 背景
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  // ヘッダー
  const hasKon = document.getElementById("showKonmei").checked;
  const hv = hasKon ? 40 * scale : 0;
  if (hasKon) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24*scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const v = document.getElementById("konmeiSelect").value;
    const t = v==='other'?document.getElementById("customKonmei").value.trim():v;
    targetCtx.fillText(t, 10*scale, 30*scale);
  }

  // グリッド
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = targetCanvas.width / cols;
  const cellH = cellW * baseAspect;

  // フラグ
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick  = document.getElementById("showNickname").checked;
  const showKiTxt = document.getElementById("showKi").checked;
  let showBlk    = document.getElementById("showColorBlock").checked;
  let showTxt    = document.getElementById("showColorText").checked;

  // 排他かつ必ずどちらか選択
  if (showBlk === showTxt) {
    // 同じなら text を優先
    showBlk = false;
    document.getElementById("showColorBlock").checked = false;
    document.getElementById("showColorText").checked = true;
  }

  grid.forEach((name,i) => {
    const r = Math.floor(i/cols), c = i%cols;
    const x = c*cellW, y = r*cellH + hv;
    // 背景
    targetCtx.fillStyle='#fff4f6';targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle='#F676A6';targetCtx.strokeRect(x,y,cellW,cellH);

    if(!name) {
      if(!isDownload){
        targetCtx.fillStyle='#F676A6';targetCtx.font=`${24*scale}px KozGoPr6N`;
        targetCtx.textAlign='center';targetCtx.textBaseline='middle';
        targetCtx.fillText('+',x+cellW/2,y+cellH/2);
      }
      return;
    }

    const mem = members.find(m=>m.name_ja===name);
    let y0 = y + 5*scale;

    // 写真
    if(showPhoto && preloadedImages[name]){
      const img = preloadedImages[name];
      const asp = img.naturalWidth/img.naturalHeight;
      let h = cellH*0.25, w = h*asp;
      if(w>cellW*0.8){w=cellW*0.8;h=w/asp;}
      targetCtx.drawImage(img,x+(cellW-w)/2,y0,w,h);
      y0 += h + 5*scale;
    }

    // 利用可能縦幅
    let used=0; if(showPhoto) used+=cellH*0.3; if(showNick) used+=cellH*0.1; if(showBlk||showTxt) used+=cellH*0.15;
    const avail = cellH - used - (showPhoto?5*scale:0);

    // 名前
    const L=name.length;
    let fz=Math.min(avail*0.4,(cellW-20)/(L*0.6));
    targetCtx.fillStyle='#F676A6';targetCtx.textAlign='center';targetCtx.textBaseline='top';
    targetCtx.font=`${fz}px KozGoPr6N`;
    targetCtx.fillText(name,x+cellW/2,y0);
    y0+=fz+3;

    // ニック
    if(showNick){const s=Math.min(20,avail*0.15);targetCtx.font=`${s}px KozGoPr6N`;targetCtx.fillText(mem.nickname,x+cellW/2,y0);y0+=s+3;}
    // 期
    if(showKiTxt){const s=Math.min(20,avail*0.15);targetCtx.font=`${s}px KozGoPr6N`;targetCtx.fillText(mem.ki,x+cellW/2,y0);y0+=s+3;}

    // 推しカラー文字
    if(showTxt){
      const map={'#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青','#00FF00':'緑','#FFFFFF':'白','#FF69B4':'濃いピンク','#FFB6C1':'薄ピンク','#32CD32':'黄緑'};
      targetCtx.textBaseline='middle';
      const arr=mem.colors,sep=' x ';
      let tot=0;arr.forEach((c,i)=>{const t=map[c]||'';tot+=ctx.measureText(t).width+(i<arr.length-1?ctx.measureText(sep).width:0);});
      let xx=x+(cellW-tot)/2;
      arr.forEach((c,i)=>{const t=map[c]||'';targetCtx.fillStyle=(c==='#FFFFFF')?'#f5f2f2':c;targetCtx.font=`18px KozGoPr6N`;targetCtx.fillText(t,xx,y+cellH*0.75);xx+=ctx.measureText(t).width;if(i<arr.length-1){targetCtx.fillStyle='#F676A6';targetCtx.fillText(sep.trim(),xx,y+cellH*0.75);xx+=ctx.measureText(sep.trim()).width;}});
    }
    // 推しカラー色
    else if(showBlk){
      const arr=mem.colors;
      const blkW=cellW*(0.5/arr.length);
      const tw=blkW*arr.length;
      arr.forEach((c,j)=>{targetCtx.fillStyle=c||'#f0f0f0';targetCtx.fillRect(x+(cellW-tw)/2+j*blkW,y+cellH*0.8,blkW,blkW);});
    }

    // 選択
    if(!isDownload){targetCtx.fillStyle='#F676A6';targetCtx.font=`${12}px KozGoPr6N`;targetCtx.textAlign='right';targetCtx.textBaseline='top';targetCtx.fillText('選択',x+cellW-10,y+10);}
  });
}

// イベント設定
function setupListeners(){
  // 必ずどちらか
  const cbBlk=document.getElementById('showColorBlock'), cbTxt=document.getElementById('showColorText');
  cbBlk.addEventListener('change',e=>{ if(e.target.checked){cbTxt.checked=false;} else{e.target.checked=true;} updateAndRender(); });
  cbTxt.addEventListener('change',e=>{ if(e.target.checked){cbBlk.checked=false;} else{e.target.checked=true;} updateAndRender(); });

  // 期別
  const cbF=document.getElementById('showKibetsu'), selF=document.getElementById('kibetsuSelect');
  cbF.addEventListener('change',()=>{document.getElementById('showAll').checked=false; updateAndRender();});
  selF.addEventListener('change',()=>{if(cbF.checked) updateAndRender();});

  // その他
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKibetsu), #controls select:not(#kibetsuSelect)')
    .forEach(el=>el.addEventListener('change',updateAndRender));

  // ポップアップ
  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect();
    const off= document.getElementById("showKonmei").checked?40:0;
    const mx=e.clientX-rect.left, my=e.clientY-rect.top-off;
    const cols=+document.getElementById("ninzuSelect").value.split("x")[0];
    const w=canvas.width/cols, h=w*baseAspect;
    const col=Math.floor(mx/w), row=Math.floor(my/h);
    const idx=row*cols+col; if(idx>=0&&idx<grid.length) showPopup(idx);
  });

  // ダウンロード
  document.getElementById('downloadButton').addEventListener('click',async()=>{
    // images are already preloaded
    const tmp=document.createElement('canvas'); tmp.width=canvas.width*2; tmp.height=canvas.height*2;
    const tctx=tmp.getContext('2d'); tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tmp.width,tmp.height);
    renderGrid(tmp,tctx);
    const a=document.createElement('a'); a.download='penlight_colors_300dpi.png'; a.href=tmp.toDataURL(); a.click();
  });
}

// ポップアップ
function showPopup(idx){
  currentIndex=idx;
  const popup=document.getElementById('popup');
  const periods=[...new Set(members.map(m=>m.ki))];
  let html=''; periods.forEach(p=>{html+=`<details><summary>${p}</summary><div class="member-list">`;members.filter(m=>m.ki===p).forEach(m=>html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);html+='</div></details>'});
  html+=`<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.innerHTML=html; popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(it=>it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected')); it.classList.add('selected');});
  document.getElementById('popupSelectBtn').onclick=()=>{const s=popup.querySelector('.member-item.selected span'); if(s){grid[currentIndex]=s.textContent;popup.style.display='none';updateAndRender();}};
  document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';
}
