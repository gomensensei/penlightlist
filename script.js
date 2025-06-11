// === script.js (最終修正版) ===
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

// 1. メンバー読み込み＋画像プレロード
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

// 2. 初期化
preloadAll().then(() => {
  setupListeners();
  updateAndRender();
});

// 3. 更新＋描画
function updateAndRender() {
  updateGrid();
  renderGrid();
}

// 4. グリッド更新：全員／期別フィルタ／カスタム
function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cbAll = document.getElementById("showAll");
  const cbFilter = document.getElementById("showKibetsu");
  const selFilter = document.getElementById("kibetsuSelect");

  if (cbAll.checked) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m,i) => grid[i] = m.name_ja);
  } else if (cbFilter.checked) {
    const filtered = members.filter(m=>m.ki === selFilter.value).map(m=>m.name_ja);
    grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
    filtered.forEach((n,i) => grid[i] = n);
  } else {
    grid = Array(cols * rows).fill(null).map((_,i) => grid[i] || null);
  }
  resizeCanvas(cols, grid.length);
}
function resizeCanvas(cols, totalCells) {
  const rows = Math.ceil(totalCells / cols);
  const cellW = canvas.width / cols;
  const cellH = cellW * baseAspect;
  const headerH = document.getElementById("showKonmei").checked ? 40 : 0;
  canvas.height = rows * cellH + headerH;
}

// 5. 描画
function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width / baseCanvasWidth;

  // 背景
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  // ヘッダー
  const showKon = document.getElementById("showKonmei").checked;
  const headerH = showKon ? 40 * scale : 0;
  if (showKon) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24*scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const v = document.getElementById("konmeiSelect").value;
    const txt = v === 'other' ? document.getElementById("customKonmei").value.trim() : v;
    targetCtx.fillText(txt, 10*scale, 30*scale);
  }

  // グリッド寸法
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = targetCanvas.width / cols;
  const cellH = cellW * baseAspect;

  // 表示フラグ
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick = document.getElementById("showNickname").checked;
  const showKiText = document.getElementById("showKi").checked;
  const showBlk = document.getElementById("showColorBlock").checked;
  const showTxt = document.getElementById("showColorText").checked;

  // 相互排他
  if (showBlk && showTxt) document.getElementById("showColorText").checked = false;
  if (showTxt && showBlk) document.getElementById("showColorBlock").checked = false;

  grid.forEach((name,i) => {
    const row = Math.floor(i/cols), col = i%cols;
    const x = col*cellW, y = row*cellH + headerH;
    // セル背景
    targetCtx.fillStyle = '#fff4f6'; targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle = '#F676A6'; targetCtx.strokeRect(x,y,cellW,cellH);

    if (!name) {
      if (!isDownload) {
        targetCtx.fillStyle = '#F676A6';
        targetCtx.font = `${24*scale}px KozGoPr6N`;
        targetCtx.textAlign='center'; targetCtx.textBaseline='middle';
        targetCtx.fillText('+', x+cellW/2, y+cellH/2);
      }
      return;
    }

    const mem = members.find(m=>m.name_ja===name);
    let yOff = y + 5*scale;

    // 写真描画
    if (showPhoto && preloadedImages[name]) {
      const img = preloadedImages[name];
      const asp = img.naturalWidth/img.naturalHeight;
      let h = cellH*0.25, w = h*asp;
      if (w > cellW*0.8) { w = cellW*0.8; h = w/asp; }
      targetCtx.drawImage(img, x+(cellW-w)/2, yOff, w, h);
      yOff += h + 5*scale;
    }

    // 利用可能高さ
    let usedH = 0;
    if (showPhoto) usedH += cellH*0.3;
    if (showNick)  usedH += cellH*0.1;
    if (showBlk||showTxt) usedH += cellH*0.15;
    const availH = cellH - usedH - (showPhoto?5*scale:0);

    // 名前フォント
    const len = name.length;
    let fz = Math.min(availH*0.4, (cellW-20*scale)/(len*0.6));
    targetCtx.fillStyle='#F676A6';
    targetCtx.textAlign='center'; targetCtx.textBaseline='top';
    targetCtx.font = `${fz*scale}px KozGoPr6N`;
    targetCtx.fillText(name, x+cellW/2, yOff);
    yOff += fz + 3*scale;

    // ネックネーム
    if (showNick) {
      const sz = Math.min(20*scale, availH*0.15);
      targetCtx.font = `${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.nickname, x+cellW/2, yOff);
      yOff += sz + 3*scale;
    }

    // 期テキスト
    if (showKiText) {
      const sz = Math.min(20*scale, availH*0.15);
      targetCtx.font = `${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.ki, x+cellW/2, yOff);
      yOff += sz + 3*scale;
    }

    // 色文字
    if (showTxt) {
      const map={ '#FF0000':'赤', '#FFA500':'オレンジ', '#FFFF00':'黄', '#0000FF':'青', '#00FF00':'緑', '#FFFFFF':'白', '#FF69B4':'濃いピンク', '#FFB6C1':'薄ピンク', '#32CD32':'黄緑' };
      const arr = mem.colors, sep = ' x ';
      targetCtx.textBaseline='middle';
      // 中央揃え
      let totalW = 0;
      arr.forEach((c,i)=>{ totalW += ctx.measureText(map[c]||'').width + (i<arr.length-1?ctx.measureText(sep).width:0); });
      let xx = x + (cellW-totalW)/2;
      arr.forEach((c,i)=>{
        const t = map[c]||'';
        targetCtx.fillStyle = (c==='#FFFFFF')?'#f5f2f2':c;
        targetCtx.font = `${18*scale}px KozGoPr6N`;
        targetCtx.fillText(t, xx, y+cellH*0.75);
        xx += ctx.measureText(t).width;
        if (i < arr.length-1) {
          targetCtx.fillStyle = '#F676A6';
          targetCtx.fillText(sep.trim(), xx, y+cellH*0.75);
          xx += ctx.measureText(sep.trim()).width;
        }
      });
    }
    // 色ブロック
    else if (showBlk) {
      const arr = mem.colors;
      // 各ブロック幅 = cellW * (0.5 / arr.length)
      const blk = cellW * (0.5 / arr.length);
      const totalW = blk*arr.length;
      arr.forEach((c,j)=>{
        targetCtx.fillStyle = c||'#f0f0f0';
        targetCtx.fillRect(x+(cellW-totalW)/2 + j*blk, y+cellH*0.8, blk, blk);
      });
    }

    // 選択ラベル
    if (!isDownload) {
      targetCtx.fillStyle='#F676A6';
      targetCtx.font = `${12*scale}px KozGoPr6N`;
      targetCtx.textAlign='right'; targetCtx.textBaseline='top';
      targetCtx.fillText('選択', x+cellW-10*scale, y+10*scale);
    }
  });
}

