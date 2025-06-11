// script.js
let grid = [];
let currentIndex = null;
const canvas = document.getElementById('renderCanvas');
const ctx = canvas.getContext('2d');
let members = [];
const preloadedImages = {};

const colorNames = {
  '#FF0000': '赤', '#00FF00': '緑', '#0000FF': '青', '#FFFF00': '黄',
  '#FFFFFF': '白', '#FF69B4': 'ピンク', '#FFA500': 'オレンジ',
  '#800080': '紫', '#00CED1': '水色', '#FFB6C1': '薄ピンク'
};

// Load data
fetch('members.json')
  .then(r=>r.json())
  .then(data=>{
    members = data;
    members.forEach(m=>{
      const img = new Image(); img.src = m.image;
      img.onload = ()=> preloadedImages[m.name_ja] = img;
    });
    init();
  });

function init(){
  bindControls();
  window.addEventListener('resize', renderGrid);
  updateGridSize();
  renderGrid();
}

function bindControls(){
  canvas.addEventListener('click', onCanvasClick);
  document.querySelectorAll('#controls input, #controls select').forEach(el=>el.addEventListener('change', onControlChange));
  document.getElementById('customKonmei').addEventListener('input', renderGrid);
  document.getElementById('downloadButton').addEventListener('click', onDownload);
}

function onControlChange(e){
  const id=e.target.id;
  if(id==='konmeiSelect'){
    const custom=document.getElementById('customKonmei');
    custom.style.display = e.target.value==='other'?'inline-block':'none';
    renderGrid(); return;
  }
  if(id==='kibetsuSelect' && document.getElementById('showKibetsu').checked){
    filterByKi(); return;
  }
  if(id==='showAll' && e.target.checked){ filterAll(); return; }
  if(id==='showKibetsu' && e.target.checked){ filterByKi(); return; }
  if(id==='showNinzu' && e.target.checked){ document.getElementById('showAll').checked=false; document.getElementById('showKibetsu').checked=false; }
  if(id==='showColorBlock'&&e.target.checked) document.getElementById('showColorText').checked=false;
  if(id==='showColorText'&&e.target.checked) document.getElementById('showColorBlock').checked=false;
  updateGridSize(); renderGrid();
}

function filterAll(){
  document.getElementById('showKibetsu').checked=false;
  document.getElementById('showNinzu').checked=false;
  const cols=5, rows=10;
  document.getElementById('ninzuSelect').value=`${cols}x${rows}`;
  grid = members.map(m=>m.name_ja);
  updateGridSize(); renderGrid();
}

function filterByKi(){
  document.getElementById('showAll').checked=false;
  document.getElementById('showNinzu').checked=false;
  const ki = document.getElementById('kibetsuSelect').value;
  const list = members.filter(m=>m.ki===ki).map(m=>m.name_ja);
  const cols=Math.min(5,list.length), rows=Math.ceil(list.length/cols);
  document.getElementById('ninzuSelect').value=`${cols}x${rows}`;
  grid=list; updateGridSize(); renderGrid();
}

function updateGridSize(){
  const [cols,rows]=document.getElementById('ninzuSelect').value.split('x').map(Number);
  grid.length=cols*rows;
}

function onCanvasClick(e){
  const rect=canvas.getBoundingClientRect();
  const scale=canvas.width/rect.width;
  const x=(e.clientX-rect.left)*scale;
  const y=(e.clientY-rect.top)*scale-40;
  const [cols,rows]=document.getElementById('ninzuSelect').value.split('x').map(Number);
  const w=canvas.width/cols, h=(canvas.height-40)/rows;
  const c=Math.floor(x/w), r=Math.floor(y/h);
  const idx=r*cols+c;
  if(idx<grid.length && !grid[idx]) showPopup(idx);
}

