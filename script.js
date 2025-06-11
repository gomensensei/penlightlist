// === script.js (final update) ===
let grid = [];
let currentIndex = null;
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;
let members = [];
let preloadedImages = {};

// load members + preload images
fetch("members.json")
  .then(res=>res.json())
  .then(data=>{
    members = data;
    members.forEach(m=>{
      const img = new Image();
      img.src = m.image;
      img.onload = ()=> preloadedImages[m.name_ja] = img;
      img.onerror = ()=> preloadedImages[m.name_ja] = null;
    });
    baseAspect = canvas.height / canvas.width;
    init();
  });

function init(){
  setupListeners();
  updateAndRender();
}

function updateAndRender(){
  updateGrid();
  renderGrid();
}

function updateGrid(){
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  // 全員モード
  if(document.getElementById("showAll").checked){
    const rows = Math.ceil(members.length/cols);
    grid = Array(rows*cols).fill(null);
    members.forEach((m,i)=>grid[i] = m.name_ja);
    return;
  }
  // 期別フィルター
  if(document.getElementById("showKibetsu").checked){
    const kiVal = document.getElementById("kibetsuSelect").value;
    const filtered = members.filter(m=>m.ki === kiVal).map(m=>m.name_ja);
    const rows = Math.ceil(filtered.length/cols);
    grid = Array(rows*cols).fill(null);
    filtered.forEach((name,i)=> grid[i] = name);
    return;
  }
  // カスタムグリッド
  const rows = +document.getElementById("ninzuSelect").value.split("x")[1];
  const size = cols * rows;
  const newGrid = Array(size).fill(null);
  grid.forEach((name,i)=>{ if(i<size) newGrid[i] = name; });
  grid = newGrid;
}

function renderGrid(targetCanvas=canvas, targetCtx=ctx){
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width/baseCanvasWidth;
  // 背景
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0,0,targetCanvas.width,targetCanvas.height);
  // ヘッダー
  const showKon = document.getElementById("showKonmei").checked;
  const header = showKon ? 40*scale : 0;
  if(showKon){
    targetCtx.fillStyle='#F676A6';
    targetCtx.font = `${24*scale}px KozGoPr6N`;
    targetCtx.textAlign='left';
    const sel = document.getElementById("konmeiSelect").value;
    const txt = sel==='other' ? document.getElementById("customKonmei").value.trim() : sel;
    targetCtx.fillText(txt, 10*scale, 30*scale);
  }
  // グリッドサイズ
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = targetCanvas.width/cols;
  const cellH = cellW * baseAspect;
  // 表示設定フラグ
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick  = document.getElementById("showNickname").checked;
  const showKi    = document.getElementById("showKi").checked;
  const showCBlk  = document.getElementById("showColorBlock").checked;
  const showCTxt  = document.getElementById("showColorText").checked;
  // 排他制御
  if(showCBlk && showCTxt) document.getElementById("showCBlk").checked=false;
  if(showCTxt && showCBlk) document.getElementById("showCTxt").checked=false;

  for(let i=0;i<grid.length;i++){
    const row = Math.floor(i/cols), col = i%cols;
    const x = col*cellW, y = row*cellH + header;
    // 背景と罫線
    targetCtx.fillStyle='#fff4f6'; targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle='#F676A6'; targetCtx.strokeRect(x,y,cellW,cellH);
    const name = grid[i];
    if(!name){
      if(!isDownload){
        targetCtx.fillStyle='#F676A6';
        targetCtx.font=`${24*scale}px KozGoPr6N`;
        targetCtx.textAlign='center'; targetCtx.textBaseline='middle';
        targetCtx.fillText('+',x+cellW/2,y+cellH/2);
      }
      continue;
    }
    // 画像
    let yOffset = y;
    if(showPhoto && preloadedImages[name]){
      const img = preloadedImages[name];
      const asp = img.naturalWidth/img.naturalHeight;
      const h = cellH*0.3, w = h*asp > cellW*0.8 ? cellW*0.8 : h*asp;
      targetCtx.drawImage(img, x+(cellW-w)/2, y+5*scale, w, h);
      yOffset += h + 10*scale;
    }
    // フォントサイズ計算
    let usedH = 0;
    if(showPhoto) usedH += cellH*0.3;
    if(showNick)  usedH += cellH*0.1;
    if(showKi)    usedH += cellH*0.1;
    if(showCBlk||showCTxt) usedH += cellH*0.15;
    let availH = cellH - usedH;
    let nameF = availH * 0.6;
    nameF = Math.min(nameF, cellW/(name.length*0.6));
    // 名前
    targetCtx.fillStyle='#F676A6'; targetCtx.textAlign='center'; targetCtx.textBaseline='top';
    targetCtx.font = `${nameF*scale}px KozGoPr6N`;
    targetCtx.fillText(name, x+cellW/2, yOffset);
    yOffset += nameF + 5*scale;
    // ニックネーム
    if(showNick){
      const sz = Math.min(22*scale,availH*0.15);
      targetCtx.font=`${sz}px KozGoPr6N`;
      targetCtx.fillText(members.find(m=>m.name_ja===name).nickname, x+cellW/2, yOffset);
      yOffset += sz + 3*scale;
    }
    // 期
    if(showKi){
      const sz = Math.min(22*scale,availH*0.15);
      targetCtx.font=`${sz}px KozGoPr6N`;
      targetCtx.fillText(members.find(m=>m.name_ja===name).ki, x+cellW/2, yOffset);
      yOffset += sz + 3*scale;
    }
    // 推しカラー
    if(showCTxt){
      const map={ '#FF0000':'赤', '#FFA500':'オレンジ', '#FFFF00':'黄', '#0000FF':'青', '#00FF00':'緑', '#FFFFFF':'白', '#FF69B4':'ピンク', '#00CED1':'水', '#800080':'紫' };
      const colsArr = members.find(m=>m.name_ja===name).colors;
      targetCtx.font=`${18*scale}px KozGoPr6N`;
      let xOff = x + (cellW - colsArr.length*50)/2;
      colsArr.forEach((clr,i)=>{
        const txt=map[clr]||clr;
        targetCtx.fillStyle=clr;
        targetCtx.fillText(txt, xOff, y+cellH*0.75);
        xOff += targetCtx.measureText(txt).width;
        if(i<colsArr.length-1){
          targetCtx.fillStyle='#F676A6';
          targetCtx.fillText(' x ', xOff, y+cellH*0.75);
          xOff += targetCtx.measureText(' x ').width;
        }
      });
    } else if(showCBlk){
      const arr = members.find(m=>m.name_ja===name).colors;
      const blkSize = Math.min(40*scale, cellW/(arr.length*1.5));
      const totalW = blkSize*arr.length;
      arr.forEach((clr,j)=>{
        targetCtx.fillStyle=clr||'#f0f0f0';
        targetCtx.fillRect(x+(cellW-totalW)/2 + j*blkSize, y+cellH*0.8, blkSize, blkSize);
      });
    }
    // 選択×アイコン
    if(!isDownload){
      targetCtx.fillStyle='#F676A6'; targetCtx.font=`${12*scale}px KozGoPr6N`;
      targetCtx.textAlign='right'; targetCtx.textBaseline='top';
      targetCtx.fillText('選択', x+cellW-10*scale, y+10*scale);
    }
  }
}

