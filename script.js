// script.js
let grid = [];
let currentIndex = null;
const canvas = document.getElementById('renderCanvas');
const ctx = canvas.getContext('2d');
let members = [];
const preloadedImages = {};

// 色名對應表
const colorNames = {
  '#FF0000': '赤', '#00FF00': '緑', '#0000FF': '青',
  '#FFFF00': '黄', '#FFFFFF': '白', '#FF69B4': 'ピンク',
  '#FFA500': 'オレンジ', '#800080': '紫', '#00CED1': '水色',
  '#FFB6C1': '薄ピンク'
};

// 初始設定：固定 1600x900
canvas.width = 1600;
canvas.height = 900;

// 讀取成員資料並預載圖片
fetch('members.json')
  .then(r => r.json())
  .then(data => {
    members = data;
    members.forEach(m => {
      const img = new Image();
      img.src = m.image;
      img.onload = () => preloadedImages[m.name_ja] = img;
    });
    initialize();
  });

function initialize() {
  bindControls();
  updateGridSize();
  renderGrid();
}

function bindControls() {
  // 畫布點擊
  canvas.addEventListener('click', onCanvasClick);
  // 控制項變化
  document.querySelectorAll('#controls input, #controls select').forEach(el => el.addEventListener('change', onControlChange));
  // 自訂公演名即時更新
  const custom = document.getElementById('customKonmei');
  document.getElementById('konmeiSelect').addEventListener('change', () => {
    custom.value = '';
    custom.style.display = document.getElementById('konmeiSelect').value === 'other' ? 'inline-block' : 'none';
    renderGrid();
  });
  custom.addEventListener('input', renderGrid);
  // 離開他模式清除殘影
  custom.addEventListener('focus', () => renderGrid());
  // 下載
  document.getElementById('downloadButton').addEventListener('click', onDownload);
}

function onControlChange(e) {
  const id = e.target.id;
  if (id === 'showAll' && e.target.checked) return filterAll();
  if (id === 'showKibetsu' && e.target.checked) return filterByKi();
  if (id === 'kibetsuSelect' && document.getElementById('showKibetsu').checked) return filterByKi();
  if (id === 'showNinzu' && e.target.checked) {
    document.getElementById('showAll').checked = false;
    document.getElementById('showKibetsu').checked = false;
  }
  if (id === 'showColorBlock' && e.target.checked) document.getElementById('showColorText').checked = false;
  if (id === 'showColorText' && e.target.checked) document.getElementById('showColorBlock').checked = false;
  updateGridSize();
  renderGrid();
}

function filterAll() {
  document.getElementById('showNinzu').checked = false;
  document.getElementById('showKibetsu').checked = false;
  document.getElementById('ninzuSelect').value = '5x10';
  grid = members.map(m => m.name_ja);
  updateGridSize();
  renderGrid();
}

function filterByKi() {
  document.getElementById('showAll').checked = false;
  document.getElementById('showNinzu').checked = false;
  const ki = document.getElementById('kibetsuSelect').value;
  const list = members.filter(m => m.ki === ki).map(m => m.name_ja);
  const cols = Math.min(5, list.length);
  const rows = Math.ceil(list.length / cols);
  document.getElementById('ninzuSelect').value = `${cols}x${rows}`;
  grid = list;
  updateGridSize();
  renderGrid();
}

function updateGridSize() {
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  grid.length = cols * rows;
}

function onCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height) - 40;
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const w = canvas.width / cols;
  const h = (canvas.height - 40) / rows;
  const c = Math.floor(x / w);
  const r = Math.floor(y / h);
  const idx = r * cols + c;
  if (idx < grid.length && !grid[idx]) showPopup(idx);
}

