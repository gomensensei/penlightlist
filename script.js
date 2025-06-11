// script.js
let grid = [];
let currentIndex = null;
const canvas = document.getElementById('renderCanvas');
const ctx = canvas.getContext('2d');
let members = [];
const preloadedImages = {};

// Load members and images
fetch('members.json')
  .then(res => res.json())
  .then(data => {
    members = data;
    members.forEach(m => {
      const img = new Image(); img.src = m.image;
      img.onload = () => preloadedImages[m.name_ja] = img;
      img.onerror = () => console.error('Failed to load', m.image);
    });
    initialize();
  })
  .catch(err => alert('メンバーデータ読み込み失敗'));

function initialize() {
  bindControls();
  updateGridSize();
  renderGrid();
}

function bindControls() {
  // Canvas click
  canvas.addEventListener('click', onCanvasClick);
  // Control panel
  document.querySelectorAll('#controls input, #controls select').forEach(el => {
    el.addEventListener('change', onControlChange);
  });
  document.getElementById('customKonmei').addEventListener('input', renderGrid);
  // Download
  document.getElementById('downloadButton').addEventListener('click', onDownload);
}

function onControlChange(e) {
  const id = e.target.id;
  if (id === 'konmeiSelect') {
    document.getElementById('customKonmei').style.display = e.target.value === 'other' ? 'inline-block' : 'none';
  }
  if (id === 'showColorBlock' && e.target.checked) document.getElementById('showColorText').checked = false;
  if (id === 'showColorText' && e.target.checked) document.getElementById('showColorBlock').checked = false;
  if (id === 'showAll' && e.target.checked) {
    document.getElementById('showKibetsu').checked = false;
    document.getElementById('showNinzu').checked = false;
    grid = members.map(m => m.name_ja);
    setGridSizeFromCount(grid.length);
    renderGrid();
    return;
  }
  if (id === 'showKibetsu' && e.target.checked) {
    document.getElementById('showAll').checked = false;
    document.getElementById('showNinzu').checked = false;
    const ki = document.getElementById('kibetsuSelect').value;
    const filtered = members.filter(m => m.ki === ki).map(m => m.name_ja);
    grid = filtered;
    setGridSizeFromCount(filtered.length);
    renderGrid();
    return;
  }
  if (id === 'showNinzu' && e.target.checked) {
    document.getElementById('showAll').checked = false;
    document.getElementById('showKibetsu').checked = false;
  }
  updateGridSize();
  renderGrid();
}

function setGridSizeFromCount(count) {
  const cols = Math.min(Math.ceil(Math.sqrt(count)), 4);
  const rows = Math.ceil(count / cols);
  document.getElementById('ninzuSelect').value = `${cols}x${rows}`;
  updateGridSize();
}

function onCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top - 40;
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const cellW = canvas.width / cols;
  const cellH = (canvas.height - 40) / rows;
  const col = Math.floor(x / cellW);
  const row = Math.floor(y / cellH);
  const idx = row * cols + col;
  if (idx < grid.length && !grid[idx]) showPopup(idx);
}

function updateGridSize() {
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const newGrid = Array(cols * rows).fill(null);
  grid.forEach((v,i) => { if (i < newGrid.length) newGrid[i] = v; });
  grid = newGrid;
}

