// === script.js (最終統合版) ===
let members = [];
let preloadedImages = {};
let grid = [];
let currentIndex = null;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const baseCanvasWidth = canvas.width;
let baseAspect;

// 詳細設定オブジェクト (日本語キー)
const 設定 = {
  公演名:     { フォントサイズ:24, 文字間隔:0, X:10, Y:30 },
  全名:      { フォントサイズ:null, 文字間隔:0, X:0,  Y:0  },
  ネックネーム:{ フォントサイズ:20, 文字間隔:0, X:0,  Y:0  },
  期別:      { フォントサイズ:20, 文字間隔:0, X:0,  Y:0  },
  写真:      { X:0, Y:0, 幅:null, 高さ:null },
  色塊:      { X:0, Y:0, 幅:null },
  色文字1:    { フォントサイズ:18, X:0, Y:0 },
  色文字2:    { フォントサイズ:18, X:0, Y:0 },
};

// 画像プリロード
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

// 初期化
preloadAll().then(() => {
  injectSettingsPanel();
  makeResponsive();
  setupListeners();
  updateAndRender();
});

// レスポンシブ化 & 中央寄せ
function makeResponsive() {
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
}

// 詳細設定パネル注入 (ドラッガブル)
function injectSettingsPanel() {
  const panel = document.createElement('div');
  panel.id = '設定パネル';
  panel.style.position = 'fixed';
  panel.style.top = '100px'; panel.style.left = '50px';
  panel.style.background = '#fff';
  panel.style.border = '2px solid #F676A6';
  panel.style.padding = '8px';
  panel.style.zIndex = '1000';
  panel.style.cursor = 'move';
  panel.innerHTML = `<strong>詳細設定</strong><div id="詳細中身"></div>`;
  document.body.append(panel);
  makeDraggable(panel);
  const body = panel.querySelector('#詳細中身');
  Object.entries(設定).forEach(([key,cfg]) => {
    const group = document.createElement('div');
    group.style.margin = '6px 0';
    const title = document.createElement('div');
    title.textContent = key;
    title.style.fontWeight = 'bold';
    group.append(title);
    Object.entries(cfg).forEach(([prop,val]) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.textContent = `${prop}：`;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.value = val || 0;
      inp.style.width = '60px';
      inp.step = '1';
      inp.addEventListener('input', () => {
        設定[key][prop] = parseFloat(inp.value);
        updateAndRender();
      });
      label.append(inp);
      group.append(label);
    });
    body.append(group);
  });
}
function makeDraggable(el) {
  let ox, oy;
  el.addEventListener('mousedown', e => {
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;
    function move(e) {
      el.style.left = e.clientX - ox + 'px';
      el.style.top = e.clientY - oy + 'px';
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move), { once: true });
  });
}

// 更新→描画
function updateAndRender() {
  updateGrid();
  renderGrid();
}

// グリッド更新
function updateGrid() {
  const [cols, rows] = document.getElementById("ninzuSelect").value.split("x").map(Number);
  const 全員 = document.getElementById("showAll").checked;
  const 期別 = document.getElementById("showKibetsu").checked;
  const val = document.getElementById("kibetsuSelect").value;
  if (全員) {
    grid = Array(cols * Math.ceil(members.length/cols)).fill(null);
    members.forEach((m,i)=>grid[i]=m.name_ja);
  } else if (期別) {
    const f = members.filter(m=>m.ki===val).map(m=>m.name_ja);
    grid = Array(cols * Math.ceil(f.length/cols)).fill(null);
    f.forEach((n,i)=>grid[i] = n);
  } else {
    grid = Array(cols*rows).fill(null).map((_,i)=>grid[i]||null);
  }
  resizeCanvas(cols, grid.length);
}
function resizeCanvas(cols, total) {
  const rows = Math.ceil(total/cols);
  const cw = canvas.width/cols;
  const ch = cw*baseAspect;
  const hd = document.getElementById("showKonmei").checked?1:0; // header offset px
  canvas.height = rows*ch + hd;
}

