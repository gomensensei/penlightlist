// === script.js (updated) ===
let grid = [];
let currentIndex = null;
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect; // height/width ratio
// load members
let members = [];
let preloadedImages = {};

fetch("members.json")
  .then(res => res.json())
  .then(data => {
    members = data;
    // preload images
    members.forEach(m => {
      const img = new Image();
      img.src = m.image;
      img.onload = () => preloadedImages[m.name_ja] = img;
      img.onerror = () => preloadedImages[m.name_ja] = null;
    });
    baseAspect = canvas.height / canvas.width;
    initialize();
  });

function initialize() {
  setupEventListeners();
  updateAndRender();
}

function updateAndRender() {
  updateGrid();
  renderGrid();
}

function updateGrid() {
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  // handle 全員
  if (document.getElementById("showAll").checked) {
    const total = members.length;
    const rows = Math.ceil(total / cols);
    grid = Array(rows * cols).fill(null);
    members.forEach((m,i) => grid[i] = m.name_ja);
    // nothing else
  } else {
    const rows = +document.getElementById("ninzuSelect").value.split("x")[1];
    const size = cols * rows;
    // preserve existing selections
    const newGrid = Array(size).fill(null);
    for (let i=0; i<Math.min(size, grid.length); i++) newGrid[i] = grid[i];
    grid = newGrid;
  }
  // resize canvas
  const colsNum = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = canvas.width / colsNum;
  const headerOffset = document.getElementById("showKonmei").checked ? 40 : 0;
  const cellH = cellW * baseAspect;
  canvas.height = grid.length/colsNum * cellH + headerOffset;
}

function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  const isDownload = targetCanvas !== canvas;
  const scale = targetCanvas.width / baseCanvasWidth;
  // clear & background
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  // header
  const showKonmei = document.getElementById("showKonmei").checked;
  const headerOffset = showKonmei ? 40 * scale : 0;
  if (showKonmei) {
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = `${24 * scale}px KozGoPr6N`;
    targetCtx.textAlign = 'left';
    const sel = document.getElementById("konmeiSelect").value;
    const custom = document.getElementById("customKonmei").value.trim();
    const text = sel === 'other' ? (custom || '') : sel;
    targetCtx.fillText(text, 10 * scale, 30 * scale);
  }
  // grid
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const rows = grid.length / cols;
  const cellW = targetCanvas.width / cols;
  const cellH = cellW * baseAspect;

  // determine display options
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNickname = document.getElementById("showNickname").checked;
  const showKi = document.getElementById("showKi").checked;
  const showColorBlock = document.getElementById("showColorBlock").checked;
  const showColorText = document.getElementById("showColorText").checked;
  // count visible rows for dynamic scaling
  const visCount = [showPhoto, true, showNickname, showKi, (showColorBlock||showColorText)].filter(Boolean).length;

  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i/cols), col = i%cols;
    const x = col*cellW, y = row*cellH + headerOffset;
    // cell background & border
    targetCtx.fillStyle = '#fff4f6';
    targetCtx.fillRect(x,y,cellW,cellH);
    targetCtx.strokeStyle = '#F676A6';
    targetCtx.strokeRect(x,y,cellW,cellH);
    const memberName = grid[i];
    if (!memberName) {
      if (!isDownload) {
        targetCtx.fillStyle = '#F676A6';
        targetCtx.font = `${24*scale}px KozGoPr6N`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('+', x+cellW/2, y+cellH/2);
      }
      continue;
    }
    const member = members.find(m=>m.name_ja===memberName);
    const centerX = x + cellW/2;
    // compute dynamic font
    let nameFontSize;
    if (!showPhoto && !showNickname && !showKi && showColorBlock && !showColorText) {
      // only name + blocks: maximize
      nameFontSize = cellW / (memberName.length * 0.6);
    } else {
      // shrink proportionally by number of rows
      nameFontSize = (cellH/ (visCount+1)) * 0.5;
    }
    // Photo
    if (showPhoto && preloadedImages[memberName]) {
      const img=preloadedImages[memberName];
      const aspect=img.naturalWidth/img.naturalHeight;
      let h=cellH*0.25, w=h*aspect;
      if(w>cellW*0.8){w=cellW*0.8;h=w/aspect;}
      targetCtx.drawImage(img, x+(cellW-w)/2, y+5*scale, w,h);
    }
    // Name
    targetCtx.fillStyle='#F676A6';
    targetCtx.textAlign='center'; targetCtx.textBaseline='top';
    targetCtx.font=`${nameFontSize*scale}px KozGoPr6N`;
    targetCtx.fillText(memberName, centerX, y + (showPhoto?cellH*0.3: cellH*0.1));
    // Nickname
    if(showNickname) {
      targetCtx.font=`${20*scale}px KozGoPr6N`;
      targetCtx.fillText(member.nickname, centerX, y + cellH*0.4);
    }
    // 期
    if(showKi) {
      targetCtx.font=`${20*scale}px KozGoPr6N`;
      targetCtx.fillText(member.ki, centerX, y + cellH*0.5);
    }
    // Color
    if(showColorBlock) {
      const colors=member.colors;
      let blockSize;
      if(!showPhoto && !showNickname && !showKi && !showColorText) {
        blockSize = (cellW*0.5)/colors.length;
      } else {
        blockSize = Math.min(40*scale, cellW/colors.length*0.6);
      }
      const totalW=colors.length*blockSize;
      colors.forEach((c,j)=>{
        targetCtx.fillStyle = c||'#f0f0f0';
        targetCtx.fillRect(x+(cellW-totalW)/2 + j*blockSize, y+cellH*0.7, blockSize, blockSize);
      });
    }
    if(showColorText) {
      targetCtx.font=`${18*scale}px KozGoPr6N`;
      const txt=member.colors.join('/');
      targetCtx.fillText(txt, centerX, y+cellH*0.75);
    }
    // Download hide UI
    if(!isDownload) {
      targetCtx.fillStyle='#F676A6'; targetCtx.font=`${12*scale}px KozGoPr6N`;
      targetCtx.textAlign='right'; targetCtx.textBaseline='top';
      targetCtx.fillText('選択', x+cellW-10*scale, y+10*scale);
    }
  }
}

