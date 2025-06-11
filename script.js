// === script.js (Advanced Settings + Fixes) ===
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

// 詳細設定初期値(mm換算): canvas は 300dpi => 118.11px/cm => 29.53px/inch
const settings = {
  performanceName: { fontSize: 24, letterSpacing: 0, x:10, y:30 },
  fullName: { fontSize: null, letterSpacing: 0, x:0, yOffset:0 },
  nickname: { fontSize: 20, letterSpacing: 0, x:0, yOffset:0 },
  periodText: { fontSize: 20, letterSpacing: 0, x:0, yOffset:0 },
  photo: { x:0, yOffset:0, width: null, height: null },
  pushText1: { x:0, yOffset:0, fontSize:18 },
  pushText2: { x:0, yOffset:0, fontSize:18 },
};

async function preloadAll() {
  const res = await fetch("members.json");
  members = await res.json();
  baseAspect = canvas.height / canvas.width;
  await Promise.all(members.map(m => new Promise(r => {
    const img = new Image(); img.src = m.image;
    img.onload = () => { preloadedImages[m.name_ja] = img; r(); };
    img.onerror = () => { preloadedImages[m.name_ja] = null; r(); };
  })));
}

preloadAll().then(() => {
  injectAdvancedPanel();
  makeResponsive();
  setupListeners();
  updateAndRender();
});

// 注入「詳細設定」パネル
function injectAdvancedPanel() {
  const panel = document.createElement('details');
  panel.id = 'advSettings';
  panel.innerHTML = `<summary>詳細設定</summary><div id="advControls"></div>`;
  document.getElementById('controls').append(panel);
  const adv = document.getElementById('advControls');
  // 各設定生成
  Object.keys(settings).forEach(key => {
    const cfg = settings[key];
    const group = document.createElement('div');
    group.className = 'adv-group';
    ['x','yOffset','fontSize','letterSpacing','width','height'].forEach(prop => {
      if(cfg[prop] !== undefined) {
        const label = document.createElement('label');
        label.innerText = `${key}.${prop}`;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = cfg[prop];
        inp.step = '1'; inp.addEventListener('input', ()=>{
          settings[key][prop] = parseFloat(inp.value);
          updateAndRender();
        });
        label.append(inp);
        group.append(label);
      }
    });
    adv.append(group);
  });
}

function makeResponsive() {
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  window.addEventListener('resize', ()=>{ canvas.style.height='auto'; });
}

function updateAndRender() {
  updateGrid();
  renderGrid();
}

function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const showAll = document.getElementById("showAll").checked;
  const useFilter = document.getElementById("showKibetsu").checked;
  const selFilter = document.getElementById("kibetsuSelect").value;
  if (showAll) {
    grid = Array(cols * Math.ceil(members.length / cols)).fill(null);
    members.forEach((m,i)=>grid[i]=m.name_ja);
  } else if (useFilter) {
    const f = members.filter(m=>m.ki===selFilter).map(m=>m.name_ja);
    grid = Array(cols * Math.ceil(f.length / cols)).fill(null);
    f.forEach((n,i)=>grid[i]=n);
  } else {
    grid = Array(cols*rows).fill(null).map((_,i)=>grid[i]||null);
  }
  resizeCanvas(cols, grid.length);
}
function resizeCanvas(cols,total) {
  const rows = Math.ceil(total/cols);
  const cellW = canvas.width/cols;
  const cellH = cellW*baseAspect;
  const headerH = document.getElementById("showKonmei").checked?40:0;
  canvas.height = rows*cellH + headerH;
}