// 描画
async function renderGrid(tc = canvas, tcx = ctx) {
  const isDL = tc !== canvas;
  const scale = tc.width / baseCanvasWidth;
  tcx.fillStyle='#fff4f6'; tcx.fillRect(0,0,tc.width,tc.height);

  // 公演名
  const showKon = document.getElementById("showKonmei").checked;
  const offY = showKon ? 設定.公演名.Y * scale : 0;
  if(showKon) {
    tcx.fillStyle='#F676A6';
    tcx.font = `${設定.公演名.フォントサイズ*scale}px KozGoPr6N`;
    tcx.textAlign='left'; tcx.textBaseline='top';
    const v = document.getElementById("konmeiSelect").value;
    const t = v==='other'?document.getElementById("customKonmei").value.trim():v;
    tcx.fillText(t, 設定.公演名.X*scale, offY + 設定.公演名.Y*scale);
  }

  const cols = +document.getElementById("ninzuSelect").value.split("x")[0];
  const cw = tc.width / cols;
  const ch = cw * baseAspect;
  const showPhoto = document.getElementById("showPhoto").checked;
  const showNick = document.getElementById("showNickname").checked;
  const showKiTxt = document.getElementById("showKi").checked;
  let showBlk = document.getElementById("showColorBlock").checked;
  let showTxt = document.getElementById("showColorText").checked;
  if(showBlk===showTxt){ showTxt=true; showBlk=false; document.getElementById("showColorText").checked=true; document.getElementById("showColorBlock").checked=false; }

  for(let i=0;i<grid.length;i++){
    const name = grid[i];
    const r = Math.floor(i/cols), c = i%cols;
    const x = c*cw, y = r*ch + offY;
    tcx.fillStyle='#fff4f6'; tcx.fillRect(x,y,cw,ch);
    tcx.strokeStyle='#F676A6'; tcx.strokeRect(x,y,cw,ch);
    if(!name){ if(!isDL){ tcx.fillStyle='#F676A6'; tcx.font=`${24*scale}px KozGoPr6N`; tcx.textAlign='center'; tcx.textBaseline='middle'; tcx.fillText('+',x+cw/2,y+ch/2);} continue; }
    const mem = members.find(m=>m.name_ja===name);
    let y0 = y + 設定.写真.Y*scale;
    if(showPhoto && preloadedImages[name]){
      const img = preloadedImages[name]; const asp=img.naturalWidth/img.naturalHeight;
      let h = 設定.写真.高さ||ch*0.25, w = h*asp;
      if(w>cw*0.8){ w=cw*0.8; h=w/asp; }
      tcx.drawImage(img, x + 設定.写真.X*scale, y0, 設定.写真.幅?設定.写真.幅: w, 設定.写真.高さ?設定.写真.高さ: h);
      y0 += h + 5*scale;
    }
    let used=0; if(showPhoto) used+=ch*0.3; if(showNick) used+=ch*0.1; if(showBlk||showTxt) used+=ch*0.15;
    const avail = ch - used - (showPhoto?5*scale:0);
    // 全名
    const L=name.length; let fs = 設定.全名.フォントサイズ||Math.min(avail*0.4,(cw-20)/(L*0.6));
    tcx.fillStyle='#F676A6'; tcx.textAlign='center'; tcx.textBaseline='top'; tcx.font=`${fs}px KozGoPr6N`;
    tcx.fillText(name, x+cw/2+設定.全名.X*scale, y0+設定.全名.Y*scale);
    y0 += fs + 3;
    // ネック
    if(showNick){ let s=設定.ネックネーム.フォントサイズ||Math.min(20,avail*0.15);
      tcx.font=`${s}px KozGoPr6N`;
      tcx.fillText(mem.nickname, x+cw/2+設定.ネックネーム.X*scale, y0+設定.ネックネーム.Y*scale);
      y0+=s+3;
    }
    // 期テキスト
    if(showKiTxt){ let s=設定.期別.フォントサイズ||Math.min(20,avail*0.15);
      tcx.font=`${s}px KozGoPr6N`;
      tcx.fillText(mem.ki, x+cw/2+設定.期別.X*scale, y0+設定.期別.Y*scale);
      y0+=s+3;
    }
    // 色文字
    if(showTxt){ const map={'#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青','#00FF00':'緑','#FFFFFF':'白','#FF69B4':'濃いピンク','#FFB6C1':'薄ピンク','#32CD32':'黄緑'};
      tcx.textBaseline='middle'; const arr=mem.colors, sep=' x ';
      let tot=0; arr.forEach((c,i)=>{ const t=map[c]||''; tot+=tcx.measureText(t).width+(i<arr.length-1?tcx.measureText(sep).width:0); });
      let xx = x+(cw-tot)/2+設定.色文字1.X*scale;
      arr.forEach((c,i)=>{
        const t=map[c]||'';
        tcx.fillStyle=(c==='#FFFFFF')?'#f5f2f2':c;
        tcx.font=`${設定['色文字'+(i+1)].フォントサイズ}px KozGoPr6N`;
        tcx.fillText(t, xx, y+ch*0.75+設定['色文字'+(i+1)].Y*scale);
        xx += tcx.measureText(t).width;
        if(i<arr.length-1){ tcx.fillStyle='#F676A6'; tcx.fillText(sep.trim(),xx,y+ch*0.75); xx+=tcx.measureText(sep.trim()).width; }
      }); }
    // 色塊
    else if(showBlk){ const arr=mem.colors; const bw=設定.色塊.幅?設定.色塊.幅:(cw*(0.5/arr.length)); const tw=bw*arr.length;
      arr.forEach((c,j)=>{tcx.fillStyle=c||'#f0f0f0'; tcx.fillRect(x+設定.色塊.X*scale+(cw-tw)/2+j*bw, y+ch*0.8+設定.色塊.Y*scale, bw, bw);}); }
    // 選択
    if(!isDL){ tcx.fillStyle='#F676A6'; tcx.font=`12px KozGoPr6N`; tcx.textAlign='right'; tcx.textBaseline='top'; tcx.fillText('選択', x+cw-10, y+10); }
  }
}

