let grid = [];
let currentIndex = null;
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");

let members = [];
fetch("members.json")
  .then(res => res.json())
  .then(data => {
    members = data;
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
}

function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cellW = targetCanvas.width / cols;
  const cellH = targetCanvas.height / rows;
  targetCanvas.height = rows * cellH;

  // 渲染公演名作為標題
  if (document.getElementById("showKonmei").checked) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = '24px KozGoPr6N';
    const customKonmei = document.getElementById("customKonmei").value.trim() || '';
    const konmei = document.getElementById("konmeiSelect").value === 'other' && customKonmei ? customKonmei : document.getElementById("konmeiSelect").value;
    targetCtx.textAlign = 'left';
    targetCtx.fillText(konmei, 10, 30);
  }

  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * cellW;
    const y = row * cellH + 40;
    targetCtx.strokeStyle = '#f676a6';
    targetCtx.strokeRect(x, y, cellW, cellH);

    if (!grid[i]) {
      targetCtx.fillStyle = '#fff4f6';
      targetCtx.fillRect(x, y, cellW, cellH);
      targetCtx.font = '24px KozGoPr6N';
      targetCtx.fillStyle = '#f676a6';
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText('+', x + cellW / 2, y + cellH / 2);
      continue;
    }

    const member = members.find(m => m.name_ja === grid[i]);
    let yOffset = 10;
    if (document.getElementById("showPhoto").checked && member.image) {
      const img = new Image();
      img.onload = () => {
        targetCtx.drawImage(img, x + (cellW - (cellW - 10)) / 2, y + yOffset, cellW - 10, cellH * 0.4);
        renderGrid(targetCanvas, targetCtx);
      };
      img.onerror = () => console.error("Image load failed:", member.image);
      img.src = member.image;
      yOffset += cellH * 0.4 + 5;
    }
    targetCtx.fillStyle = '#F676A6';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'top';
    targetCtx.font = '24px KozGoPr6N';
    targetCtx.fillText(member.name_ja, x + cellW / 2, y + yOffset);
    yOffset += 30;
    if (document.getElementById("showNickname").checked) {
      targetCtx.font = '22px KozGoPr6N';
      targetCtx.fillText(member.nickname, x + cellW / 2, y + yOffset);
      yOffset += 28;
    }
    if (document.getElementById("showKi").checked) {
      targetCtx.font = '22px KozGoPr6N';
      targetCtx.fillText(member.ki, x + cellW / 2, y + yOffset);
      yOffset += 28;
    }
    if (document.getElementById("showColorBlock").checked || document.getElementById("showColorText").checked) {
      if (!document.getElementById("showColorBlock").checked && !document.getElementById("showColorText").checked) {
        document.getElementById("showColorBlock").checked = true;
      }
      if (document.getElementById("showColorBlock").checked) {
        member.colors.forEach((color, j) => {
          targetCtx.fillStyle = color === '#FFFFFF' ? '#f0f0f0' : color;
          targetCtx.fillRect(x + (cellW - (member.colors.length * 30)) / 2 + j * 30, y + yOffset, 30, 30);
        });
        yOffset += 35;
      } else if (document.getElementById("showColorText").checked) {
        const colorMap = { '#FF0000': '赤', '#00FF00': '緑', '#FFFF00': '黄', '#0000FF': '青', '#FFFFFF': '白', '#FF69B4': 'ピンク', '#00CED1': '水', '#FFA500': 'オレンジ', '#800080': '紫', '#FFB6C1': '薄ピンク', '#FF1493': '深ピンク', '#32CD32': 'ライム' };
        targetCtx.font = '22px KozGoPr6N';
        let xOffset = x + cellW / 2;
        member.colors.forEach((color, j) => {
          const colorName = colorMap[color] || color;
          targetCtx.fillStyle = color;
          targetCtx.fillText(colorName, xOffset, y + yOffset);
          xOffset += targetCtx.measureText(colorName + (j < member.colors.length - 1 ? ' x ' : '')).width;
        });
        yOffset += 28;
      }
    }

    // 右上角交叉制
    if (grid[i]) {
      targetCtx.fillStyle = '#f676a6';
      targetCtx.beginPath();
      targetCtx.moveTo(x + cellW - 20, y + 10);
      targetCtx.lineTo(x + cellW - 10, y + 20);
      targetCtx.moveTo(x + cellW - 10, y + 10);
      targetCtx.lineTo(x + cellW - 20, y + 20);
      targetCtx.stroke();
    }
  }
}

