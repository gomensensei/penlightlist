// script.js - AKB48 ペンライトカラー表 v2
// 重新整理版本：分清 state / render / UI，避免互相踩咀

(function () {
  'use strict';

  // ====== DOM 參照 ======
  const canvas = document.getElementById('renderCanvas');
  const ctx = canvas.getContext('2d');

  const controls = {
    showKonmei: document.getElementById('showKonmei'),
    konmeiSelect: document.getElementById('konmeiSelect'),
    customKonmei: document.getElementById('customKonmei'),

    showNinzu: document.getElementById('showNinzu'),
    ninzuSelect: document.getElementById('ninzuSelect'),

    showNickname: document.getElementById('showNickname'),
    showPhoto: document.getElementById('showPhoto'),
    showColorBlock: document.getElementById('showColorBlock'),
    showColorText: document.getElementById('showColorText'),

    showKi: document.getElementById('showKi'),
    showKibetsu: document.getElementById('showKibetsu'),
    kibetsuSelect: document.getElementById('kibetsuSelect'),

    showAll: document.getElementById('showAll'),

    downloadButton: document.getElementById('downloadButton'),
    popup: document.getElementById('popup')
  };

  // ====== 全域狀態 ======
  const state = {
    members: [],
    images: new Map(),           // name_ja -> Image
    mode: 'custom',              // 'custom' | 'all' | 'kibetsu'
    cols: 4,
    rows: 2,
    grid: [],                    // 現正用來畫嘅格 (依 mode 而變)
    customGrid: [],              // 只屬於 custom 模式
    currentCellIndex: null,
    baseCanvasWidth: canvas.width,
    baseCellAspect: canvas.height / canvas.width // 每格高寬比例
  };

  // ====== 初始化 ======
  init();

  function init() {
    loadMembers()
      .then(() => {
        initStateFromDom();
        setupControlListeners();
        updateAndRender();
      })
      .catch(err => {
        console.error('Failed to initialize penlight table:', err);
      });
  }

  // 讀取 members.json + preload 圖片
  function loadMembers() {
    return fetch('members.json')
      .then(res => {
        if (!res.ok) throw new Error('members.json load failed');
        return res.json();
      })
      .then(data => {
        state.members = Array.isArray(data) ? data : [];
        const promises = state.members.map(m => {
          return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              state.images.set(m.name_ja, img);
              resolve();
            };
            img.onerror = () => {
              state.images.set(m.name_ja, null);
              resolve();
            };
            img.src = m.image;
          });
        });
        return Promise.all(promises);
      });
  }

  // 從 ninzuSelect 初始化 cols/rows + customGrid
  function initStateFromDom() {
    const [cols, rows] = parseNinzu(controls.ninzuSelect.value);
    state.cols = cols;
    state.rows = rows;
    state.customGrid = new Array(cols * rows).fill(null);
    state.grid = state.customGrid.slice();
    state.mode = 'custom';
    // 初始時，其他 checkbox 已按 HTML 預設
    toggleCustomKonmeiVisibility();
  }

  // ====== 控制項事件 ======
  function setupControlListeners() {
    // 一般控制項：變更就重畫
    document
      .querySelectorAll('#controls input, #controls select')
      .forEach(el => {
        el.addEventListener('change', onControlsChanged);
        el.addEventListener('input', onControlsChanged);
      });

    // 公演名 other → 顯示自訂輸入框
    controls.konmeiSelect.addEventListener('change', toggleCustomKonmeiVisibility);

    // showAll / showKibetsu 互斥
    controls.showAll.addEventListener('change', () => {
      if (controls.showAll.checked) {
        controls.showKibetsu.checked = false;
      }
      updateAndRender();
    });

    controls.showKibetsu.addEventListener('change', () => {
      if (controls.showKibetsu.checked) {
        controls.showAll.checked = false;
      }
      updateAndRender();
    });

    // Canvas click → 只喺 custom 模式打開 popup
    canvas.addEventListener('click', onCanvasClick);

    // 下載高解像 PNG
    controls.downloadButton.addEventListener('click', downloadHighRes);
  }

  function onControlsChanged() {
    updateAndRender();
  }

  function toggleCustomKonmeiVisibility() {
    controls.customKonmei.style.display =
      controls.konmeiSelect.value === 'other' ? 'inline-block' : 'none';
  }

  // ====== Mode / Grid 同步 ======
  function updateAndRender() {
    syncStateFromControls();
    resizeCanvasToFitGrid();
    renderGrid(canvas, ctx, false);
  }

  function syncStateFromControls() {
    // 解析人數設定
    const [cols, rows] = parseNinzu(controls.ninzuSelect.value);
    const prevCols = state.cols;
    const prevRows = state.rows;

    if (cols !== prevCols || rows !== prevRows) {
      state.cols = cols;
      state.rows = rows;
      // 只喺 custom 模式下 resize customGrid
      resizeCustomGrid(cols, rows);
    }

    // 決定 mode
    if (controls.showAll.checked) {
      state.mode = 'all';
    } else if (controls.showKibetsu.checked) {
      state.mode = 'kibetsu';
    } else {
      state.mode = 'custom';
    }

    // 根據 mode 生成 grid
    if (state.mode === 'all') {
      state.grid = state.members.map(m => m.name_ja);
    } else if (state.mode === 'kibetsu') {
      const kiVal = controls.kibetsuSelect.value;
      const filtered = state.members
        .filter(m => m.ki === kiVal)
        .map(m => m.name_ja);
      state.grid = filtered;
    } else {
      // custom
      state.grid = state.customGrid.slice();
    }
  }

  function resizeCustomGrid(cols, rows) {
    const newSize = cols * rows;
    const old = state.customGrid || [];
    const newGrid = new Array(newSize).fill(null);
    const copyLen = Math.min(old.length, newSize);
    for (let i = 0; i < copyLen; i++) {
      newGrid[i] = old[i];
    }
    state.customGrid = newGrid;
  }

  function parseNinzu(value) {
    const parts = String(value || '').split('x');
    const cols = parseInt(parts[0], 10) || 4;
    const rows = parseInt(parts[1], 10) || 2;
    return [cols, rows];
  }

  // ====== Canvas 尺寸計算 ======
  function resizeCanvasToFitGrid() {
    const cols = state.mode === 'custom'
      ? state.cols
      : parseNinzu(controls.ninzuSelect.value)[0];

    const totalCells = Math.max(state.grid.length, cols * (state.rows || 1));
    const rows = Math.max(1, Math.ceil(totalCells / cols));

    const showHeader = controls.showKonmei.checked || controls.showNinzu.checked;
    const headerPx = showHeader ? 40 : 0;

    const cellW = canvas.width / cols;
    const cellH = cellW * state.baseCellAspect;
    const newHeight = headerPx + rows * cellH;

    canvas.height = newHeight;
  }

  function computeCanvasHeight(width, cols, gridLength, showHeader) {
    const headerPx = showHeader ? 40 * (width / state.baseCanvasWidth) : 0;
    const rows = Math.max(1, Math.ceil(Math.max(gridLength, 1) / cols));
    const cellW = width / cols;
    const cellH = cellW * state.baseCellAspect;
    return Math.round(headerPx + rows * cellH);
  }

  // ====== 渲染 ======
  function renderGrid(targetCanvas, targetCtx, forDownload) {
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const scale = width / state.baseCanvasWidth;

    // 背景
    targetCtx.fillStyle = '#fff4f6';
    targetCtx.fillRect(0, 0, width, height);

    // 控制項狀態
    const showKonmei = controls.showKonmei.checked;
    const showNinzu = controls.showNinzu.checked;
    const showNickname = controls.showNickname.checked;
    const showPhoto = controls.showPhoto.checked;
    const showColorBlock = controls.showColorBlock.checked;
    const showColorText = controls.showColorText.checked;
    const showKi = controls.showKi.checked;

    const [colsFromCtrl] = parseNinzu(controls.ninzuSelect.value);
    const cols = state.mode === 'custom' ? state.cols : colsFromCtrl;
    const totalCells = Math.max(state.grid.length, cols * (state.rows || 1));
    const rows = Math.max(1, Math.ceil(totalCells / cols));

    const useHeader = showKonmei || showNinzu;
    const headerHeight = useHeader ? 40 * scale : 0;
    const cellW = width / cols;
    const cellH = (height - headerHeight) / rows;

    // Header: 公演名 + 人數
    if (useHeader) {
      targetCtx.textBaseline = 'middle';
      targetCtx.textAlign = 'left';
      targetCtx.font = `${22 * scale}px KozGoPr6N`;
      targetCtx.fillStyle = '#F676A6';

      if (showKonmei) {
        const sel = controls.konmeiSelect.value;
        const txt =
          sel === 'other'
            ? (controls.customKonmei.value || '').trim()
            : sel;
        const title = txt || '公演名未設定';
        targetCtx.fillText(title, 12 * scale, 20 * scale);
      }

      if (showNinzu) {
        const ninzuText = controls.ninzuSelect.value || '';
        targetCtx.textAlign = 'right';
        targetCtx.font = `${16 * scale}px KozGoPr6N`;
        targetCtx.fillText(`人数: ${ninzuText}`, width - 12 * scale, 20 * scale);
      }
    }

    // 每格內容
    for (let i = 0; i < rows * cols; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * cellW;
      const y = headerHeight + row * cellH;

      // cell 背景 + 邊框
      targetCtx.fillStyle = '#ffffff';
      targetCtx.fillRect(x, y, cellW, cellH);
      targetCtx.strokeStyle = '#F676A6';
      targetCtx.lineWidth = 1 * scale;
      targetCtx.strokeRect(x, y, cellW, cellH);

      const name = state.grid[i] || null;
      const hasMember = !!name;

      if (!hasMember) {
        // custom 模式下，無人時顯示 "+" 提示
        if (!forDownload && state.mode === 'custom') {
          targetCtx.fillStyle = '#F676A6';
          targetCtx.textAlign = 'center';
          targetCtx.textBaseline = 'middle';
          targetCtx.font = `${28 * scale}px KozGoPr6N`;
          targetCtx.fillText('+', x + cellW / 2, y + cellH / 2);
        }
        continue;
      }

      const mem = state.members.find(m => m.name_ja === name);
      if (!mem) continue;

      let cursorY = y + 6 * scale;

      // 照片
      if (showPhoto) {
        const img = state.images.get(mem.name_ja);
        if (img) {
          const maxH = cellH * 0.4;
          const maxW = cellW * 0.8;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const ratio = w / h;

          if (h > maxH) {
            h = maxH;
            w = h * ratio;
          }
          if (w > maxW) {
            w = maxW;
            h = w / ratio;
          }

          const imgX = x + (cellW - w) / 2;
          targetCtx.drawImage(img, imgX, cursorY, w, h);
          cursorY += h + 6 * scale;
        }
      }

      // 名字
      const nameMaxWidth = cellW - 10 * scale;
      const nameBaseSize = cellH * 0.22;
      const nameFontSize = fitTextSize(targetCtx, mem.name_ja, nameBaseSize * scale, nameMaxWidth);
      targetCtx.font = `${nameFontSize}px KozGoPr6N`;
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'top';
      targetCtx.fillStyle = '#F676A6';
      targetCtx.fillText(mem.name_ja, x + cellW / 2, cursorY);
      cursorY += nameFontSize + 4 * scale;

      // 暱稱
      if (showNickname && mem.nickname) {
        const nickFontSize = Math.min(18 * scale, cellH * 0.16);
        targetCtx.font = `${nickFontSize}px KozGoPr6N`;
        targetCtx.fillStyle = '#F676A6';
        targetCtx.fillText(mem.nickname, x + cellW / 2, cursorY);
        cursorY += nickFontSize + 2 * scale;
      }

      // 期
      if (showKi && mem.ki) {
        const kiFontSize = Math.min(16 * scale, cellH * 0.14);
        targetCtx.font = `${kiFontSize}px KozGoPr6N`;
        targetCtx.fillStyle = '#F676A6';
        targetCtx.fillText(mem.ki, x + cellW / 2, cursorY);
        cursorY += kiFontSize + 2 * scale;
      }

      // 顏色區域
      const colors = Array.isArray(mem.colors) ? mem.colors : [];
      const hasColors = colors.length > 0;
      const colorAreaBottom = y + cellH - 6 * scale;

      if (hasColors && (showColorText || showColorBlock)) {
        // 顏色中文字
        if (showColorText) {
          const colorNames = colors.map(colorToName);
          const baseTextSize = 16 * scale;
          targetCtx.font = `${baseTextSize}px KozGoPr6N`;
          targetCtx.textBaseline = 'bottom';

          const sep = ' x ';
          const fullText = colorNames.join(sep);
          const fontSize = fitTextSize(targetCtx, fullText, baseTextSize, cellW - 10 * scale);

          targetCtx.font = `${fontSize}px KozGoPr6N`;
          targetCtx.fillStyle = '#F676A6';
          targetCtx.textAlign = 'center';
          targetCtx.fillText(fullText, x + cellW / 2, colorAreaBottom);
        }

        // 顏色色塊
        if (showColorBlock) {
          const blockHeight = cellH * 0.12;
          const blockWidth = Math.min(
            (cellW - 10 * scale) / (colors.length + 0.5),
            40 * scale
          );
          const totalBlocksWidth = colors.length * blockWidth;
          const startX = x + (cellW - totalBlocksWidth) / 2;
          const blockY = colorAreaBottom - (showColorText ? (blockHeight + 4 * scale) : blockHeight);

          colors.forEach((clr, idx) => {
            const color = clr || '#f0f0f0';
            targetCtx.fillStyle = color;
            targetCtx.fillRect(startX + idx * blockWidth, blockY, blockWidth, blockHeight);
            targetCtx.strokeStyle = '#e0e0e0';
            targetCtx.lineWidth = 1 * scale;
            targetCtx.strokeRect(startX + idx * blockWidth, blockY, blockWidth, blockHeight);
          });
        }
      }

      // 選択提示（只喺 custom + 非下載）
      if (!forDownload && state.mode === 'custom') {
        targetCtx.font = `${12 * scale}px KozGoPr6N`;
        targetCtx.fillStyle = '#F676A6';
        targetCtx.textAlign = 'right';
        targetCtx.textBaseline = 'top';
        targetCtx.fillText('選択', x + cellW - 6 * scale, y + 4 * scale);
      }
    }
  }

  function fitTextSize(ctx2d, text, baseSize, maxWidth) {
    let size = baseSize;
    if (!text) return size;
    ctx2d.font = `${size}px KozGoPr6N`;
    let width = ctx2d.measureText(text).width;
    while (width > maxWidth && size > 10) {
      size -= 1;
      ctx2d.font = `${size}px KozGoPr6N`;
      width = ctx2d.measureText(text).width;
    }
    return size;
  }

  function colorToName(hex) {
    const map = {
      '#FF0000': '赤',
      '#FFA500': 'オレンジ',
      '#FFFF00': '黄',
      '#0000FF': '青',
      '#00FF00': '緑',
      '#FFFFFF': '白',
      '#FF69B4': '濃いピンク',
      '#FFB6C1': '薄ピンク',
      '#32CD32': '黄緑',
      '#00CED1': 'ターコイズ',
      '#800080': '紫',
      '#FF1493': 'ピンク',
      '#000000': '黒'
    };
    return map[hex.toUpperCase()] || '';
  }

  // ====== Canvas 點擊 & Popup ======
  function onCanvasClick(e) {
    if (state.mode !== 'custom') {
      // 全員 / 期別 模式下唔畀改格，避免 state 混亂
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const showHeader = controls.showKonmei.checked || controls.showNinzu.checked;
    const headerHeight = showHeader ? 40 * (canvas.width / state.baseCanvasWidth) : 0;

    if (y < headerHeight) return;

    const cols = state.cols;
    const totalCells = state.grid.length || cols * (state.rows || 1);
    const rows = Math.max(1, Math.ceil(totalCells / cols));

    const cellW = canvas.width / cols;
    const cellH = (canvas.height - headerHeight) / rows;

    const col = Math.floor(x / cellW);
    const row = Math.floor((y - headerHeight) / cellH);
    const idx = row * cols + col;

    if (idx < 0 || idx >= state.customGrid.length) return;

    state.currentCellIndex = idx;
    openMemberPopup(idx);
  }

  function openMemberPopup(idx) {
    const popup = controls.popup;
    if (!popup) return;

    const groups = {};
    state.members.forEach(m => {
      if (!groups[m.ki]) groups[m.ki] = [];
      groups[m.ki].push(m);
    });
    const kis = Object.keys(groups);

    let html = '';
    kis.forEach(ki => {
      html += `<details open>
  <summary>${ki}</summary>
  <div class="member-list">`;
      groups[ki].forEach(m => {
        html += `
    <div class="member-item" data-name="${escapeHtml(m.name_ja)}">
      <img src="${m.image}" width="50" height="50" loading="lazy" />
      <span>${escapeHtml(m.name_ja)}</span>
    </div>`;
      });
      html += `
  </div>
</details>`;
    });

    html += `
  <div class="popup-footer">
    <button id="popupSelectBtn">選択</button>
    <button id="popupCloseBtn">閉じる</button>
  </div>`;

    popup.innerHTML = html;
    popup.style.display = 'block';

    // 事件
    popup.querySelectorAll('.member-item').forEach(item => {
      item.addEventListener('click', () => {
        popup.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });

    const selectBtn = popup.querySelector('#popupSelectBtn');
    const closeBtn = popup.querySelector('#popupCloseBtn');

    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        const selected = popup.querySelector('.member-item.selected');
        if (selected && state.currentCellIndex != null) {
          const name = selected.getAttribute('data-name');
          state.customGrid[state.currentCellIndex] = name;
          state.grid = state.customGrid.slice();
          state.currentCellIndex = null;
          popup.style.display = 'none';
          updateAndRender();
        } else {
          popup.style.display = 'none';
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        state.currentCellIndex = null;
        popup.style.display = 'none';
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ====== 下載高解像 PNG ======
  function downloadHighRes() {
    // 以 2x 宽度輸出，對應約 300 DPI（視乎實際列印尺寸）
    const scaleFactor = 2;
    const [colsFromCtrl] = parseNinzu(controls.ninzuSelect.value);
    const cols = state.mode === 'custom' ? state.cols : colsFromCtrl;
    const gridLength = Math.max(state.grid.length, cols * (state.rows || 1));

    const exportWidth = state.baseCanvasWidth * scaleFactor;
    const exportHeight = computeCanvasHeight(
      exportWidth,
      cols,
      gridLength,
      controls.showKonmei.checked || controls.showNinzu.checked
    );

    const tmp = document.createElement('canvas');
    tmp.width = exportWidth;
    tmp.height = exportHeight;
    const tctx = tmp.getContext('2d');

    renderGrid(tmp, tctx, true);

    const link = document.createElement('a');
    link.download = 'penlight_colors_300dpi.png';
    link.href = tmp.toDataURL('image/png');
    link.click();
  }
})();
