// === script.js (完全版) ===
// 全メンバープレロード + 初期化
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

// 1) メンバーデータ読み込み＆画像プレロード
function preloadAll() {
  return fetch("members.json")
    .then(res => res.json())
    .then(data => {
      members = data;
      baseAspect = canvas.height / canvas.width;
      const promises = members.map(m => new Promise(resolve => {
        const img = new Image();
        img.src = m.image;
        img.onload = () => { preloadedImages[m.name_ja] = img; resolve(); };
        img.onerror = () => { preloadedImages[m.name_ja] = null; resolve(); };
      }));
      return Promise.all(promises);
    });
}

// 2) 初期化
function initialize() {
  setupListeners();
  updateAndRender();
}

// 3) 描画チェーン
function updateAndRender() {
  updateGrid();
  renderGrid();
}

// 4) グリッド状態更新
function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cbAll = document.getElementById("showAll");
  const cbKi  = document.getElementById("showKi");
  const selKi = document.getElementById("kibetsuSelect");

  // 全員モード
  if (cbAll.checked) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m,i) => grid[i] = m.name_ja);
    resizeCanvas(cols, grid.length);
    return;
  }
  // 期別フィルター
  if (cbKi.checked) {
    const val = selKi.value;
    const filtered = members.filter(m => m.ki === val).map(m => m.name_ja);
    grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
    filtered.forEach((name,i) => grid[i] = name);
    resizeCanvas(cols, grid.length);
    return;
  }
  // カスタム配列
  grid = Array(cols * rows).fill(null).map((_,i) => grid[i] || null);
  resizeCanvas(cols, grid.length);
}

// キャンバス高さ調整
function resizeCanvas(cols, totalCells) {
  const rows = Math.ceil(totalCells / cols);
  const cellW = canvas.width / cols;
  const cellH = cellW * baseAspect;
  const header = document.getElementById("showKonmei").checked ? 40 : 0;
  canvas.height = rows * cellH + header;
}