function renderGrid(tc=canvas, tctx=ctx){
  const cw=tc.clientWidth; tc.width=cw; tc.height=window.innerWidth<768?cw*0.5625*parseInt(getRows())+40:cw*0.5625*parseInt(getRows())+40;
  tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tc.width,tc.height);
  // title
  if(document.getElementById('showKonmei').checked){
    const sel=document.getElementById('konmeiSelect').value;
    const txt=sel==='other'?document.getElementById('customKonmei').value:sel;
    if(txt){ tctx.fillStyle='#f676a6'; tctx.font='28px KozGoPr6N'; tctx.fillText(txt,20,32); }
  }
  const [cols,rows]=document.getElementById('ninzuSelect').value.split('x').map(Number);
  const w=tc.width/cols, h=(tc.height-40)/rows;
  for(let i=0;i<grid.length;i++){
    const c=i%cols, r=Math.floor(i/cols);
    const x=c*w, y=r*h+40;
    tctx.strokeStyle='#f676a6'; tctx.strokeRect(x,y,w,h);
    if(!grid[i]){
      tctx.fillStyle='#f676a6'; tctx.font='48px KozGoPr6N'; tctx.textAlign='center'; tctx.textBaseline='middle'; tctx.fillText('+',x+w/2,y+h/2);
      continue;
    }
    const m=members.find(m=>m.name_ja===grid[i]);
    let offY=y;
    // text block occupies half height
    const textH=h/2;
    tctx.textAlign='center'; tctx.textBaseline='middle'; tctx.fillStyle='#f676a6'; tctx.font='20px KozGoPr6N';
    tctx.fillText(m.name_ja,x+w/2,offY+textH*0.25); tctx.font='18px KozGoPr6N';
    if(document.getElementById('showNickname').checked) tctx.fillText(m.nickname,x+w/2,offY+textH*0.5);
    if(document.getElementById('showKi').checked) tctx.fillText(m.ki,x+w/2,offY+textH*0.75);
    // color block
    const blockH=h/3, blockY=y+h*2/3;
    if(document.getElementById('showColorBlock').checked){
      const bw=w/m.colors.length;
      m.colors.forEach((colc,i)=>{ tctx.fillStyle=colc; tctx.fillRect(x+i*bw,blockY,bw,blockH); });
    }
    // color text
    if(document.getElementById('showColorText').checked){
      m.colors.forEach((colc,i)=>{
        const name=colorNames[colc]||colc;
        tctx.fillStyle=colc; tctx.font='18px KozGoPr6N';
        const totalW = m.colors.length*40;
        const startX = x + (w-totalW)/2 + i*40 + 20;
        tctx.fillText(name,startX,blockY+blockH/2);
      });
    }
  }
}

function getRows(){ return document.getElementById('ninzuSelect').value.split('x')[1]; }

function showPopup(idx){
  currentIndex=idx;
  const popup=document.getElementById('popup');
  popup.innerHTML='<div id="accordion"></div>'+
    '<div style="text-align:right;"><button id="selBtn">選択</button><button id="closeBtn">閉じる</button></div>';
  const ac=popup.querySelector('#accordion');
  Array.from(new Set(members.map(m=>m.ki))).forEach(ki=>{
    const det=document.createElement('details');
    const sum=document.createElement('summary'); sum.textContent=ki;
    const div=document.createElement('div'); div.style.display='flex'; div.style.flexWrap='wrap'; div.style.gap='10px';
    members.filter(m=>m.ki===ki).forEach(m=>{
      const it=document.createElement('div'); it.className='member-item'; it.style.cursor='pointer';
      it.innerHTML=`<img src="${m.image}" width="40"/><div>${m.name_ja}</div>`;
      it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(el=>el.classList.remove('sel')); it.classList.add('sel');};
      div.appendChild(it);
    }); det.append(sum,div); ac.appendChild(det);
  });
  popup.querySelector('#closeBtn').onclick=()=>popup.style.display='none';
  popup.querySelector('#selBtn').onclick=()=>{
    const sel=popup.querySelector('.member-item.sel');
    if(sel){ grid[currentIndex]=sel.querySelector('div').textContent; renderGrid(); popup.style.display='none'; }
  };
  popup.style.display='block';
}

function onDownload(){
  const tmp=document.createElement('canvas'); tmp.width=canvas.width*2; tmp.height=canvas.height*2;
  const tctx=tmp.getContext('2d'); tctx.fillStyle='#fff4f6'; tctx.fillRect(0,0,tmp.width,tmp.height);
  tctx.scale(2,2); renderGrid(tmp,tctx);
  const link=document.createElement('a'); link.download='penlight_colors_300dpi.png'; link.href=tmp.toDataURL('image/png'); link.click();
}