async function renderGrid(tc=canvas,tcx=ctx) {
  const isDL = tc!==canvas;
  const scale = tc.width/baseCanvasWidth;
  tcx.fillStyle='#fff4f6';tcx.fillRect(0,0,tc.width,tc.height);
  const hasKon = document.getElementById("showKonmei").checked;
  const hdr = hasKon?40*scale:0;
  if(hasKon) {
    tcx.fillStyle='#F676A6';tcx.font=`${settings.performanceName.fontSize*scale}px KozGoPr6N`;
    tcx.textAlign='left';tcx.textBaseline='top';
    const v = document.getElementById("konmeiSelect").value;
    const t = v==='other'?document.getElementById("customKonmei").value.trim():v;
    tcx.fillText(t,settings.performanceName.x*scale,settings.performanceName.y*scale);
  }
  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cellW = tc.width/cols; const cellH = cellW*baseAspect;
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick = document.getElementById("showNickname").checked;
  const showKiTxt = document.getElementById("showKi").checked;
  let showBlk = document.getElementById("showColorBlock").checked;
  let showTxt = document.getElementById("showColorText").checked;
  if(showBlk===showTxt){showTxt=true;showBlk=false;document.getElementById("showColorBlock").checked=false;document.getElementById("showColorText").checked=true;}
  for(let i=0;i<grid.length;i++){
    const name=grid[i];const r=Math.floor(i/cols),c=i%cols;
    const x=c*cellW,y=r*cellH+hdr;
    tcx.fillStyle='#fff4f6';tcx.fillRect(x,y,cellW,cellH);tcx.strokeStyle='#F676A6';tcx.strokeRect(x,y,cellW,cellH);
    if(!name){if(!isDL){tcx.fillStyle='#F676A6';tcx.font=`${24*scale}px KozGoPr6N`;tcx.textAlign='center';tcx.textBaseline='middle';tcx.fillText('+',x+cellW/2,y+cellH/2);}continue;}
    const mem=members.find(m=>m.name_ja===name);
    let y0=y+settings.photo.yOffset*scale;
    if(showPhoto && preloadedImages[name]){
      const img=preloadedImages[name];const asp=img.naturalWidth/img.naturalHeight;
      let h=settings.photo.height||cellH*0.25,w=h*asp; if(w>cellW*0.8){w=cellW*0.8;h=w/asp;}
      tcx.drawImage(img,x+(cellW-w)/2,y0,w,h);
      y0+=h+5*scale;
    }
    let used=0; if(showPhoto)used+=cellH*0.3; if(showNick)used+=cellH*0.1; if(showBlk||showTxt)used+=cellH*0.15;
    const avail=cellH-used-(showPhoto?5*scale:0);
    // full name
    const L=name.length;let sz=Math.min(settings.fullName.fontSize||avail*0.4,(cellW-20)/(L*0.6));
    tcx.fillStyle='#F676A6';tcx.textAlign='center';tcx.textBaseline='top';tcx.font=`${sz}px KozGoPr6N`;
    tcx.fillText(name,x+cellW/2 + settings.fullName.x*scale,y0 + settings.fullName.yOffset*scale);
    y0+=sz+3;
    // nickname
    if(showNick){let s=settings.nickname.fontSize||Math.min(20,avail*0.15);
      tcx.font=`${s}px KozGoPr6N`;
      tcx.fillText(mem.nickname,x+cellW/2+settings.nickname.x*scale,y0+settings.nickname.yOffset*scale);
      y0+=s+3;
    }
    // period
    if(showKiTxt){let s=settings.periodText.fontSize||Math.min(20,avail*0.15);
      tcx.font=`${s}px KozGoPr6N`;
      tcx.fillText(mem.ki,x+cellW/2+settings.periodText.x*scale,y0+settings.periodText.yOffset*scale);
      y0+=s+3;
    }
    // push text
    if(showTxt){
      const map={'#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青','#00FF00':'緑','#FFFFFF':'白','#FF69B4':'濃いピンク','#FFB6C1':'薄ピンク','#32CD32':'黄緑'};
      tcx.textBaseline='middle';
      const arr=mem.colors,sep=' x ';
      let tot=0;arr.forEach((c,i)=>{const t=map[c]||'';tot+=tcx.measureText(t).width+(i<arr.length-1?tcx.measureText(sep).width:0);});
      let xx=x+(cellW-tot)/2+settings.pushText1.x*scale;
      arr.forEach((c,i)=>{
        const t=map[c]||'';
        tcx.fillStyle=(c==='#FFFFFF')?'#f5f2f2':c;
        tcx.font=`${settings['pushText'+(i+1)].fontSize}px KozGoPr6N`;
        tcx.fillText(t,xx,y+cellH*0.75+settings['pushText'+(i+1)].yOffset*scale);
        xx+=tcx.measureText(t).width;
        if(i<arr.length-1){tcx.fillStyle='#F676A6';tcx.fillText(sep.trim(),xx,y+cellH*0.75);xx+=tcx.measureText(sep.trim()).width;}
      });
    }
    // color blocks
    else if(showBlk){
      const arr=mem.colors;const blkW=cellW*(0.5/arr.length);
      const tw=blkW*arr.length;
      arr.forEach((c,j)=>{tcx.fillStyle=c||'#f0f0f0';tcx.fillRect(x+(cellW-tw)/2+j*blkW,y+cellH*0.8,blkW,blkW);});
    }
    if(!isDL){tcx.fillStyle='#F676A6';tcx.font=`12px KozGoPr6N`;tcx.textAlign='right';tcx.textBaseline='top';tcx.fillText('選択',x+cellW-10,y+10);}
  }
}

