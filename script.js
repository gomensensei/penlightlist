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
  const [rows, cols] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  grid = Array(rows * cols).fill(null);
}

function renderGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [rows, cols] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows; // 根據實際高度計算
  canvas.height = rows * cellH;

  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * cellW;
    const y = row * cellH;
    ctx.strokeStyle = '#f676a6';
    ctx.strokeRect(x, y, cellW, cellH);

    if (!grid[i]) {
      ctx.font = '24px KozGoPr6N';
      ctx.fillStyle = '#f676a6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + cellW / 2, y + cellH / 2);
      continue;
    }

    const member = members.find(m => m.name_ja === grid[i]);
    let yOffset = 10;
    if (document.getElementById("showPhoto").checked && member.image) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x + 5, y + yOffset, cellW - 10, cellH * 0.4);
        renderGrid(); // 重新渲染以顯示圖片
      };
      img.src = member.image;
      yOffset += cellH * 0.4 + 5;
    }

    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '16px KozGoPr6N';
    ctx.fillText(member.name_ja, x + 5, y + yOffset);
    yOffset += 20;

    if (document.getElementById("showNickname").checked) {
      ctx.font = '14px KozGoPr6N';
      ctx.fillText(member.nickname, x + 5, y + yOffset);
      yOffset += 18;
    }
    if (document.getElementById("showKi").checked) {
      ctx.font = '14px KozGoPr6N';
      ctx.fillText(member.ki, x + 5, y + yOffset);
      yOffset += 18;
    }
    if (document.getElementById("showColorBlock").checked) {
      member.colors.forEach((color, j) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + 5 + j * 25, y + yOffset, 20, 20);
      });
    } else if (document.getElementById("showColorText").checked) {
      ctx.font = '14px KozGoPr6N';
      ctx.fillStyle = '#000';
      ctx.fillText(member.colors.join(' x '), x + 5, y + yOffset);
    }
  }
}

function setupEventListeners() {
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [rows, cols] = document.getElementById("ninzuSelect").value.split("x").map(Number);
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const index = row * cols + col;
    if (index < grid.length && !grid[index]) {
      showPopup(index);
    }
  });

  document.querySelectorAll('#controls input, #controls select').forEach(el => {
    el.addEventListener('change', () => {
      if (el.id === 'showColorBlock' && el.checked) document.getElementById('showColorText').checked = false;
      if (el.id === 'showColorText' && el.checked) document.getElementById('showColorBlock').checked = false;
      if (el.id === 'konmeiSelect') {
        document.getElementById('customKonmei').style.display = el.value === 'other' ? 'inline' : 'none';
      }
      if (el.id === 'showAll' && el.checked) {
        document.getElementById('showKibetsu').checked = false;
        document.getElementById('showNinzu').checked = false;
        grid = members.map(m => m.name_ja);
        document.getElementById('ninzuSelect').value = `${Math.ceil(members.length / 4)}x4`;
      }
      if (el.id === 'showKibetsu' && el.checked) {
        document.getElementById('showAll').checked = false;
        document.getElementById('showNinzu').checked = false;
        const ki = document.getElementById('kibetsuSelect').value;
        const filtered = members.filter(m => m.ki === ki);
        grid = filtered.map(m => m.name_ja);
        const [rows, cols] = ['4x2', '3x2', '2x2', '2x1'].find(size => {
          const [r, c] = size.split('x').map(Number);
          return r * c >= filtered.length;
        }).split('x').map(Number);
        document.getElementById('ninzuSelect').value = `${rows}x${cols}`;
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
    const selected = document.getElementById('memberSelect').value;
    if (selected && currentIndex !== null) grid[currentIndex] = selected;
    document.getElementById('popup').style.display = 'none';
    renderGrid();
  });

  document.getElementById('downloadButton').addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * 3;
    tempCanvas.height = canvas.height * 3;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.scale(3, 3);
    renderGrid.call({ canvas: tempCanvas, getContext: () => tempCtx }); // 重新渲染
    const link = document.createElement('a');
    link.download = 'penlight_colors_300dpi.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  });
}

function showPopup(index) {
  currentIndex = index;
  const select = document.getElementById('memberSelect');
  select.innerHTML = '<option value="">選択なし</option>' +
    members.map(m => `<option value="${m.name_ja}">${m.name_ja} (${m.nickname}, ${m.ki})</option>`).join('');
  document.getElementById('popup').style.display = 'block';
}