function setupEventListeners() {
  ['change','input'].forEach(evt=>{
    document.querySelectorAll('#controls input,#controls select').forEach(el=>el.addEventListener(evt,updateAndRender));
  });
  // customKonmei display toggle
  document.getElementById('konmeiSelect').addEventListener('change',e=>{
    document.getElementById('customKonmei').style.display = e.target.value==='other'?'inline':'none';
  });
  // popup
  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    const cols=+document.getElementById("ninzuSelect").value.split("x")[0];
    const cellW=canvas.width/cols;
    const cellH=cellW*baseAspect;
    const headerOffset=document.getElementById("showKonmei").checked?40:0;
    const col=Math.floor(x/cellW), row=Math.floor((y-headerOffset)/cellH);
    const idx=row*cols+col;
    if(idx<0||idx>=grid.length) return;
    showPopup(idx);
  });
  // download
  document.getElementById('downloadButton').addEventListener('click',async()=>{
    const tmp=document.createElement('canvas');
    tmp.width=canvas.width*2; tmp.height=canvas.height*2;
    const tmpCtx=tmp.getContext('2d');
    renderGrid(tmp, tmpCtx);
    const link=document.createElement('a');
    link.download='penlight_colors_300dpi.png';
    link.href=tmp.toDataURL(); link.click();
  });
}

function showPopup(index) {
  currentIndex=index;
  const popup=document.getElementById('popup');
  // build
  const periods=[...new Set(members.map(m=>m.ki))];
  let html='';
  periods.forEach(p=>{
    html+=`<details><summary>${p}</summary><div class="member-list">`;
    members.filter(m=>m.ki===p).forEach(m=>{
      html+=`<div class="member-item"><img src="${m.image}" width="48"><span>${m.name_ja}</span></div>`;
    });
    html+='</div></details>';
  });
  popup.innerHTML=html+`<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
  popup.style.display='block';
  popup.querySelectorAll('.member-item').forEach(it=>it.addEventListener('click',()=>{
    popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));
    it.classList.add('selected');
  }));
  document.getElementById('popupSelectBtn').onclick=()=>{
    const sel=popup.querySelector('.member-item.selected span');
    if(sel){ grid[currentIndex]=sel.textContent; popup.style.display='none'; renderGrid(); }
  };
  document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';
}