// 5) 描画ルーチン
function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = (targetCanvas !== canvas);
  const scale = targetCanvas.width / baseCanvasWidth;

  // 背景一括クリア
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0,0,targetCanvas.width,targetCanvas.height);

  // ヘッダー（公演名）
  const showKon = document.getElementById("showKonmei").checked;
  const headerH = showKon ? 40*scale : 0;
  if(showKon) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24*scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const sel = document.getElementById("konmeiSelect").value;
    const txt = sel === 'other' ? document.getElementById("customKonmei").value.trim() : sel;
    targetCtx.fillText(txt, 10*scale, 30*scale);
  }

  // グリッドサイズ算出
  const [cols] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cellW = targetCanvas.width / cols;
  const cellH = cellW * baseAspect;

  // 表示フラグ
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick  = document.getElementById("showNickname").checked;
  const showKiTxt = document.getElementById("showKi").checked;
  const showBlk   = document.getElementById("showColorBlock").checked;
  const showTxt   = document.getElementById("showColorText").checked;

  // 排他制御クリア（checkbox DOM状態優先）
  if(showBlk && showTxt) document.getElementById("showColorText").checked = false;
  if(showTxt && showBlk) document.getElementById("showColorBlock").checked = false;

  // 各セル描画
  grid.forEach((name,i) => {
    const row = Math.floor(i/cols), col = i%cols;
    const x = col*cellW, y = row*cellH + headerH;

    // セル背景 & 枠
    targetCtx.fillStyle = '#fff4f6';
    targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle = '#F676A6';
    targetCtx.strokeRect(x,y,cellW,cellH);

    // 未選択セルの「+」
    if(!name) {
      if(!isDownload) {
        targetCtx.fillStyle = '#F676A6';
        targetCtx.font = `${24*scale}px KozGoPr6N`;
        targetCtx.textAlign='center'; targetCtx.textBaseline='middle';
        targetCtx.fillText('+', x+cellW/2, y+cellH/2);
      }
      return;
    }

    const mem = members.find(m=>m.name_ja===name);
    let yOff = y + 5*scale;

    // 写真
    if(showPhoto && preloadedImages[name]) {
      const img = preloadedImages[name];
      const asp = img.naturalWidth/img.naturalHeight;
      let h = cellH*0.25, w = h*asp;
      if(w>cellW*0.8){ w=cellW*0.8; h=w/asp; }
      targetCtx.drawImage(img, x+(cellW-w)/2, yOff, w, h);
      yOff += h + 5*scale;
    }

    // 使用高さ計算
    let usedH = 0;
    if(showPhoto) usedH += cellH*0.3;
    if(showNick)  usedH += cellH*0.1;
    if(showBlk||showTxt) usedH += cellH*0.15;
    const availH = cellH - usedH - (showPhoto?5*scale:0);

    // 名前
    const nameLen = name.length;
    let nameF = Math.min(availH*0.4, (cellW-20*scale)/(nameLen*0.6));
    targetCtx.fillStyle = '#F676A6';
    targetCtx.textAlign='center'; targetCtx.textBaseline='top';
    targetCtx.font = `${nameF*scale}px KozGoPr6N`;
    targetCtx.fillText(name, x+cellW/2, yOff);
    yOff += nameF + 3*scale;

    // ニック
    if(showNick) {
      const sz = Math.min(20*scale, availH*0.15);
      targetCtx.font = `${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.nickname, x+cellW/2, yOff);
      yOff += sz + 3*scale;
    }

    // 色文字
    if(showTxt) {
      targetCtx.textBaseline='middle';
      const map = { '#FF0000':'赤', '#FFA500':'オレンジ', '#FFFF00':'黄', '#0000FF':'青', '#00FF00':'緑', '#FFFFFF':'白', '#FF69B4':'濃いピンク', '#FFB6C1':'薄ピンク', '#32CD32':'黄緑' };
      const arr = mem.colors;
      const sep = ' x ';
      // 中央揃え用幅算出
      let totalW = 0;
      arr.forEach((c,i)=>{
        const t = map[c]||'';
        totalW += ctx.measureText(t).width;
        if(i<arr.length-1) totalW += ctx.measureText(sep).width;
      });
      let xx = x + (cellW-totalW)/2;
      arr.forEach((c,i)=>{
        const t = map[c]||'';
        targetCtx.fillStyle = (c===''# or c==='#FFFFFF') ? '#f5f2f2' : c;
        targetCtx.font = `${18*scale}px KozGoPr6N`;
        targetCtx.fillText(t, xx, y+cellH*0.75);
        xx += targetCtx.measureText(t).width;
        if(i<arr.length-1) {
          targetCtx.fillStyle='#F676A6';
          targetCtx.fillText(sep.trim(), xx, y+cellH*0.75);
          xx += targetCtx.measureText(sep.trim()).width;
        }
      });
    }
    // 色ブロック
    else if(showBlk) {
      const arr = mem.colors;
      const blk = Math.min(cellW/(arr.length*1.2), 40*scale);
      const totW = blk*arr.length;
      arr.forEach((c,j)=>{
        targetCtx.fillStyle = c||'#f0f0f0';
        targetCtx.fillRect(x+(cellW-totW)/2+j*blk, y+cellH*0.8, blk, blk);
      });
    }

    // 選択 text (画面のみ)
    if(!isDownload) {
      targetCtx.fillStyle='#F676A6';
      targetCtx.font = `${12*scale}px KozGoPr6N`;
      targetCtx.textAlign='right'; targetCtx.textBaseline='top';
      targetCtx.fillText('選択', x+cellW-10*scale, y+10*scale);
    }
  });
}

// 6) イベントリスナー設定
function setupListeners() {
  // 推しカラー排他
  const blk = document.getElementById('showColorBlock');
  const txt = document.getElementById('showColorText');
  blk.addEventListener('change', e => { if(e.target.checked) txt.checked=false; updateAndRender(); });
  txt.addEventListener('change', e => { if(e.target.checked) blk.checked=false; updateAndRender(); });

  // 期別フィルター
  const cbKi = document.getElementById('showKi');
  const selKi= document.getElementById('kibetsuSelect');
  cbKi.addEventListener('change', () => { document.getElementById('showAll').checked=false; updateAndRender(); });
  selKi.addEventListener('change', () => { if(cbKi.checked) updateAndRender(); });

  // その他コントロール
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKi), #controls select:not(#kibetsuSelect)')
    .forEach(el => el.addEventListener('change', updateAndRender));

  // キャンバスクリック→ポップアップ
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const showKon = document.getElementById("showKonmei").checked;
    const yOff = showKon?40:0;
    const x = e.clientX-rect.left;
    const y = e.clientY-rect.top-yOff;
    const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW=canvas.width/cols;
    const cellH=cellW*baseAspect;
    const col=Math.floor(x/cellW), row=Math.floor(y/cellH);
    const idx=row*cols+col;
    if(idx>=0 && idx<grid.length) showPopup(idx);
  });

  // ダウンロード
  document.getElementById('downloadButton').addEventListener('click', () => {
    const tmp=document.createElement('canvas');
    tmp.width=canvas.width*2;
    tmp.height=canvas.height*2;
    const tctx=tmp.getContext('2d');
    tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tmp.width,tmp.height);
    renderGrid(tmp, tctx);
    const a=document.createElement('a');
    a.download='penlight_colors_300dpi.png'; a.href=tmp.toDataURL(); a.click();
  });
}

// 7) ポップアップ選択
function showPopup(idx) {
  currentIndex=idx;
  const popup=document.getElementById('popup');
  const periods=[...new Set(members.map(m=>m.ki))];
  let html='';
  periods.forEach(p => {
    html+=`<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m=>m.ki===p).forEach(m=> html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
    html+='</div></details>';
  });
  html+=`<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.innerHTML=html;
  popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(it=> it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected')); it.classList.add('selected');});
  document.getElementById('popupSelectBtn').onclick = ()=> {
    const sel = popup.querySelector('.member-item.selected span');
    if(sel){ grid[currentIndex]=sel.textContent; popup.style.display='none'; updateAndRender(); }
  };
  document.getElementById('popupCloseBtn').onclick = () => popup.style.display='none';
}

// 実行
preloadAll().then(initialize);
