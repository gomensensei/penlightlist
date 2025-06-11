// === script.js (patched) ===
let grid = [];
let currentIndex = null;
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;
let members = [];
let preloadedImages = {};

// Preload all images, return a Promise
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

preloadAll().then(() => init());

function init() {
  setupListeners();
  updateAndRender();
}

function updateAndRender() {
  updateGrid();
  renderGrid();
}

function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  // 全員モード
  if (document.getElementById("showAll").checked) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m, i) => grid[i] = m.name_ja);
  }
  // 期別フィルター
  else if (document.getElementById("showKi").checked && document.getElementById("kibetsuSelect")) {
    const kiVal = document.getElementById("kibetsuSelect").value;
    const filtered = members.filter(m => m.ki === kiVal).map(m => m.name_ja);
    grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
    filtered.forEach((name, i) => grid[i] = name);
  }
  // カスタム
  else {
    grid = Array(cols * rows).fill(null);
    for (let i = 0; i < Math.min(grid.length, grid.length); i++) {
      // preserve prior selections if any
    }
  }
  // Resize canvas height based on actual grid rows
  const actualRows = Math.ceil(grid.length / cols);
  const cellW = canvas.width / cols;
  const cellH = cellW * baseAspect;
  const header = document.getElementById("showKonmei").checked ? 40 : 0;
  canvas.height = actualRows * cellH + header;
}

function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width / baseCanvasWidth;

  // clear + bg
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  // header
  const showKon = document.getElementById("showKonmei").checked;
  const headerOffset = showKon ? 40 * scale : 0;
  if (showKon) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24 * scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const sel = document.getElementById("konmeiSelect").value;
    const txt = sel === 'other' ? document.getElementById("customKonmei").value.trim() : sel;
    targetCtx.fillText(txt, 10 * scale, 30 * scale);
  }

  // grid dims
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = targetCanvas.width / cols;
  const cellH = cellW * baseAspect;

  // flags
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick = document.getElementById("showNickname").checked;
  const showKi = false; // use kibetsuSelect via updateGrid only
  const showBlock = document.getElementById("showColorBlock").checked;
  const showText = document.getElementById("showColorText").checked;

  // exclusive toggle
  if (showBlock && showText) document.getElementById("showColorText").checked = false;
  if (showText && showBlock) document.getElementById("showColorBlock").checked = false;

  grid.forEach((name, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const x = col * cellW, y = row * cellH + headerOffset;
    // cell bg + border
    targetCtx.fillStyle = '#fff4f6';
    targetCtx.fillRect(x, y, cellW, cellH);
    targetCtx.strokeStyle = '#F676A6';
    targetCtx.strokeRect(x, y, cellW, cellH);

    if (!name) {
      if (!isDownload) {
        targetCtx.fillStyle = '#F676A6';
        targetCtx.font = `${24 * scale}px KozGoPr6N`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('+', x + cellW / 2, y + cellH / 2);
      }
      return;
    }
    const mem = members.find(m => m.name_ja === name);
    let yOffset = y + 5 * scale;

    // photo
    if (showPhoto && preloadedImages[name]) {
      const img = preloadedImages[name];
      const asp = img.naturalWidth / img.naturalHeight;
      let h = cellH * 0.25, w = h * asp;
      if (w > cellW * 0.8) { w = cellW * 0.8; h = w / asp; }
      targetCtx.drawImage(img, x + (cellW - w) / 2, yOffset, w, h);
      yOffset += h + 5 * scale;
    }

    // compute available height
    const useBlocks = showBlock || showText;
    let used = 0;
    if (showPhoto) used += cellH * 0.3;
    if (showNick) used += cellH * 0.1;
    if (useBlocks) used += cellH * 0.15;
    const avail = cellH - used - (showPhoto ? 5 * scale : 0);

    // name font larger but safe
    const nameLen = name.length;
    let nameF = Math.min(avail * 0.4, (cellW - 10 * scale) / (nameLen * 0.6));
    targetCtx.fillStyle = '#F676A6';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'top';
    targetCtx.font = `${nameF * scale}px KozGoPr6N`;
    targetCtx.fillText(name, x + cellW / 2, yOffset);
    yOffset += nameF + 3 * scale;

    // nickname
    if (showNick) {
      const sz = Math.min(20 * scale, avail * 0.15);
      targetCtx.font = `${sz}px KozGoPr6N`;
      targetCtx.fillText(mem.nickname, x + cellW / 2, yOffset);
      yOffset += sz + 3 * scale;
    }

    // color text
    if (showText) {
      targetCtx.textBaseline = 'middle';
      const mapColorWord = { '#FF0000':'赤', '#FFA500':'オレンジ', '#FFFF00':'黄', '#0000FF':'青', '#00FF00':'緑', '#FFFFFF':'白', '#FF69B4':'濃いピンク', '#FFB6C1':'薄ピンク', '#32CD32':'黄緑' };
      const arr = mem.colors;
      // calculate total width
      const sep = ' x ';
      let totalW = 0;
      arr.forEach((clr, idx) => {
        const txt = mapColorWord[clr] || '';
        totalW += ctx.measureText(txt).width;
        if (idx < arr.length - 1) totalW += ctx.measureText(sep).width;
      });
      let xx = x + (cellW - totalW) / 2;
      arr.forEach((clr, idx) => {
        const txt = mapColorWord[clr] || '';
        targetCtx.fillStyle = (clr === '#FFFFFF') ? '#f5f2f2' : clr;
        targetCtx.font = `${18 * scale}px KozGoPr6N`;
        targetCtx.fillText(txt, xx, y + cellH * 0.75);
        xx += targetCtx.measureText(txt).width;
        if (idx < arr.length - 1) {
          targetCtx.fillStyle = '#F676A6';
          targetCtx.fillText(sep.trim(), xx, y + cellH * 0.75);
          xx += targetCtx.measureText(sep.trim()).width;
        }
      });
    }
    // color blocks
    else if (showBlock) {
      const arr = mem.colors;
      const blk = Math.min(40 * scale, cellW / (arr.length * 1.5));
      const totalW = arr.length * blk;
      arr.forEach((clr, j) => {
        targetCtx.fillStyle = clr || '#f0f0f0';
        targetCtx.fillRect(x + (cellW - totalW) / 2 + j * blk, y + cellH * 0.8, blk, blk);
      });
    }

    // 選択 button
    if (!isDownload) {
      targetCtx.fillStyle = '#F676A6';
      targetCtx.font = `${12 * scale}px KozGoPr6N`;
      targetCtx.textAlign = 'right';
      targetCtx.textBaseline = 'top';
      targetCtx.fillText('選択', x + cellW - 10 * scale, y + 10 * scale);
    }
  });
}

