/* ------------------------------------------------------------
   AKB48 ペンライトカラー表 – script.js 2025-06-27 FINAL-6
   ------------------------------------------------------------ */

/* 將字串所有半形／全形空白、換行去除，用於姓名比對 */
const normalize = s => s.replace(/[ \t\r\n　]+/g, '');

/* 期別 → 人数 (cols x rows) 對映表 */
const periodLayout = {
  '13期':'2x1','15期':'2x1','ドラフト2期':'2x1','ドラフト3期':'2x1',
  'チーム8':'3x3','17期':'3x3','16期':'4x2','18期':'4x2',
  '19期':'3x2','20期':'2x2'
};

console.log('⚡ script.js FINAL-6 loaded');

class PenlightGenerator {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    this.ctx    = this.canvas.getContext('2d');

    this.members = [];
    this.preloadedImages = {};
    this.grid = [];
    this.cellHeight = 0;
    this.currentIndex = null;

    this.state = {
      ninzu:'4x4', konmei:'ただいま　恋愛中', kibetsu:'13期',
      showAll:false, showKibetsu:false, showKonmei:true,
      showPhoto:false, showNickname:false, showKi:false,
      showColorBlock:true, showColorText:false, customKonmei:''
    };
    this.FS = { title:28, name:22, nick:18, gen:16 };
    this.colorMap = {
      '#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青',
      '#00FF00':'緑','#32CD32':'黄緑','#FFFFFF':'白',
      '#FF69B4':'濃ピンク','#FF1493':'濃ピンク','#FFB6C1':'薄ピンク',
      '#00CED1':'水','#800080':'紫'
    };
  }

  /* ---------- 初期化 ---------- */
  async init() {
    this.members = await (await fetch('members.json')).json();
    await Promise.all(this.members.map(m => this._preload(m.name_ja, m.image)));
    this._bind(); this.updateAndRender();
  }
  _preload(key, src) {
    return new Promise(r=>{
      const img = new Image(); img.src = src;
      img.onload  = () => { this.preloadedImages[key] = img;  r(); };
      img.onerror = () => { this.preloadedImages[key] = null; r(); };
    });
  }

  /* ---------- 事件 ---------- */
  _bind() {
    /* controls 變更 */
    document.querySelectorAll('#controls input, #controls select')
      .forEach(el=>el.addEventListener('change',()=>this.updateAndRender()));

    /* 色塊 / 文字互斥 */
    const cb=id=>document.getElementById(id);
    cb('showColorBlock').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorText').checked=false; this.updateAndRender();});
    cb('showColorText').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorBlock').checked=false; this.updateAndRender();});

    /* 勾期別取消全員，並根據 periodLayout 自動切换人数下拉 */
    cb('kibetsuSelect').addEventListener('change',()=>{
      const lay = periodLayout[cb('kibetsuSelect').value];
      if(lay) cb('ninzuSelect').value = lay;
      this.updateAndRender();
    });
    cb('showKibetsu').addEventListener('change',()=>{
      cb('showAll').checked=false; this.updateAndRender();
    });

    /* Canvas 點擊 */
    this.canvas.addEventListener('click',e=>this._click(e));

    /* 下載 */
    cb('downloadButton').addEventListener('click',()=>this.exportPNG());
  }

  /* ---------- 狀態 & 格子 ---------- */
  _sync() {
    const $=id=>document.getElementById(id);
    Object.assign(this.state,{
      ninzu: $('ninzuSelect').value, konmei:$('konmeiSelect').value,
      kibetsu:$('kibetsuSelect').value, customKonmei:$('customKonmei').value,
      showAll:$('showAll').checked, showKibetsu:$('showKibetsu').checked,
      showKonmei:$('showKonmei').checked, showPhoto:$('showPhoto').checked,
      showNickname:$('showNickname').checked, showKi:$('showKi').checked,
      showColorBlock:$('showColorBlock').checked, showColorText:$('showColorText').checked
    });
    $('customKonmei').style.display=this.state.konmei==='other'?'inline-block':'none';
  }

  _updateGrid() {
    const [cols, rowsSel] = this.state.ninzu.split('x').map(Number);
    let list=[];
    if(this.state.showAll) list=this.members.map(m=>m.name_ja);
    else if(this.state.showKibetsu)
      list=this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);

    const rows = list.length ? Math.ceil(list.length/cols) : rowsSel;
    const need = cols * rows;

    if(!list.length && this.grid.length===need){
      /* 手動模式並且行列未變 → 保留 grid */
    }else{
      /* 先填 null，再覆寫有成員的格 */
      this.grid = Array(need).fill(null);
      list.forEach((n,i)=>this.grid[i]=n);
    }
    this._resize(cols, rows);
  }

  _resize(cols, rows) {
    const cw=this.canvas.width/cols;
    let r=0.5;
    if(this.state.showPhoto) r+=0.6;
    if(this.state.showNickname) r+=0.12;
    if(this.state.showKi) r+=0.12;
    if(this.state.showColorBlock||this.state.showColorText) r+=0.18;
    this.cellHeight=cw*r;
    const header=this.state.showKonmei?this.FS.title+13:0;
    this.canvas.height=rows*this.cellHeight+header;
  }

  updateAndRender(){this._sync();this._updateGrid();this._render();}

  /* ---------- 繪製 ---------- */
  _render(tc=this.canvas, ctx=this.ctx, imgMap=this.preloadedImages){
    ctx.clearRect(0,0,tc.width,tc.height);
    ctx.fillStyle='#fff4f6';ctx.fillRect(0,0,tc.width,tc.height);

    if(this.state.showKonmei){
      ctx.fillStyle='#F676A6';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.font=`${this.FS.title}px KozGoPr6N`;
      const t=this.state.konmei==='other'?this.state.customKonmei:this.state.konmei;
      ctx.fillText(t,tc.width/2,2);
    }

    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=tc.width/cols,ch=this.cellHeight,y0=this.state.showKonmei?(this.FS.title+13):0;

    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols),c=i%cols,x=c*cw,y=r*ch+y0;
      ctx.strokeStyle='#F676A6';ctx.lineWidth=2;ctx.strokeRect(x,y,cw,ch);

      if(name==null){
        ctx.fillStyle='#F676A6';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N';ctx.fillText('選択',x+cw/2,y+ch/2);return;
      }
      const mem=this.members.find(m=>normalize(m.name_ja)===normalize(name));
      if(!mem){ctx.fillStyle='#F676A6';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N';ctx.fillText('選択',x+cw/2,y+ch/2);return;}

      let yy=y+6;
      if(this.state.showPhoto&&imgMap[name]){
        const img=imgMap[name],asp=img.naturalWidth/img.naturalHeight;
        let ph=ch*0.55,pw=ph*asp;if(pw>cw*0.8){pw=cw*0.8;ph=pw/asp;}
        ctx.drawImage(img,x+(cw-pw)/2,yy,pw,ph);yy+=ph+4;
      }
      ctx.fillStyle='#F676A6';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.font=`${this.FS.name}px KozGoPr6N`;ctx.fillText(mem.name_ja,x+cw/2,yy);yy+=this.FS.name+4;
      if(this.state.showNickname){ctx.font=`${this.FS.nick}px KozGoPr6N`;ctx.fillText(mem.nickname,x+cw/2,yy);yy+=this.FS.nick+2;}
      if(this.state.showKi){ctx.font=`${this.FS.gen}px KozGoPr6N`;ctx.fillText(mem.ki,x+cw/2,yy);}
      if(this.state.showColorText){
        ctx.font='18px KozGoPr6N';ctx.textBaseline='middle';
        ctx.fillText(mem.colors.map(c=>this.colorMap[c]||c).join(' × '),
          x+cw/2,y+ch*0.86);
      }else if(this.state.showColorBlock){
        const bw=(cw*0.8)/mem.colors.length,bh=bw*0.7,sx=x+(cw-bw*mem.colors.length)/2;
        mem.colors.forEach((c,j)=>{ctx.fillStyle=c;ctx.fillRect(sx+j*bw,y+ch*0.82,bw,bh);});
      }
    });
  }

  /* ---------- 點擊 ---------- */
  _click(e){
    const r=this.canvas.getBoundingClientRect();
    let x=e.clientX-r.left,y=e.clientY-r.top;
    if(this.state.showKonmei)y-=(this.FS.title+13);
    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=this.canvas.width/cols,ch=this.cellHeight;
    const col=Math.floor(x/cw),row=Math.floor(y/ch),idx=row*cols+col;
    if(idx<0||idx>=this.grid.length)return;
    if(this.grid[idx]!=null && x%cw>cw-40 && y%ch<40){this.grid[idx]=null;this._render();return;}
    if(this.grid[idx]==null)this._popup(idx);
  }

  /* ---------- Popup ---------- */
  _popup(idx){
    this.currentIndex=idx;
    const pop=document.getElementById('popup');pop.innerHTML='';
    [...new Set(this.members.map(m=>m.ki))].forEach(ki=>{
      const det=document.createElement('details');
      det.innerHTML=`<summary>${ki}</summary>`;
      const list=document.createElement('div');list.className='member-list';
      this.members.filter(m=>m.ki===ki).forEach(mem=>{
        const item=document.createElement('div');item.className='member-item';
        item.dataset.name=mem.name_ja;
        item.innerHTML=`<img src="${mem.image}" width="48"><span>${mem.name_ja}</span>`;
        item.onclick=()=>{pop.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));item.classList.add('selected');};
        list.appendChild(item);
      });
      det.appendChild(list);pop.appendChild(det);
    });
    const ok=document.createElement('button');ok.textContent='選択';
    ok.onclick=()=>{
      const sel=pop.querySelector('.member-item.selected');
      if(sel){this.grid[this.currentIndex]=normalize(sel.dataset.name);pop.style.display='none';this._render();}
    };
    const close=document.createElement('button');close.textContent='閉じる';
    close.onclick=()=>pop.style.display='none';
    pop.appendChild(ok);pop.appendChild(close);pop.style.display='block';
  }

  /* ---------- 匯出 PNG ---------- */
  exportPNG(){
    this.updateAndRender();
    const names=[...new Set(this.grid.filter(Boolean))];
    const tasks=names.map(n=>{
      const mem=this.members.find(m=>normalize(m.name_ja)===normalize(n));
      if(!mem)return Promise.resolve();
      const proxy=new Image();proxy.crossOrigin='anonymous';
      const {host,pathname}=new URL(mem.image);
      proxy.src=`https://images.weserv.nl/?url=${encodeURIComponent(host+pathname)}`;
      return new Promise(r=>{
        proxy.onload=()=>{this.preloadedImages[`EXPORT_${n}`]=proxy;r();};
        proxy.onerror=()=>{this.preloadedImages[`EXPORT_${n}`]=null;r();};
      });
    });
    Promise.all(tasks).then(()=>{
      const sc=2,tmp=document.createElement('canvas');
      tmp.width=this.canvas.width*sc;tmp.height=this.canvas.height*sc;
      const p=tmp.getContext('2d');p.scale(sc,sc);
      const map=new Proxy(this.preloadedImages,{get:(t,k)=>t[`EXPORT_${k}`]||t[k]});
      this._render(tmp,p,map);
      const a=document.createElement('a');a.download='penlight_colors.png';
      a.href=tmp.toDataURL('image/png');a.click();
    });
  }
}

/* ---------- 啟動 ---------- */
window.addEventListener('DOMContentLoaded',()=>new PenlightGenerator().init());