// イベントバインド
function setupListeners(){
  const cBlk=document.getElementById('showColorBlock'), cTxt=document.getElementById('showColorText');
  cBlk.addEventListener('change',e=>{if(e.target.checked){cTxt.checked=false;}else{e.target.checked=true;}updateAndRender();});
  cTxt.addEventListener('change',e=>{if(e.target.checked){cBlk.checked=false;}else{e.target.checked=true;}updateAndRender();});
  document.getElementById('showKibetsu').addEventListener('change',()=>{document.getElementById('showAll').checked=false;updateAndRender();});
  document.getElementById('kibetsuSelect').addEventListener('change',()=>{if(document.getElementById('showKibetsu').checked) updateAndRender();});
  document.querySelectorAll('#controls input:not(#showColorBlock):not(#showColorText):not(#showKibetsu), #controls select:not(#kibetsuSelect)')
    .forEach(el=>el.addEventListener('change',updateAndRender));
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const off=document.getElementById("showKonmei").checked?40:0;const mx=e.clientX-r.left,my=e.clientY-r.top-off;const cols=+document.getElementById("ninzuSelect").value.split("x")[0];const cw=canvas.width/cols,ch=cw*baseAspect;const col=Math.floor(mx/cw),row=Math.floor(my/ch),idx=row*cols+col;if(idx>=0&&idx<grid.length) showPopup(idx);});
  document.getElementById('downloadButton').addEventListener('click',async()=>{await preloadAll();const tmp=document.createElement('canvas');tmp.width=canvas.width*2;tmp.height=canvas.height*2;const p=tmp.getContext('2d');p.fillStyle='#fff4f6';p.fillRect(0,0,tmp.width,tmp.height);await renderGrid(tmp,p);const a=document.createElement('a');a.download='penlight_colors_300dpi.png';a.href=tmp.toDataURL();a.click();});
}

// ポップアップ
function showPopup(idx){currentIndex=idx;const popup=document.getElementById('popup');const per=[...new Set(members.map(m=>m.ki))];let html='';per.forEach(p=>{html+=`<details><summary>${p}</summary><div class=\"member-list\">`;members.filter(m=>m.ki===p).forEach(m=>html+=`<div class=\"member-item\"><img src=\"${m.image}\" width=\"50\"><span>${m.name_ja}</span></div>`);html+='</div></details>';});html+=`<div class=\"popup-footer\"><button id=\"popupSelectBtn\">選択</button><button id=\"popupCloseBtn\">閉じる</button></div>`;popup.innerHTML=html;popup.style.display='block';popup.querySelectorAll('.member-item').forEach(it=>it.onclick=()=>{popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));it.classList.add('selected');});document.getElementById('popupSelectBtn').onclick=()=>{const s=popup.querySelector('.member-item.selected span');if(s){grid[currentIndex]=s.textContent;popup.style.display='none';updateAndRender();}};document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';}