// 6. イベント
function setupListeners() {
  // 推しカラー互斥
  const cbBlk = document.getElementById('showColorBlock');
  const cbTxt = document.getElementById('showColorText');
  cbBlk.addEventListener('change', e => { if(e.target.checked) cbTxt.checked=false; updateAndRender(); });
  cbTxt.addEventListener('change', e => { if(e.target.checked) cbBlk.checked=false; updateAndRender(); });

  // 期別フィルター
  const cbFilter = document.getElementById('showKibetsu');
  const selFilter = document.getElementById('kibetsuSelect');
  cbFilter.addEventListener('change', () => { document.getElementById('showAll').checked=false; updateAndRender(); });
  selFilter.addEventListener('change', () => { if(cbFilter.checked) updateAndRender(); });

  // その他
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKibetsu), #controls select:not(#kibetsuSelect)')
    .forEach(el=>el.addEventListener('change', updateAndRender));

  // ポップアップ
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const offY = document.getElementById("showKonmei").checked?40:0;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top - offY;
    const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW = canvas.width/cols;
    const cellH = cellW*baseAspect;
    const col = Math.floor(mx/cellW), row = Math.floor(my/cellH);
    const idx = row*cols+col;
    if(idx>=0&&idx<grid.length) showPopup(idx);
  });

  // ダウンロード
  document.getElementById('downloadButton').addEventListener('click', () => {
    if(document.getElementById('showPhoto').checked) {
      // ensure images are ready
    }
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width*2; tmp.height = canvas.height*2;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tmp.width,tmp.height);
    renderGrid(tmp, tctx);
    const a = document.createElement('a'); a.download = 'penlight_colors_300dpi.png'; a.href = tmp.toDataURL(); a.click();
  });
}

// 7. ポップアップ選択
function showPopup(idx) {
  currentIndex = idx;
  const popup = document.getElementById('popup');
  const periods = [...new Set(members.map(m=>m.ki))];
  let html = '';
  periods.forEach(p=>{
    html += `<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m=>m.ki===p).forEach(m=> html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
    html += '</div></details>';
  });
  html += `<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.innerHTML = html; popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(it=> it.onclick=()=>{ popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected')); it.classList.add('selected'); });
  document.getElementById('popupSelectBtn').onclick = ()=>{
    const sel = popup.querySelector('.member-item.selected span');
    if(sel){ grid[currentIndex] = sel.textContent; popup.style.display='none'; updateAndRender(); }
  };
  document.getElementById('popupCloseBtn').onclick = ()=> popup.style.display='none';
}