function updateGridSize() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  grid = Array(cols * rows).fill(null).map((_, i) => grid[i] || null);
}

function setupEventListeners() {
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - 40;
    const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const index = row * cols + col;
    if (index < grid.length) {
      if (!grid[index]) {
        showPopup(index);
      } else if (x > canvas.width - cellW + 10 && x < canvas.width - cellW + 20 && y < 20) {
        grid[index] = null;
        renderGrid();
      }
    }
  });

  document.querySelectorAll('#controls input, #controls select').forEach(el => {
    el.addEventListener('change', (e) => {
      e.stopPropagation();
      if (el.id === 'showColorBlock' && el.checked) document.getElementById('showColorText').checked = false;
      if (el.id === 'showColorText' && el.checked) document.getElementById('showColorBlock').checked = false;
      if (el.id === 'konmeiSelect') {
        document.getElementById('customKonmei').style.display = el.value === 'other' ? 'inline' : 'none';
      }
      if (el.id === 'showAll' && el.checked) {
        document.getElementById('showKibetsu').checked = false;
        document.getElementById('showNinzu').checked = false;
        grid = members.map(m => m.name_ja);
        document.getElementById('ninzuSelect').value = '5x10';
        renderGrid();
      }
      if (el.id === 'showKibetsu' && el.checked) {
        document.getElementById('showAll').checked = false;
        document.getElementById('showNinzu').checked = false;
        const ki = document.getElementById('kibetsuSelect').value;
        const filtered = members.filter(m => m.ki === ki);
        grid = filtered.map(m => m.name_ja);
        const cols = Math.min(Math.ceil(Math.sqrt(filtered.length)), 4);
        const rows = Math.ceil(filtered.length / cols);
        document.getElementById('ninzuSelect').value = `${cols}x${rows}`;
        renderGrid();
      }
      if (el.id === 'showNinzu' && el.checked) {
        document.getElementById('showAll').checked = false;
        document.getElementById('showKibetsu').checked = false;
      }
      updateGridSize();
      renderGrid();
    });
  });

  document.getElementById('customKonmei').addEventListener('input', renderGrid);
  document.getElementById('popupCloseBtn').addEventListener('click', () => {
    document.getElementById('popup').style.display = 'none';
  });
  document.getElementById('popupSelectBtn').addEventListener('click', () => {
    const selected = document.querySelector('#accordion .member-item.selected')?.querySelector('span')?.textContent;
    if (selected && currentIndex !== null) {
      grid[currentIndex] = selected;
      document.getElementById('popup').style.display = 'none';
      renderGrid();
    }
  });

  document.getElementById('downloadButton').addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * 12; // 增大至 12 倍
    tempCanvas.height = canvas.height * 12;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.scale(12, 12);
    tempCtx.fillStyle = '#fff4f6'; // 粉紅色背景
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    renderGrid(tempCanvas, tempCtx);
    const link = document.createElement('a');
    link.download = 'penlight_colors_300dpi.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  });
}

function showPopup(index) {
  currentIndex = index;
  let popupContent = '<div id="accordion">';
  const periods = [...new Set(members.map(m => m.ki))];
  periods.forEach(period => {
    const periodMembers = members.filter(m => m.ki === period);
    popupContent += `
      <details>
        <summary>${period} <span>▼</span></summary>
        <div class="member-list">`;
    periodMembers.forEach(m => {
      popupContent += `<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`;
    });
    popupContent += `</div></details>`;
  });
  popupContent += '</div>';
  document.getElementById('popup').innerHTML = popupContent + '<br><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button>';
  document.getElementById('popup').style.display = 'block';
  document.querySelectorAll('.member-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
}