function setupListeners(){
  // 操作パネル
  document.querySelectorAll('#controls input, #controls select').forEach(el=>{
    el.addEventListener('change',updateAndRender);
    el.addEventListener('input', updateAndRender);
  });
  document.getElementById('konmeiSelect').addEventListener('change',e=>{
    document.getElementById('customKonmei').style.display = e.target.value==='other'?'inline':'none';
  });
  // ポップアップ
  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top - (document.getElementById("showKonmei").checked?40:0);
    const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW = canvas.width/cols, cellH = cellW*baseAspect;
    const col = Math.floor(x/cellW), row=Math.floor(y/cellH), idx=row*cols+col;
    if(idx>=0&&idx<grid.length) showPopup(idx);
  });
  // ダウンロード
  document.getElementById('downloadButton').addEventListener('click',async()=>{
    const tmp=document.createElement('canvas'); tmp.width = canvas.width*2; tmp.height = canvas.height*2;
    const tctx = tmp.getContext('2d'); tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tmp.width,tmp.height);
    if(document.getElementById("showPhoto").checked){
      await new Promise(res=>{ const iv=setInterval(()=>{ if(Object.keys(preloadedImages).length===members.length){ clearInterval(iv); res(); } },100); });
    }
    renderGrid(tmp,tctx);
    const link=document.createElement('a'); link.download='penlight_colors_300dpi.png'; link.href=tmp.toDataURL(); link.click();
  });
}

function showPopup(idx){
  currentIndex=idx;
  const popup=document.getElementById('popup');
  const periods=[...new Set(members.map(m=>m.ki))];
  let html='';
  periods.forEach(p=>{
    html+=`<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m=>m.ki===p).forEach(m=> html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
    html+='</div></details>';
  });
  popup.innerHTML = html + `<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(item=> item.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected')); item.classList.add('selected');});
  document.getElementById('popupSelectBtn').onclick = ()=>{
    const sel=popup.querySelector('.member-item.selected span');
    if(sel){ grid[currentIndex]=sel.textContent; popup.style.display='none'; updateAndRender(); }
  };
  document.getElementById('popupCloseBtn').onclick = ()=> popup.style.display='none';
}
