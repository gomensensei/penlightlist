// === 修正版 script.js 2025-06-26 ===
// 保留原始邏輯並逐點修正：
// 1. 公演名下拉選單 "他" ➜ 自訂輸入框 **顯示/隱藏**
// 2. 預設公演名正確同步 drawTicket()
// 3. 選項勾選不會意外縮放 preview
// 4. 成員照片置中且自動寬度 80%
// 5. 推しカラー文字大小 & 位置微調
// 6. 所有 input / change 都會觸發 debouncedDrawTicket
// 7. penlight 色塊計算不出界 (含 bleed)

/* =======================  原始變數與常數 ======================= */
const canvas = document.getElementById('ticketCanvas');
const ctx = canvas.getContext('2d');
let previewScale = 1.0;

// ... 其餘原本 const fonts / size / dpi / debounce / drawText 等函式完整保留 ...

/* =======================  新增 DOM 參考 ======================= */
const eventPreset = document.getElementById('eventPreset');
const eventCustomInput = document.getElementById('eventCustomInput');
const eventCustomLabel = document.getElementById('eventCustomLabel');
const hiddenText2 = document.getElementById('text2');

/* =======================  功能修正 #1  ======================= */
function syncEventName() {
  let value = '';
  if (eventPreset.value === 'other') {
    value = eventCustomInput.value.trim();
  } else {
    value = eventPreset.options[eventPreset.selectedIndex].textContent;
  }
  hiddenText2.value = value;
  debouncedDrawTicket(70); // redraw preview (70 DPI for speed)
}

// 監聽變化
if (eventPreset) {
  eventPreset.addEventListener('change', () => {
    if (eventPreset.value === 'other') {
      eventCustomLabel.style.display = 'block';
      eventCustomInput.focus();
    } else {
      eventCustomLabel.style.display = 'none';
    }
    syncEventName();
  });
}
if (eventCustomInput) eventCustomInput.addEventListener('input', syncEventName);

/* =======================  功能修正 #2：預設值同步 ======================= */
window.addEventListener('DOMContentLoaded', () => {
  // 將下拉選單初始文字寫入 text2
  syncEventName();
  setPreviewScale(1.0);
});

/* =======================  功能修正 #3：縮放保持 ======================= */
function setPreviewScale(scale) {
  previewScale = scale;
  const baseW = dpi[70].base.w;
  const baseH = dpi[70].base.h;
  canvas.style.width = `${baseW * previewScale}px`;
  canvas.style.height = `${baseH * previewScale}px`;
  debouncedDrawTicket(70);
}

/* =======================  功能修正 #4：成員照片置中 ======================= */
function updateMemberPreview(imgUrl) {
  const container = document.getElementById('memberPreview');
  container.innerHTML = '';
  const img = new Image();
  img.onload = () => {
    img.style.maxWidth = '80%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    container.appendChild(img);
  };
  img.src = imgUrl;
}

/* =======================  功能修正 #5：推しカラー文字調整 ======================= */
function drawOshiText(lines, x, y, color) {
  // 字體大小 13pt → 16pt，letterSpacing 固定 0
  drawText(lines, x, y, fonts.kozgo, 16, 0, 0, color, 'center');
}

/* =======================  功能修正 #6：全欄位即時 redraw ======================= */
['input','change'].forEach(evt => {
  document.getElementById('controlsContainer').addEventListener(evt, (e) => {
    if (e.target.matches('input,select')) debouncedDrawTicket(70);
  });
});

/* =======================  功能修正 #7：色塊出界 ======================= */
function drawPenlightColorBlock(colors, startX, startY, blockW, blockH, mmPx) {
  const maxW = canvas.width - (sizes.bleed * mmPx);
  const safeW = Math.min(blockW, maxW - startX);
  const rectW = safeW / colors.length;
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.fillRect(startX + idx * rectW, startY, rectW, blockH);
  });
}

// 你原本 drawArea1/drawText2To6/drawTicket 內使用上方新函式，確保不超界

/* =======================  其餘原始程式碼完整保留 ======================= */
