let grid = [];
let currentIndex = null;
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;

// Preload members and images
let members = [];
let preloadedImages = {};
fetch("members.json")
  .then(res => res.json())
  .then(data => {
    members = data;
    members.forEach(m => {
      const img = new Image();
      img.src = m.image;
      img.onload = () => { preloadedImages[m.name_ja] = img; };
      img.onerror = () => { console.error("Image load failed:", m.image); preloadedImages[m.name_ja] = img; };
    });
    initialize();
  })
  .catch(error => {
    console.error("Error loading members.json:", error);
    alert("メンバーデータの読み込みに失敗しました。");
  });

function initialize() {
  updateGridSize();
  renderGrid();
  setupEventListeners();
}

function updateGridSize() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  grid = Array(cols * rows).fill(null).map((_, i) => grid[i] || null);
  // Adjust canvas height proportionally
  const cellW = canvas.width / cols;
  const cellH = cellW * (canvas.height / canvas.width);
  canvas.height = rows * cellH + (document.getElementById("showKonmei").checked ? 40 : 0);
}

function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width / baseCanvasWidth;

  // Clear and fill background
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  // Header: 公演名
  const headerOffset = document.getElementById("showKonmei").checked ? 40 * scale : 0;
  if (headerOffset) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24 * scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const sel = document.getElementById("konmeiSelect").value;
    const custom = document.getElementById("customKonmei").value.trim();
    const text = sel === 'other' ? (custom || '') : sel;
    targetCtx.fillText(text, 10 * scale, 30 * scale);
  }

  // Grid
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cellW = targetCanvas.width / cols;
  const cellH = (targetCanvas.height - headerOffset) / rows;

  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * cellW;
    const y = row * cellH + headerOffset;

    // Cell background
    targetCtx.fillStyle = '#fff4f6';
    targetCtx.fillRect(x, y, cellW, cellH);
    // Border
    targetCtx.strokeStyle = '#F676A6';
    targetCtx.strokeRect(x, y, cellW, cellH);

    const memberName = grid[i];
    if (!memberName) {
      if (!isDownload) {
        targetCtx.fillStyle = '#F676A6';
        targetCtx.font = `${24 * scale}px KozGoPr6N`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('+', x + cellW / 2, y + cellH / 2);
      }
      continue;
    }

    const member = members.find(m => m.name_ja === memberName);
    const centerX = x + cellW / 2;

    // Photo
    if (document.getElementById("showPhoto").checked && preloadedImages[memberName]) {
      const img = preloadedImages[memberName];
      const aspect = img.naturalWidth / img.naturalHeight;
      const maxH = cellH * 0.25;
      let h = maxH, w = h * aspect;
      if (w > cellW * 0.8) { w = cellW * 0.8; h = w / aspect; }
      targetCtx.drawImage(img, x + (cellW - w) / 2, y + 10 * scale, w, h);
    }

    // Name
    targetCtx.fillStyle = '#F676A6';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.font = `${24 * scale}px KozGoPr6N`;
    targetCtx.fillText(member.name_ja, centerX, y + cellH * 0.5);

    // Nickname
    if (document.getElementById("showNickname").checked) {
      targetCtx.font = `${22 * scale}px KozGoPr6N`;
      targetCtx.fillText(member.nickname, centerX, y + cellH * 0.6);
    }
    // 期
    if (document.getElementById("showKi").checked) {
      targetCtx.font = `${22 * scale}px KozGoPr6N`;
      targetCtx.fillText(member.ki, centerX, y + cellH * 0.7);
    }

    // Color blocks
    if (document.getElementById("showColorBlock").checked) {
      const colors = member.colors;
      const blockSize = 40 * scale;
      const totalW = colors.length * blockSize;
      colors.forEach((c,j) => {
        targetCtx.fillStyle = c === '#FFFFFF' ? '#f0f0f0' : c;
        targetCtx.fillRect(x + (cellW - totalW) / 2 + j * blockSize, y + cellH * 0.8, blockSize, blockSize);
      });
    }

    // UI: 選択 button
    if (!isDownload) {
      targetCtx.fillStyle = '#F676A6';
      targetCtx.font = `${12 * scale}px KozGoPr6N`;
      targetCtx.textAlign = 'right';
      targetCtx.textBaseline = 'top';
      targetCtx.fillText('選択', x + cellW - 10 * scale, y + 10 * scale);
    }
  }
}

