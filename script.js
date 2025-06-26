// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – 完整版 script.js
//  主要修正：
//  1. 自訂公演名輸入框顯示／同步
//  2. 公演名必定呈現於預覽與匯出
//  3. 切換選項不再縮放格子
//  4. 成員照片放大並置中
//  5. 推しカラー文字大小／定位自動調整
//  6. 預覽與匯出 1:1 一致（同一 drawTicket()）
//  7. 色塊大小統一且不出界
//  8. 「＋」熱區點擊準確（以絕對座標計算）
// ------------------------------------------------------------
(() => {
  "use strict";

  /* --------------------  DOM  -------------------- */
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  const konmeiSelect = document.getElementById("konmeiSelect");
  const customKonmei = document.getElementById("customKonmei");
  const ninzuSelect = document.getElementById("ninzuSelect");

  const optImage = document.getElementById("optionImage");
  const optOshiBlock = document.getElementById("optionOshiBlock");
  const optOshiText = document.getElementById("optionOshiText");

  const downloadBtn = document.getElementById("downloadPng");

  /* --------------------  Data  -------------------- */
  let members = [];
  const imgCache = new Map();

  // 顏色 → 日本語名稱對照表（不完整可自行擴充）
  const COLOR_NAME_MAP = {
    "#ff0000": "赤",
    "#00ff00": "緑",
    "#0000ff": "青",
    "#ffff00": "黄",
    "#ff66aa": "ピンク",
    "#00ffff": "シアン",
    "#ffa500": "オレンジ",
    "#800080": "パープル",
    "#ffffff": "白"
  };

  /* --------------------  State  -------------------- */
  const state = {
    rows: 2,
    cols: 4,
    konmei: "",
    showImage: true,
    showOshiBlock: false,
    showOshiText: false,
    cellSize: 200, // 基準 cell 大小
    scalePreview: 0.4 // 預覽縮放
  };

  const CELL_GAP = 8;
  const HEADER_H = 120;

  /* --------------------  Init  -------------------- */
  fetch("./members.json")
    .then((res) => res.json())
    .then((json) => {
      members = json.map((m) => ({
        ...m,
        colorName: COLOR_NAME_MAP[m.color?.toLowerCase()] || m.color
      }));
      initUI();
      drawPreview();
    });

  function initUI() {
    // 人數 Grid
    ninzuSelect.addEventListener("change", () => {
      const [c, r] = ninzuSelect.value.split("x").map(Number);
      state.cols = c;
      state.rows = r;
      drawPreview();
    });

    // 公演名
    konmeiSelect.addEventListener("change", () => {
      if (konmeiSelect.value === "other") {
        customKonmei.style.display = "inline-block";
        state.konmei = "";
      } else {
        customKonmei.style.display = "none";
        state.konmei = konmeiSelect.value;
      }
      drawPreview();
    });

    customKonmei.addEventListener("input", () => {
      state.konmei = customKonmei.value;
      drawPreview();
    });

    // 選項
    optImage.addEventListener("change", () => {
      state.showImage = optImage.checked;
      drawPreview();
    });
    optOshiBlock.addEventListener("change", () => {
      state.showOshiBlock = optOshiBlock.checked;
      if (state.showOshiBlock) state.showOshiText = false;
      optOshiText.checked = state.showOshiText;
      drawPreview();
    });
    optOshiText.addEventListener("change", () => {
      state.showOshiText = optOshiText.checked;
      if (state.showOshiText) state.showOshiBlock = false;
      optOshiBlock.checked = state.showOshiBlock;
      drawPreview();
    });

    // 下載
    downloadBtn.addEventListener("click", () => {
      const exportCanvas = document.createElement("canvas");
      drawTicket(exportCanvas, 3); // 3× 比例 ≈ 300DPI
      const link = document.createElement("a");
      link.download = `akb_penlight_${Date.now()}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
    });

    // ＋ 熱區點擊（準確）
    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / state.scalePreview;
      const y = (e.clientY - rect.top) / state.scalePreview;
      const { cellSize } = state;
      if (y < HEADER_H) return; // header 範圍非熱區
      const colIdx = Math.floor(x / (cellSize + CELL_GAP));
      const rowIdx = Math.floor((y - HEADER_H) / (cellSize + CELL_GAP));
      if (
        colIdx < 0 ||
        colIdx >= state.cols ||
        rowIdx < 0 ||
        rowIdx >= state.rows
      )
        return;
      alert(`你點擊了第 ${rowIdx + 1} 行 / 第 ${colIdx + 1} 列 (功能預留)`);
    });
  }

  /* --------------------  Draw Helpers -------------------- */
  function drawPreview() {
    drawTicket(canvas, state.scalePreview);
  }

  function drawTicket(targetCanvas, scale) {
    const { rows, cols, cellSize } = state;
    const W = cols * cellSize + (cols - 1) * CELL_GAP;
    const H = HEADER_H + rows * cellSize + (rows - 1) * CELL_GAP;

    targetCanvas.width = W * scale;
    targetCanvas.height = H * scale;
    const ctx = targetCanvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(scale, scale);

    // 背景
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue(
      "--bg-light"
    );
    ctx.fillStyle = bgColor || "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = "#000";
    ctx.font = "700 42px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.konmei || "公演名", W / 2, HEADER_H / 2);

    // Grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const member = members[idx]; // Demo 用：依序排，後續可自訂選擇
        const x = c * (cellSize + CELL_GAP);
        const y = HEADER_H + r * (cellSize + CELL_GAP);
        drawCell(ctx, member, x, y, cellSize);
      }
    }
  }

  function drawCell(ctx, member, x, y, size) {
    // 背框
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#ccc";
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // 圖片
    if (state.showImage && member?.image) {
      const img = getImage(member.image);
      if (img.complete) {
        const imgW = size * 0.8;
        const imgH = size * 0.8;
        ctx.drawImage(
          img,
          x + (size - imgW) / 2,
          y + (size - imgH) / 2,
          imgW,
          imgH
        );
      } else {
        img.onload = drawPreview;
      }
    }

    // 推し色塊
    if (state.showOshiBlock && member?.color) {
      const blockH = size * 0.12;
      ctx.fillStyle = member.color;
      const blockW = size * 0.5;
      ctx.fillRect(x + (size - blockW) / 2, y + size - blockH - 8, blockW, blockH);
    }

    // 推し色文字
    if (state.showOshiText && member?.colorName) {
      const fs = Math.max(12, size * 0.16);
      ctx.fillStyle = member.color;
      ctx.font = `700 ${fs}px 'Noto Sans JP', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(member.colorName, x + size / 2, y + size - 12);
    }

    // 成員姓名
    if (member) {
      const fs = Math.max(12, size * 0.18);
      ctx.fillStyle = "#000";
      ctx.font = `700 ${fs}px 'Noto Sans JP', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const name = member.jpName || member.enName;
      ctx.fillText(name, x + size / 2, y + 8, size * 0.9);
    }
  }

  /* --------------------  Utils -------------------- */
  function getImage(url) {
    if (imgCache.has(url)) return imgCache.get(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    imgCache.set(url, img);
    return img;
  }
})();
