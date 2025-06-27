// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – script.js FINAL 2025-06-27
// ------------------------------------------------------------
class PenlightGenerator {
  constructor () {
    /* -- Canvas 基準 -- */
    this.canvas = document.getElementById('renderCanvas');
    this.ctx    = this.canvas.getContext('2d');

    /* -- 資料與狀態 -- */
    this.members = [];
    this.preloadedImages = {};        // 預覽圖
    this.grid   = [];                 // 成員姓名 or null
    this.cellHeight = 0;
    this.currentIndex = null;

    this.state = {
      ninzu: '4x4',
      konmei: 'ただいま　恋愛中',
      kibetsu: '13期',
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

    /* -- 常數 (字級/色名) -- */
    this.settings = {
      公演名: { fs: 28 },
      全名 : { fs: 22 },
      ニックネーム: { fs: 18 },
      期別 : { fs: 16 }
    };
    this.colorMap = {
      '#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青',
      '#00FF00':'緑','#32CD32':'黄緑','#FFFFFF':'白',
      '#FF69B4':'濃ピンク','#FF1493':'濃ピンク','#FFB6C1':'薄ピンク',
      '#00CED1':'水','#800080':'紫'
    };
  }

  /* ---------- 初期化 ---------- */
  async init () {
    const res = await fetch('members.json');
    this.members = await res.json();
    await Promise.all(this.members.map(m=>this.preload(m.name_ja,m.image)));
    this.bindEvents();
    this.updateAndRender();
  }
  preload (key, src) {
    return new Promise(r=>{
      const img=new Image();
      img.src=src;
      img.onload =()=>{this.preloadedImages[key]=img; r();};
      img.onerror=()=>{this.preloadedImages[key]=null; r();};
    });
  }

  /* ---------- 事件 ---------- */
  bindEvents () {
    document.querySelectorAll('#controls input, #controls select')
      .forEach(el=>el.addEventListener('change',()=>this.updateAndRender()));

    const cb=id=>document.getElementById(id);
    cb('showColorBlock').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorText').checked=false;
      this.updateAndRender();
    });
    cb('showColorText').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorBlock').checked=false;
      this.updateAndRender();
    });
    cb('showKibetsu').addEventListener('change',()=>{
      cb('showAll').checked=false; this.updateAndRender();
    });

    this.canvas.addEventListener('click',e=>this.handleClick(e));
    cb('downloadButton').addEventListener('click',()=>this.exportPNG());
  }

  /* ---------- 狀態同步 ---------- */
  updateState () {
    const $=id=>document.getElementById(id);
    Object.assign(this.state,{
      ninzu: $('ninzuSelect').value,
      konmei:$('konmeiSelect').value,
      kibetsu:$('kibetsuSelect').value,
      showAll:$('showAll').checked, showKibetsu:$('showKibetsu').checked,
      showKonmei:$('showKonmei').checked, showPhoto:$('showPhoto').checked,
      showNickname:$('showNickname').checked, showKi:$('showKi').checked,
      showColorBlock:$('showColorBlock').checked,
      showColorText:$('showColorText').checked,
      customKonmei:$('customKonmei').value
    });
    $('customKonmei').style.display=
      this.state.konmei==='other'?'inline-block':'none';
  }

  /* ---------- 格子計算 ---------- */
  updateGrid () {
    const [cols,rowsSel]=this.state.ninzu.split('x').map(Number);
    let list=[];
    if(this.state.showAll){
      list=this.members.map(m=>m.name_ja);
    }else if(this.state.showKibetsu){
      list=this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);
    }else{
      if(!this.grid.length) this.grid=Array(cols*rowsSel).fill(null);
      this.resizeCanvas(cols,rowsSel); return;
    }
    const rows=Math.ceil(list.length/cols)||1;
    this.grid=Array(cols*rows).fill(null);
    list.forEach((n,i)=>this.grid[i]=n);
    this.resizeCanvas(cols,rows);
  }

  resizeCanvas (cols, rows) {
    const cw=this.canvas.width/cols;
    let ratio=0.5;
    if(this.state.showPhoto) ratio+=0.6;
    if(this.state.showNickname) ratio+=0.12;
    if(this.state.showKi) ratio+=0.12;
    if(this.state.showColorBlock||this.state.showColorText) ratio+=0.18;
    this.cellHeight=cw*ratio;
    const header=this.state.showKonmei?this.settings.公演名.fs+15:0;
    this.canvas.height=rows*this.cellHeight+header;
  }

  updateAndRender(){ this.updateState(); this.updateGrid(); this.render(); }

  /* ---------- 繪製 ---------- */
  render (tc=this.canvas, ctx=this.ctx, imgMap=this.preloadedImages) {
    const scale=tc.width/this.canvas.width;
    ctx.fillStyle='#fff4f6'; ctx.fillRect(0,0,tc.width,tc.height);

    if(this.state.showKonmei){
      const t=this.state.konmei==='other'?this.state.customKonmei:this.state.konmei;
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font=`${this.settings.公演名.fs*scale}px KozGoPr6N`;
      ctx.fillText(t,tc.width/2,0);
    }

    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=tc.width/cols, ch=this.cellHeight*scale;
    const y0=this.state.showKonmei?(this.settings.公演名.fs+15)*scale:0;

    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols), c=i%cols;
      const x=c*cw, y=r*ch+y0;
      ctx.fillStyle='#fff'; ctx.fillRect(x,y,cw,ch);
      ctx.strokeStyle='#F676A6'; ctx.lineWidth=2*scale;
      ctx.strokeRect(x,y,cw,ch);

      if(name==null){
        ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font=`${24*scale}px KozGoPr6N`;
        ctx.fillText('選択',x+cw/2,y+ch/2); return;
      }

      const m=this.members.find(t=>t.name_ja===name);
      let yPos=y+8*scale;

      if(this.state.showPhoto && imgMap[name]){
        const img=imgMap[name], asp=img.naturalWidth/img.naturalHeight;
        let ph=ch*0.55, pw=ph*asp;
        if(pw>cw*0.8){pw=cw*0.8; ph=pw/asp;}
        ctx.drawImage(img,x+(cw-pw)/2,yPos,pw,ph); yPos+=ph+5*scale;
      }

      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      const fsName=Math.max(ch*0.14,this.settings.全名.fs*scale);
      ctx.font=`${fsName}px KozGoPr6N`;
      ctx.fillText(m.name_ja,x+cw/2,yPos); yPos+=fsName+4*scale;

      if(this.state.showNickname){
        ctx.font=`${this.settings.ニックネーム.fs*scale}px KozGoPr6N`;
        ctx.fillText(m.nickname,x+cw/2,yPos); yPos+=this.settings.ニックネーム.fs*scale+3*scale;
      }
      if(this.state.showKi){
        ctx.font=`${this.settings.期別.fs*scale}px KozGoPr6N`;
        ctx.fillText(m.ki,x+cw/2,yPos); yPos+=this.settings.期別.fs*scale+3*scale;
      }

      if(this.state.showColorText){
        ctx.font=`18px KozGoPr6N`; ctx.textBaseline='middle';
        const txt=m.colors.map(c=>this.colorMap[c]||c).join(' × ');
        ctx.fillText(txt,x+cw/2,y+ch*0.86);
      }else if(this.state.showColorBlock){
        const bw=(cw*0.8)/m.colors.length, bh=bw*0.7;
        const start=x+(cw-bw*m.colors.length)/2;
        m.colors.forEach((c,j)=>{ctx.fillStyle=c; ctx.fillRect(start+j*bw,y+ch*0.82,bw,bh);});
      }
    });
  }

  /* ---------- 點擊 ---------- */
  handleClick(e){
    const r=this.canvas.getBoundingClientRect();
    let x=e.clientX-r.left, y=e.clientY-r.top;
    if(this.state.showKonmei) y-=(this.settings.公演名.fs+15);
    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=this.canvas.width/cols, ch=this.cellHeight;
    const col=Math.floor(x/cw), row=Math.floor(y/ch), idx=row*cols+col;
    if(idx<0||idx>=this.grid.length) return;

    if(this.grid[idx]!=null && x%cw>cw-40 && y%ch<40){
      this.grid[idx]=null; this.updateAndRender(); return;
    }
    if(this.grid[idx]==null) this.showPopup(idx);
  }

  /* ---------- 選人 Popup ---------- */
  showPopup(idx){
    this.currentIndex=idx;
    const pop=document.getElementById('popup'); pop.innerHTML='';
    const kiGrp=[...new Set(this.members.map(m=>m.ki))];
    kiGrp.forEach(g=>{
      const det=document.createElement('details');
      det.innerHTML=`<summary>${g}</summary>`;
      const list=document.createElement('div'); list.className='member-list';
      this.members.filter(m=>m.ki===g).forEach(m=>{
        const item=document.createElement('div'); item.className='member-item';
        item.innerHTML=`<img src=\"${m.image}\" width=\"48\"><span>${m.name_ja}</span>`;
        item.onclick=()=>{
          pop.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));
          item.classList.add('selected');
        };
        list.appendChild(item);
      });
      det.appendChild(list); pop.appendChild(det);
    });
    const ok=document.createElement('button'); ok.textContent='選択';
    ok.onclick=()=>{
      const sel=pop.querySelector('.member-item.selected span');
      if(sel){ this.grid[this.currentIndex]=sel.textContent; pop.style.display='none'; this.updateAndRender();}
    };
    const close=document.createElement('button'); close.textContent='閉じる';
    close.onclick=()=>pop.style.display='none';
    pop.appendChild(ok); pop.appendChild(close); pop.style.display='block';
  }

  /* ---------- PNG 匯出 ---------- */
  exportPNG(){
    this.updateAndRender(); // 確保同步

    const names=[...new Set(this.grid.filter(Boolean))];
    const tasks=names.map(n=>{
      const m=this.members.find(x=>x.name_ja===n); if(!m) return Promise.resolve();
      const img=new Image(); img.crossOrigin='anonymous';
      const {host,pathname}=new URL(m.image);
      img.src=`https://images.weserv.nl/?url=${encodeURIComponent(host+pathname)}`;
      return new Promise(r=>{
        img.onload=()=>{this.preloadedImages[`EXPORT_${n}`]=img; r();};
        img.onerror=()=>{this.preloadedImages[`EXPORT_${n}`]=null; r();};
      });
    });
    Promise.all(tasks).then(()=>{
      const scale=2,tmp=document.createElement('canvas');
      tmp.width=this.canvas.width*scale; tmp.height=this.canvas.height*scale;
      const p=tmp.getContext('2d'); p.scale(scale,scale);
      const map=new Proxy(this.preloadedImages,{get:(t,k)=>t[`EXPORT_${k}`]||t[k]});
      this.render(tmp,p,map);
      const a=document.createElement('a'); a.download='penlight_colors.png';
      a.href=tmp.toDataURL('image/png'); a.click();
    });
  }
}

/* ---------- 啟動 ---------- */
window.addEventListener('DOMContentLoaded',()=>new PenlightGenerator().init());
