// script.js
let grid = [];
let currentIndex = null;
const canvas = document.getElementById('renderCanvas');
const ctx = canvas.getContext('2d');
let members = [];
const preloadedImages = {};

// 色名對應表
const colorNames = {
  '#FF0000': '赤',
  '#00FF00': '緑',
  '#0000FF': '青',
  '#FFFF00': '黄',
  '#FFFFFF': '白',
  '#FF69B4': 'ピンク',
  '#FFA500': 'オレンジ',
  '#800080': '紫',
  '#00CED1': '水色',
  '#FFB6C1': '薄ピンク'
};

// 載入成員
fetch('members.json')
  .then(res => res.json())
  .then(data => {
    members = data;
    // 預載圖
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
  canvas.addEventListener('click', onCanvasClick);
  document.querySelectorAll('#controls input, #controls select').forEach(el => el.addEventListener('change', onControlChange));
  document.getElementById('customKonmei').addEventListener('input', renderGrid);
  document.getElementById('downloadButton').addEventListener('click', onDownload);
  // 讓期別下拉可即時更新
  document.getElementById('kibetsuSelect').addEventListener('change', () => onControlChange({target: document.getElementById('showKibetsu')}));
}

function onControlChange(e) {
  const id = e.target.id;
  if (id === 'konmeiSelect') {
    const custom = document.getElementById('customKonmei');
    custom.style.display = e.target.value === 'other' ? 'inline-block' : 'none';
  }
  if (id === 'showColorBlock' && e.target.checked) document.getElementById('showColorText').checked = false;
  if (id === 'showColorText' && e.target.checked) document.getElementById('showColorBlock').checked = false;
  if (id === 'showAll' && e.target.checked) {
    // 全員 5x10 排列
    document.getElementById('showKibetsu').checked = false;
    document.getElementById('showNinzu').checked = false;
    document.getElementById('ninzuSelect').value = '5x10';
    grid = members.map(m=>m.name_ja);
    updateGridSize();
    renderGrid();
    return;
  }
  if (id === 'showKibetsu' && e.target.checked) {
    document.getElementById('showAll').checked = false;
    document.getElementById('showNinzu').checked = false;
    const ki = document.getElementById('kibetsuSelect').value;
    grid = members.filter(m=>m.ki===ki).map(m=>m.name_ja);
    // 自動排格
    const count = grid.length;
    const cols = Math.min(5, count);
    const rows = Math.ceil(count/cols);
    document.getElementById('ninzuSelect').value = `${cols}x${rows}`;
    updateGridSize();
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

function onCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width/rect.width);
  const y = (e.clientY - rect.top) * (canvas.height/rect.height) - 40;
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  const cellW = canvas.width/cols;
  const cellH = (canvas.height-40)/rows;
  const col = Math.floor(x/cellW);
  const row = Math.floor(y/cellH);
  const idx = row*cols+col;
  if (idx<grid.length && !grid[idx]) showPopup(idx);
}

function updateGridSize() {
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  grid.length = cols*rows;
}

function renderGrid(tc=canvas, tctx=ctx) {
  // 背景
  tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tc.width,tc.height);
  // 公演名
  if(document.getElementById('showKonmei').checked) {
    const sel = document.getElementById('konmeiSelect').value;
    const text = sel==='other'? document.getElementById('customKonmei').value.trim() : sel;
    if(text) {
      tctx.fillStyle='#f676a6'; tctx.font='32px KozGoPr6N'; tctx.textAlign='left'; tctx.fillText(text,20,32);
    }
  }
  const [cols, rows] = document.getElementById('ninzuSelect').value.split('x').map(Number);
  tc.height = rows*(tc.width/cols*0.5625)+40;
  const cellW = tc.width/cols;
  const cellH = (tc.height-40)/rows;
  grid.forEach((name,i)=>{
    const cx=i%cols, ry=Math.floor(i/cols);
    const x=cx*cellW, y=ry*cellH+40;
    tctx.strokeStyle='#f676a6'; tctx.strokeRect(x,y,cellW,cellH);
    if(!name) {
      tctx.fillStyle='#f676a6'; tctx.font='48px KozGoPr6N';
      tctx.textAlign='center'; tctx.textBaseline='middle';
      tctx.fillText('+',x+cellW/2,y+cellH/2);
      return;
    }
    const m=members.find(m=>m.name_ja===name);
    let offY=y+10;
    if(document.getElementById('showPhoto').checked && preloadedImages[name]){
      const img=preloadedImages[name];
      const ratio=img.naturalWidth/img.naturalHeight;
      let h=cellH*0.3, w=h*ratio;
      if(w>cellW-20){w=cellW-20;h=w/ratio;}
      tctx.drawImage(img,x+(cellW-w)/2,offY,w,h);
      offY+=h+5;
    }
    // 文字 pink
    tctx.textAlign='center'; tctx.textBaseline='top'; tctx.fillStyle='#f676a6';
    tctx.font='20px KozGoPr6N'; tctx.fillText(m.name_ja,x+cellW/2,offY); offY+=24;
    if(document.getElementById('showNickname').checked){ tctx.font='18px KozGoPr6N'; tctx.fillText(m.nickname,x+cellW/2,offY); offY+=22; }
    if(document.getElementById('showKi').checked){ tctx.font='18px KozGoPr6N'; tctx.fillText(m.ki,x+cellW/2,offY); offY+=22; }
    const showBlk=document.getElementById('showColorBlock').checked;
    const showTxt=document.getElementById('showColorText').checked;
    if(showBlk){ m.colors.forEach((colc,j)=>{ tctx.fillStyle=colc; tctx.fillRect(x+10+j*(cellW/ m.colors.length),offY,cellW/m.colors.length-20,cellH*0.1); }); }
    else if(showTxt){ m.colors.forEach((colc,k)=>{
        const txt=colorNames[colc]||colc;
        tctx.fillStyle=colc;
        tctx.font='18px KozGoPr6N';
        const offsetX = x+cellW/2 - ((m.colors.length-1)*40/2) + k*40;
        tctx.fillText(txt, offsetX, offY);
    }); }
  });
}