function setupListeners() {
  document.querySelectorAll('#controls input, #controls select').forEach(el => {
    el.addEventListener('change', updateAndRender);
    el.addEventListener('input', updateAndRender);
  });
  document.getElementById('konmeiSelect').addEventListener('change', e => {
    document.getElementById('customKonmei').style.display = e.target.value === 'other' ? 'inline' : 'none';
  });
  // cell popup
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - (document.getElementById("showKonmei").checked ? 40 : 0);
    const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW = canvas.width / cols;
    const cellH = cellW * baseAspect;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const idx = row * cols + col;
    if (idx >= 0 && idx < grid.length) showPopup(idx);
  });
  // download
  document.getElementById('downloadButton').addEventListener('click', () => {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width * 2;
    tmp.height = canvas.height * 2;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#fff4f6';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    renderGrid(tmp, tctx);
    const link = document.createElement('a');
    link.download = 'penlight_colors_300dpi.png';
    link.href = tmp.toDataURL();
    link.click();
  });
}

function showPopup(idx) {
  currentIndex = idx;
  const popup = document.getElementById('popup');
  const periods = [...new Set(members.map(m => m.ki))];
  let html = '';
  periods.forEach(p => {
    html += `<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m => m.ki === p).forEach(m => {
      html += `<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`;
    });
    html += '</div></details>';
  });
  html += `<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.innerHTML = html;
  popup.style.display = 'block';
  popup.querySelectorAll('.member-item').forEach(item => item.onclick = () => {
    popup.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
  });
  document.getElementById('popupSelectBtn').onclick = () => {
    const sel = popup.querySelector('.member-item.selected span');
    if (sel) {
      grid[currentIndex] = sel.textContent;
      popup.style.display = 'none';
      updateAndRender();
    }
  };
  document.getElementById('popupCloseBtn').onclick = () => popup.style.display = 'none';
}