function setupEventListeners() {
  // Canvas click for + and 選択
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    const col = Math.floor(clickX / cellW);
    const row = Math.floor((clickY - (document.getElementById("showKonmei").checked ? 40 : 0)) / cellH);
    const index = row * cols + col;
    if (index < 0 || index >= grid.length) return;

    const memberName = grid[index];
    const scale = canvas.width / baseCanvasWidth;
    const x = col * cellW;
    const y = row * cellH + (document.getElementById("showKonmei").checked ? 40 : 0);
    const btnX1 = x + cellW - 60 * scale;
    const btnX2 = x + cellW;
    const btnY1 = y;
    const btnY2 = y + 30 * scale;

    if (!memberName || (memberName && clickX >= btnX1 && clickX <= btnX2 && clickY >= btnY1 && clickY <= btnY2)) {
      showPopup(index);
    }
  });

  // Controls
  document.querySelectorAll('#controls input, #controls select').forEach(el => {
    el.addEventListener('change', () => {
      if (el.id === 'showColorBlock' && el.checked) document.getElementById('showColorText').checked = false;
      if (el.id === 'showColorText' && el.checked) document.getElementById('showColorBlock').checked = false;
      if (el.id === 'konmeiSelect') {
        document.getElementById('customKonmei').style.display = el.value === 'other' ? 'inline' : 'none';
      }
      updateGridSize();
      renderGrid();
    });
  });

  // Custom konmei input
  document.getElementById('customKonmei').addEventListener('input', () => renderGrid());

  // Download
  document.getElementById('downloadButton').addEventListener('click', async () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * 2;
    tempCanvas.height = canvas.height * 2;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#fff4f6';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    if (document.getElementById("showPhoto").checked) {
      await new Promise(resolve => {
        const check = () => Object.keys(preloadedImages).length === members.length ? resolve() : setTimeout(check, 100);
        check();
      });
    }
    renderGrid(tempCanvas, tempCtx);
    const link = document.createElement('a');
    link.download = 'penlight_colors_300dpi.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  });
}

function showPopup(index) {
  currentIndex = index;
  const popup = document.getElementById('popup');
  const periods = [...new Set(members.map(m => m.ki))];
  let html = '<div id="accordion">';
  periods.forEach(period => {
    html += `<details><summary>${period} ▼</summary><div class="member-list">`;
    members.filter(m => m.ki === period).forEach(m => {
      html += `<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`;
    });
    html += '</div></details>';
  });
  html += '</div>';
  popup.innerHTML = html;

  // Buttons
  const selectBtn = document.createElement('button');
  selectBtn.id = 'popupSelectBtn';
  selectBtn.textContent = '選択';
  const closeBtn = document.createElement('button');
  closeBtn.id = 'popupCloseBtn';
  closeBtn.textContent = '閉じる';
  popup.appendChild(selectBtn);
  popup.appendChild(closeBtn);
  popup.style.display = 'block';

  // Member click
  popup.querySelectorAll('.member-item').forEach(item => {
    item.addEventListener('click', () => {
      popup.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });

  selectBtn.addEventListener('click', () => {
    const selected = popup.querySelector('.member-item.selected span')?.textContent;
    if (selected) {
      grid[currentIndex] = selected;
      popup.style.display = 'none';
      renderGrid();
    }
  });
  closeBtn.addEventListener('click', () => { popup.style.display = 'none'; });
}