// setup listeners
function setupListeners(){
  // mutual exclusive mandatory push-color
  const b=document.getElementById('showColorBlock'), t=document.getElementById('showColorText');
  b.addEventListener('change',e=>{if(e.target.checked){t.checked=false;}else{e.target.checked=true;}updateAndRender();});
  t.addEventListener('change',e=>{if(e.target.checked){b.checked=false;}else{e.target.checked=true;}updateAndRender();});
  // period filter
  document.getElementById('showKibetsu').addEventListener('change',()=>{document.getElementById('showAll').checked=false;updateAndRender();});
  document.getElementById('kibetsuSelect').addEventListener('change',()=>{if(document.getElementById('showKibetsu').checked) updateAndRender();});
  // other controls
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKibetsu), #controls select:not(#kibetsuSelect)')
    .forEach(el=>el.addEventListener('change',updateAndRender));
  // popup
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const off=document.getElementById("showKonmei").checked?40:0;const mx=e.clientX-r.left,my=e.clientY-r.top-off;const cols=+document.getElementById("ninzuSelect").value.split("x")[0];const cw=canvas.width/cols,ch=cw*baseAspect;const col=Math.floor(mx/cw),row=Math.floor(my/ch),idx=row*cols+col;if(idx>=0&&idx<grid.length) showPopup(idx);});
  // download
  document.getElementById('downloadButton').addEventListener('click',async()=>{await preloadAll();const tmp=document.createElement('canvas');tmp.width=canvas.width*2;tmp.height=canvas.height*2;const p=tmp.getContext('2d');p.fillStyle='#fff4f6';p.fillRect(0,0,tmp.width,tmp.height);await renderGrid(tmp,p);const a=document.createElement('a');a.download='penlight_colors_300dpi.png';a.href=tmp.toDataURL();a.click();});
}

function showPopup(idx){currentIndex=idx;const popup=document.getElementById('popup');const per=[...new Set(members.map(m=>m.ki))];let html='';per.forEach(p=>{html+=`<details><summary>${p}</summary><div class=\"member-list\">`;members.filter(m=>m.ki===p).forEach(m=>html+=`<div class=\"member-item\"><img src=\"${m.image}\" width=\"50\"><span>${m.name_ja}</span></div>`);html+='</div></details>';});html+=`<div class=\"popup-footer\"><button id=\"popupSelectBtn\">選択</button><button id=\"popupCloseBtn\">閉じる</button></div>`;popup.innerHTML=html;popup.style.display='block';popup.querySelectorAll('.member-item').forEach(it=>it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));it.classList.add('selected');});document.getElementById('popupSelectBtn').onclick=()=>{const s=popup.querySelector('.member-item.selected span');if(s){grid[currentIndex]=s.textContent;popup.style.display='none';updateAndRender();}};document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';}
