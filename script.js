// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – 完整整合版 script.js
//  包含：自訂公演名、grid 狀態保留、動態 cellHeight、push CORS
// ------------------------------------------------------------
class PenlightGenerator {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.baseCanvasWidth = this.canvas.width;
    this.baseAspect = this.canvas.height / this.canvas.width;
    this.members = [];
    this.preloadedImages = {};
    this.grid = [];
    this.currentIndex = null;

    // initial settings
    this.settings = {
      公演名: { フォントサイズ: 24, X: 0, Y: 20 },
      全名:     { フォントサイズ: 20, X: 0, Y: 0 },
      ネックネーム: { フォントサイズ: 16, X: 0, Y: 0 },
      期:      { フォントサイズ: 16, X: 0, Y: 0 },
      写真:    { scale: 0.6, X: 0, Y: 0 },
      色塊:    { X: 0, Y: 0 },
      色文字:  { フォントサイズ: 18, X: 0, Y: 0 }
    };
    this.state = {
      ninzu: '2x1',
      konmei: 'ただいま恋愛中',
      kibetsu: '',
      showAll: false,
      showKibetsu: false,
      showKonmei: true,
      showPhoto: false,
      showNickname: false,
      showKi: false,
      showColorBlock: true,
      showColorText: false,
      customKonmei: ''
    };
  }

  async init() {
    await this.loadData();
    this.setupUI();
    this.bindEvents();
    this.updateAndRender();
  }

  async loadData() {
    const res = await fetch('members.json');
    this.members = await res.json();
    const loadImgs = this.members.map(m => this.preloadImage(m.name_ja, m.image));
    await Promise.all(loadImgs);
  }

  preloadImage(name, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => { this.preloadedImages[name] = img; resolve(); };
      img.onerror = () => { this.preloadedImages[name] = null; resolve(); };
    });
  }

  setupUI() {
    document.getElementById('konmeiSelect').value = this.state.konmei;
    document.getElementById('customKonmei').hidden = this.state.konmei!=='other';
    // other initial UI sync
  }

  bindEvents() {
    // basic selects and checkboxes
    const controls = document.querySelectorAll('#controls input, #controls select');
    controls.forEach(el => el.addEventListener('change', () => this.updateAndRender()));
    // settings toggle
    document.getElementById('settingsButton').addEventListener('click', ()=>{
      document.getElementById('設定パネル').classList.toggle('collapsed');
    });
    // download
    document.getElementById('downloadButton').addEventListener('click', ()=> this.downloadImage());
    // canvas click for plus/select
    this.canvas.addEventListener('click', e => this.handleCanvasClick(e));
  }

  updateState() {
    this.state.ninzu = document.getElementById('ninzuSelect').value;
    this.state.konmei = document.getElementById('konmeiSelect').value;
    this.state.kibetsu = document.getElementById('kibetsuSelect').value;
    this.state.showAll = document.getElementById('showAll').checked;
    this.state.showKibetsu = document.getElementById('showKibetsu').checked;
    this.state.showKonmei = document.getElementById('showKonmei').checked;
    this.state.showPhoto = document.getElementById('showPhoto').checked;
    this.state.showNickname = document.getElementById('showNickname').checked;
    this.state.showKi = document.getElementById('showKi').checked;
    this.state.showColorBlock = document.getElementById('showColorBlock').checked;
    this.state.showColorText = document.getElementById('showColorText').checked;
    this.state.customKonmei = document.getElementById('customKonmei').value;
    document.getElementById('customKonmei').hidden = this.state.konmei!=='other';
  }

  updateGrid() {
    const [cols, rows] = this.state.ninzu.split('x').map(Number);
    // preserve manual selections unless showAll or showKibetsu
    if(this.state.showAll) {
      const list = this.members.map(m=>m.name_ja);
      this.grid = Array(cols * Math.ceil(list.length/cols)).fill(null);
      list.forEach((n,i)=>this.grid[i]=n);
    } else if(this.state.showKibetsu) {
      const filtered = this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);
      this.grid = Array(cols * Math.ceil(filtered.length/cols)).fill(null);
      filtered.forEach((n,i)=>this.grid[i]=n);
    } else {
      if(this.grid.length!==cols*rows) this.grid=Array(cols*rows).fill(null);
    }
    this.resizeCanvas();
  }

  resizeCanvas() {
    const [cols] = this.state.ninzu.split('x').map(Number);
    const cw = this.canvas.width/cols;
    let ratio = this.baseAspect;
    if(this.state.showPhoto) ratio+=this.settings.写真.scale;
    if(this.state.showNickname) ratio+=0.1;
    if(this.state.showKi) ratio+=0.1;
    if(this.state.showColorBlock||this.state.showColorText) ratio+=0.15;
    this.cellHeight = cw*ratio;
    const rows = Math.ceil(this.grid.length/cols);
    const headerH = this.state.showKonmei? this.settings.公演名.フォントサイズ:0;
    this.canvas.height = rows*this.cellHeight + headerH;
  }

  renderGrid(tc=this.canvas, tcx=this.ctx) {
    tcx.clearRect(0,0,tc.width,tc.height);
    // background
    tcx.fillStyle='#fff4f6'; tcx.fillRect(0,0,tc.width,tc.height);
    // title
    if(this.state.showKonmei) {
      tcx.fillStyle='#F676A6'; tcx.font=`${this.settings.公演名.フォントサイズ}px KozGoPr6N`;
      tcx.textAlign='center'; tcx.textBaseline='top';
      const t=this.state.konmei==='other'?this.state.customKonmei:this.state.konmei;
      tcx.fillText(t,tc.width/2, this.settings.公演名.Y);
    }
    const cols=+this.state.ninzu.split('x')[0];
    const cw=tc.width/cols, ch=this.cellHeight;
    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols), c=i%cols;
      const x=c*cw, y=r*ch+(this.state.showKonmei?this.settings.公演名.フォントサイズ:0);
      tcx.strokeStyle='#F676A6'; tcx.strokeRect(x,y,cw,ch);
      if(!name) { tcx.fillStyle='#F676A6'; tcx.font='24px KozGoPr6N'; tcx.textAlign='center';
        tcx.textBaseline='middle'; tcx.fillText('+',x+cw/2,y+ch/2); return;
      }
      const mem=this.members.find(m=>m.name_ja===name);
      let yy=y;
      // photo
      if(this.state.showPhoto && this.preloadedImages[name]){
        const img=this.preloadedImages[name], asp=img.naturalWidth/img.naturalHeight;
        let h=ch*this.settings.写真.scale, w=h*asp;
        if(w>cw*0.8){w=cw*0.8; h=w/asp;}
        tcx.drawImage(img,x+(cw-w)/2,yy,w,h); yy+=h+5;
      }
      // name
      tcx.fillStyle='#F676A6'; tcx.textAlign='center'; tcx.textBaseline='top';
      tcx.font=`${this.settings.全名.フォントサイズ}px KozGoPr6N`;
      tcx.fillText(name,x+cw/2,yy); yy+=this.settings.全名.フォントサイズ+5;
      // nickname
      if(this.state.showNickname){ tcx.font=`${this.settings.ネックネーム.フォントサイズ}px KozGoPr6N`;
        tcx.fillText(mem.nickname,x+cw/2,yy); yy+=this.settings.ネックネーム.フォントサイズ+5;
      }
      // generation
      if(this.state.showKi){ tcx.font=`${this.settings.期.フォントサイズ}px KozGoPr6N`;
        tcx.fillText(mem.ki,x+cw/2,yy); yy+=this.settings.期.フォントサイズ+5;
      }
      // color text or block
      const colorMap={'#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青','#00FF00':'緑','#32CD32':'黄緑','#FFFFFF':'白','#FF69B4':'濃いピンク','#FF1493':'濃いピンク','#FFB6C1':'薄ピンク','#00CED1':'水','#800080':'紫'};
      if(this.state.showColorText){
        tcx.textBaseline='middle'; let texts=mem.colors.map(c=>colorMap[c]||'?');
        const full=texts.join(' x ');
        tcx.font=`${this.settings.色文字.フォントサイズ}px KozGoPr6N`;
        tcx.fillStyle='#333'; tcx.fillText(full,x+cw/2,y+ch*0.85);
      } else if(this.state.showColorBlock){
        const colsCount=mem.colors.length, bw=cw*0.8/colsCount;
        mem.colors.forEach((c,j)=>{
          tcx.fillStyle=c; tcx.fillRect(x+(cw-cw*0.8)/2+j*bw,y+ch*0.8,bw,bw);
        });
      }
    });
  }

  downloadImage(){
    this.updateGrid(); this.renderGrid();
    const scale=2;
    const tmp=document.createElement('canvas'); tmp.width=this.canvas.width*scale; tmp.height=this.canvas.height*scale;
    const p=tmp.getContext('2d'); p.scale(scale,scale);
    this.renderGrid(tmp,p);
    const a=document.createElement('a'); a.download='penlight_colors.png'; a.href=tmp.toDataURL('image/png'); a.click();
  }

  handleCanvasClick(e){
    const r=this.canvas.getBoundingClientRect(); const mx=e.clientX-r.left;
    const my=e.clientY-r.top-(this.state.showKonmei?this.settings.公演名.フォントサイズ:0);
    const cols=+this.state.ninzu.split('x')[0], cw=this.canvas.width/cols, ch=this.cellHeight;
    const col=Math.floor(mx/cw), row=Math.floor(my/ch), idx=row*cols+col;
    if(idx<0||idx>=this.grid.length) return;
    if(!this.grid[idx]) this.showPopup(idx);
    else if(mx>col*cw+cw-30&&my<row*ch+30){ this.grid[idx]=null; this.updateAndRender(); }
  }

  showPopup(idx){
    this.currentIndex=idx; const popup=document.getElementById('popup');
    const periods=[...new Set(this.members.map(m=>m.ki))];
    let html=''; periods.forEach(p=>{
      html+=`<details><summary>${p}</summary><div class="member-list">`;
      this.members.filter(m=>m.ki===p).forEach(m=>html+=`<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
      html+='</div></details>';
    });
    html+='<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>';
    popup.innerHTML=html; popup.style.display='block';
    popup.querySelectorAll('.member-item').forEach(it=>it.onclick=()=>{ popup.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected')); it.classList.add('selected'); });
    document.getElementById('popupSelectBtn').onclick=()=>{ const sel=popup.querySelector('.member-item.selected span'); if(sel){ this.grid[this.currentIndex]=sel.textContent; popup.style.display='none'; this.updateAndRender(); }};
    document.getElementById('popupCloseBtn').onclick=()=>popup.style.display='none';
  }
}

// 啟動
const generator=new PenlightGenerator(); generator.init();