function showPopup(idx){
  currentIndex=idx;
  const popup=document.getElementById('popup');
  popup.innerHTML='<div id="accordion"></div>'+
    '<div style="text-align:right;margin-top:10px;">'+
    '<button id="btnSelect">選択</button><button id="btnClose">閉じる</button></div>';
  const ac=popup.querySelector('#accordion');
  Array.from(new Set(members.map(m=>m.ki))).forEach(ki=>{
    const det=document.createElement('details');
    const sum=document.createElement('summary'); sum.textContent=ki;
    const div=document.createElement('div'); div.style.display='flex'; div.style.flexWrap='wrap'; div.style.gap='8px'; div.style.marginTop='8px';
    members.filter(m=>m.ki===ki).forEach(m=>{
      const it=document.createElement('div'); it.style.cursor='pointer'; it.style.textAlign='center';
      it.innerHTML=`<img src="${m.image}" width="40"/><div>${m.name_ja}</div>`;
      it.onclick=()=>{ popup.querySelectorAll('.member-item').forEach(el=>el.classList.remove('selected')); it.classList.add('selected'); };
      it.classList.add('member-item');
      div.appendChild(it);
    });
    det.append(sum,div); ac.appendChild(det);
  });
  popup.querySelector('#btnClose').onclick=()=>popup.style.display='none';
  popup.querySelector('#btnSelect').onclick=()=>{
    const sel=popup.querySelector('.member-item.selected');
    if(sel){ grid[currentIndex]=sel.querySelector('div').textContent; renderGrid(); popup.style.display='none'; }
  };
  popup.style.display='block';
}

function onDownload(){
  const temp=document.createElement('canvas'); temp.width=canvas.width*2; temp.height=canvas.height*2;
  const tctx=temp.getContext('2d');
  tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,temp.width,temp.height);
  tctx.scale(2,2);
  renderGrid(temp,tctx);
  const link=document.createElement('a'); link.download='penlight_colors_300dpi.png';
  link.href=temp.toDataURL('image/png'); link.click();
}
