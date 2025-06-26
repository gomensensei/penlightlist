// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – script.js (with Gen filter & label)
// ------------------------------------------------------------
import members from "./members.json" assert { type: "json" };

// ---------- DOM ----------
const canvas = document.getElementById("ticketCanvas");
const ctx = canvas.getContext("2d");

const konmeiSelect = document.getElementById("stageSelect");
const customKonmeiInput = document.getElementById("customStageInput");
const ninzuSelect = document.getElementById("ninzuSelect");
const showTextChk = document.getElementById("showOshiText");
const showColorChk = document.getElementById("showOshiColor");
const showGenChk = document.getElementById("showGenCheckbox");
const genSelect = document.getElementById("genSelect");
const pngBtn = document.getElementById("pngDownload");
const pdfBtn = document.getElementById("pdfDownload");

// ---------- State ----------
const state = {
  stageName: konmeiSelect.value,
  customStage: "",
  rows: 4,
  cols: 2,
  showText: showTextChk.checked,
  showColor: showColorChk.checked,
  showGen: showGenChk.checked,
  genFilter: "all",
  selected: [], // array of member ids
};

// ---------- Helpers ----------
function getDisplayMembers() {
  if (state.genFilter !== "all") {
    return members.filter((m) => m.gen == state.genFilter);
  }
  // fall back to selected; if none selected, show all for now
  if (state.selected.length === 0) return members;
  return members.filter((m) => state.selected.includes(m.id));
}

function autoResizeCanvas(count) {
  const { rows, cols } = state;
  const g = canvas.getContext("2d");
  const cellSize = 120;
  canvas.width = cols * cellSize + (cols + 1) * 8;
  canvas.height = rows * cellSize + (rows + 1) * 8 + 80; // header
}

function drawTicket() {
  const list = getDisplayMembers();
  autoResizeCanvas(list.length);

  ctx.fillStyle = "#ffeef5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header (stage name)
  ctx.fillStyle = "#ff66aa";
  ctx.font = "24px Noto Sans JP";
  ctx.textAlign = "left";
  const stageText = state.stageName === "other" ? state.customStage : state.stageName;
  ctx.fillText(stageText, 16, 40);

  // Draw cells
  const cellGap = 8;
  const cellSize = 120;
  list.slice(0, state.rows * state.cols).forEach((mem, idx) => {
    const r = Math.floor(idx / state.cols);
    const c = idx % state.cols;
    const x = cellGap + c * (cellSize + cellGap);
    const y = 80 + cellGap + r * (cellSize + cellGap);

    // Cell bg
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = "#ff66aa";
    ctx.strokeRect(x, y, cellSize, cellSize);

    // Photo
    const img = new Image();
    img.onload = () => {
      const w = cellSize * 0.8;
      const h = cellSize * 0.8;
      ctx.drawImage(img, x + (cellSize - w) / 2, y + (cellSize - h) / 2 - 10, w, h);
    };
    img.src = mem.image;

    // Oshi color text or block
    if (state.showText) {
      ctx.fillStyle = mem.color || "#333";
      ctx.font = "14px Noto Sans JP";
      ctx.textAlign = "center";
      ctx.fillText(mem.oshilabel || mem.colorName || "", x + cellSize / 2, y + cellSize - 10);
    }
    if (state.showColor) {
      ctx.fillStyle = mem.color || "#333";
      ctx.fillRect(x + cellSize - 20, y + cellSize - 20, 16, 16);
    }

    // Generation label
    if (state.showGen) {
      ctx.fillStyle = "#555";
      ctx.font = "12px Noto Sans JP";
      ctx.textAlign = "center";
      ctx.fillText(`${mem.gen}期`, x + cellSize / 2, y + cellSize + 12);
    }
  });
}

// ---------- Event Bindings ----------
konmeiSelect.addEventListener("change", (e) => {
  state.stageName = e.target.value;
  drawTicket();
  if (state.stageName === "other") {
    customKonmeiInput.style.display = "inline-block";
    customKonmeiInput.focus();
  } else {
    customKonmeiInput.style.display = "none";
  }
});
customKonmeiInput.addEventListener("input", (e) => {
  state.customStage = e.target.value;
  drawTicket();
});

ninzuSelect.addEventListener("change", (e) => {
  const [c, r] = e.target.value.split("x");
  state.cols = parseInt(c);
  state.rows = parseInt(r);
  drawTicket();
});

showTextChk.addEventListener("change", (e) => {
  state.showText = e.target.checked;
  drawTicket();
});
showColorChk.addEventListener("change", (e) => {
  state.showColor = e.target.checked;
  drawTicket();
});
showGenChk.addEventListener("change", (e) => {
  state.showGen = e.target.checked;
  drawTicket();
});

genSelect.addEventListener("change", (e) => {
  state.genFilter = e.target.value;
  drawTicket();
});

pngBtn.addEventListener("click", () => {
  drawTicket();
  const link = document.createElement("a");
  link.download = "akb_penlight.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// PDF download placeholder (future impl.)
pdfBtn.addEventListener("click", () => {
  alert("PDF 出力は次期実装予定です。\nPNG をご利用ください。");
});

// ---------- Init ----------
window.addEventListener("load", () => {
  drawTicket();
});