function renderGrid(targetCanvas = canvas, targetCtx = ctx) {
  targetCtx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
  // background fill
  targetCtx.fillStyle = '#fff4f6';
  targetCtx.fillRect(0,0,targetCanvas.width,targetCanvas.height);
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  targetCanvas.height = rows * (targetCanvas.width / cols * 0.5625) + 40;
  const cellW = targetCanvas.width / cols;
  const cellH = (targetCanvas.height - 40) / rows;
  // 公演名
  if (document.getElementById('showKonmei').checked) {
    const text = document.getElementById('customKonmei').value.trim() || document.getElementById('konmeiSelect').value;
    targetCtx.fillStyle = '#F676A6';
    targetCtx.font = '24px KozGoPr6N';
    targetCtx.textAlign = 'left';
    targetCtx.fillText(text, 10, 30);
  }
  // cells
  grid.forEach((name,i) => {
    const r = Math.floor(i/cols), c = i%cols;
    const x = c*cellW, y = r*cellH+40;
    targetCtx.strokeStyle = '#F676A6'; targetCtx.strokeRect(x,y,cellW,cellH);
    if (!name) {
      targetCtx.fillStyle = '#F676A6'; targetCtx.font='24px KozGoPr6N';
      targetCtx.textAlign='center'; targetCtx.textBaseline='middle';
      targetCtx.fillText('+',x+cellW/2,y+cellH/2);
      return;
    }
    const m = members.find(m=>m.name_ja===name);
    let offset=y+10;
    if (document.getElementById('showPhoto').checked && preloadedImages[name]) {
      const img=preloadedImages[name];
      const ratio=img.naturalWidth/img.naturalHeight;
      let h=cellH*0.3, w=h*ratio;
      if(w>cellW-20){w=cellW-20;h=w/ratio;}
      targetCtx.drawImage(img,x+(cellW-w)/2,offset,w,h);
      offset+=h+5;
    }
    targetCtx.textAlign='center'; targetCtx.textBaseline='top';
    targetCtx.fillStyle='#000'; targetCtx.font='18px KozGoPr6N';
    if(offset+20<y+cellH) targetCtx.fillText(m.name_ja,x+cellW/2,offset);
    offset+=22;
    if(document.getElementById('showNickname').checked&&offset+18<y+cellH){targetCtx.font='16px KozGoPr6N';targetCtx.fillText(m.nickname,x+cellW/2,offset);offset+=20;}
    if(document.getElementById('showKi').checked&&offset+18<y+cellH){targetCtx.font='16px KozGoPr6N';targetCtx.fillText(m.ki,x+cellW/2,offset);offset+=20;}
    // colors
    const showBlock=document.getElementById('showColorBlock').checked;
    const showText=document.getElementById('showColorText').checked;
    if(showBlock&&offset+40<y+cellH){m.colors.forEach((colc,j)=>{targetCtx.fillStyle=colc;targetCtx.fillRect(x+10+j*45,offset,40,40);});offset+=45;}
    if(showText&&offset+18<y+cellH){const map={'#FF0000':'赤','#00FF00':'緑','#0000FF':'青','#FFFF00':'黄','#FFFFFF':'白','#FF69B4':'ピンク'};let txs='';m.colors.forEach((c,k)=>{txs+=(map[c]||c)+(k<m.colors.length-1?' x ':'');});targetCtx.font='16px KozGoPr6N';targetCtx.fillStyle='#000';targetCtx.fillText(txs,x+cellW/2,offset);}
  });
}

// Popup
function showPopup(idx) {
  currentIndex = idx;
  const popup = document.getElementById('popup');
  popup.innerHTML = '<div id="accordion"></div><div style="text-align:right;margin-top:10px;"><button id="btnSelect">選択</button><button id="btnClose">閉じる</button></div>';
  // build accordion
  const ac = popup.querySelector('#accordion');
  Array.from(new Set(members.map(m=>m.ki))).forEach(ki=>{
    const det=document.createElement('details');
    const sum=document.createElement('summary'); sum.textContent=ki;
    const div=document.createElement('div'); div.className='member-list';
    members.filter(m=>m.ki===ki).forEach(m=>{
      const it=document.createElement('div'); it.className='member-item';
      it.innerHTML=`<img src="${m.image}" width="30"/><span>${m.name_ja}</span>`;
      it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(el=>el.classList.remove('selected'));it.classList.add('selected');};
      div.appendChild(it);
    });
    det.appendChild(sum);det.appendChild(div);ac.appendChild(det);
  });
  // bind buttons
  popup.querySelector('#btnClose').onclick = ()=>popup.style.display='none';
  popup.querySelector('#btnSelect').onclick = ()=>{
    const sel = popup.querySelector('.member-item.selected');
    if(sel){grid[currentIndex]=sel.querySelector('span').textContent;renderGrid();popup.style.display='none';}
  };
  popup.style.display='block';
}

// Download handler
async function onDownload() {
  const temp = document.createElement('canvas');
  temp.width = canvas.width*2; temp.height = canvas.height*2;
  const tctx = temp.getContext('2d');
  tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,temp.width,temp.height);
  tctx.scale(2,2);
  renderGrid(temp,temp.getContext('2d'));
  const link=document.createElement('a');
  link.download='penlight_colors_300dpi.png';
  link.href=temp.toDataURL('image/png');link.click();
}