function renderGrid() {
  // 填背景
  ctx.fillStyle = '#fff4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 公演名
  if (document.getElementById('showKonmei').checked) {
    let txt = document.getElementById('konmeiSelect').value;
    if (txt === 'other') txt = document.getElementById('customKonmei').value;
    if (txt) {
      ctx.fillStyle = '#f676a6';
      ctx.font = '36px KozGoPr6N';
      ctx.textAlign = 'left';
      ctx.fillText(txt, 20, 36);
    }
  }

  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const w = canvas.width / cols;
  const h = (canvas.height - 40) / rows;

  // 顯示格線
  ctx.strokeStyle = '#f676a6';
  for (let i = 0; i <= cols; i++) ctx.strokeRect(i * w, 40, 0.5, rows * h);
  for (let j = 0; j <= rows; j++) ctx.strokeRect(0, j * h + 40, cols * w, 0.5);

  grid.forEach((name, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c * w;
    const y = r * h + 40;

    // 空格 + 號
    if (!name) {
      ctx.fillStyle = '#f676a6';
      ctx.font = '48px KozGoPr6N';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w / 2, y + h / 2);
      return;
    }

    const m = members.find(m => m.name_ja === name);
    let offsetY = y;

    // 顯示照片 (h*0.3)
    if (document.getElementById('showPhoto').checked && preloadedImages[name]) {
      const img = preloadedImages[name];
      const imgH = h * 0.3;
      const imgW = imgH * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, x + (w - imgW) / 2, offsetY, imgW, imgH);
      offsetY += imgH + 5;
    }

    // 顯示文字 (h*0.5 區域)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f676a6';
    ctx.font = '28px KozGoPr6N';
    ctx.fillText(m.name_ja, x + w / 2, offsetY);
    offsetY += 32;
    if (document.getElementById('showNickname').checked) {
      ctx.font = '24px KozGoPr6N';
      ctx.fillText(m.nickname, x + w / 2, offsetY);
      offsetY += 28;
    }
    if (document.getElementById('showKi').checked) {
      ctx.font = '24px KozGoPr6N';
      ctx.fillText(m.ki, x + w / 2, offsetY);
      offsetY += 28;
    }

    // 顏色區 (h*0.2)
    const blockY = y + h * 0.8;
    const blockH = h * 0.2;
    if (document.getElementById('showColorBlock').checked) {
      const blockW = w / m.colors.length;
      m.colors.forEach((colc, idx) => {
        ctx.fillStyle = colc;
        ctx.fillRect(x + idx * blockW, blockY, blockW, blockH);
      });
    }

    // 顏色文字
    if (document.getElementById('showColorText').checked) {
      m.colors.forEach((colc, idx) => {
        const txtCol = colorNames[colc] || '';
        ctx.fillStyle = colc;
        ctx.font = '24px KozGoPr6N';
        const totalW = m.colors.length * 60;
        const startX = x + (w - totalW) / 2 + idx * 60 + 30;
        ctx.textBaseline = 'middle';
        ctx.fillText(txtCol, startX, blockY + blockH / 2);
      });
    }
  });
}
  }
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const w = canvas.width / cols;
  const h = (canvas.height - 40) / rows;
  // 格線
  ctx.strokeStyle = '#f676a6';
  for (let i = 0; i <= cols; i++) ctx.strokeRect(i * w, 40, 0.5, rows * h);
  for (let j = 0; j <= rows; j++) ctx.strokeRect(0, j * h + 40, cols * w, 0.5);
  // 內容
  grid.forEach((name, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c * w;
    const y = r * h + 40;
    if (!name) {
      ctx.fillStyle = '#f676a6';
      ctx.font = '48px KozGoPr6N';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w / 2, y + h / 2);
      return;
    }
    const m = members.find(m => m.name_ja === name);
    // 文字區 (h/2)
    const ty = y;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f676a6';
    ctx.font = '20px KozGoPr6N';
    ctx.fillText(m.name_ja, x + w / 2, ty + h * 0.25);
    ctx.font = '18px KozGoPr6N';
    if (document.getElementById('showNickname').checked)
      ctx.fillText(m.nickname, x + w / 2, ty + h * 0.45);
    if (document.getElementById('showKi').checked)
      ctx.fillText(m.ki, x + w / 2, ty + h * 0.65);
    // 色塊區 (h/3)
    const by = y + h * 2 / 3;
    if (document.getElementById('showColorBlock').checked) {
      const bw = w / m.colors.length;
      m.colors.forEach((colc, idx) => {
        ctx.fillStyle = colc;
        ctx.fillRect(x + idx * bw, by, bw, h / 3);
      });
    }
    // 色名文字
    if (document.getElementById('showColorText').checked) {
      m.colors.forEach((colc, idx) => {
        const nameTxt = colorNames[colc] || colc;
        ctx.fillStyle = colc;
        ctx.font = '18px KozGoPr6N';
        const totalW = m.colors.length * 40;
        const sx = x + (w - totalW) / 2 + idx * 40 + 20;
        ctx.fillText(nameTxt, sx, by + h / 6);
      });
    }
  });
}

function showPopup(idx) {
  currentIndex = idx;
  const popup = document.getElementById('popup');
  popup.innerHTML = '<div id="accordion"></div>' +
    '<div style="text-align:right;"><button id="selBtn">選択</button><button id="closeBtn">閉じる</button></div>';
  const ac = popup.querySelector('#accordion');
  Array.from(new Set(members.map(m => m.ki))).forEach(ki => {
    const det = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = ki;
    const div = document.createElement('div'); div.style.display = 'flex'; div.style.flexWrap = 'wrap'; div.style.gap = '8px'; div.style.margin = '8px 0';
    members.filter(m => m.ki === ki).forEach(m => {
      const it = document.createElement('div'); it.className = 'member-item'; it.style.cursor = 'pointer';
      it.innerHTML = `<img src="${m.image}" width="40"/><div>${m.name_ja}</div>`;
      it.onclick = () => { popup.querySelectorAll('.member-item').forEach(el => el.classList.remove('sel')); it.classList.add('sel'); };
      div.appendChild(it);
    }); det.append(sum, div); ac.appendChild(det);
  });
  popup.querySelector('#closeBtn').onclick = () => popup.style.display = 'none';
  popup.querySelector('#selBtn').onclick = () => {
    const sel = popup.querySelector('.member-item.sel');
    if (sel) { grid[currentIndex] = sel.querySelector('div').textContent; renderGrid(); popup.style.display = 'none'; }
  };
  popup.style.display = 'block';
}

function onDownload() {
  const tmp = document.createElement('canvas'); tmp.width = 1600 * 2; tmp.height = 900 * 2;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#fff4f6'; tctx.fillRect(0, 0, tmp.width, tmp.height);
  tctx.scale(2, 2);
  renderGrid();
  const link = document.createElement('a'); link.download = 'penlight_colors_300dpi.png'; link.href = tmp.toDataURL('image/png'); link.click();
}
