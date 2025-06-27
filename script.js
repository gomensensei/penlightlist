/* ------------------------------------------------------------
   AKB48 ペンライトカラー表 – script.js  2025-06-27 FINAL-4
   ------------------------------------------------------------ */
class PenlightGenerator {
  constructor () {
    /* Canvas */
    this.canvas = document.getElementById('renderCanvas');
    this.ctx    = this.canvas.getContext('2d');

    /* 資料 */
    this.members = [];
    this.preloadedImages = {};    // 預覽
    this.grid = [];               // 成員 or null
    this.cellHeight = 0;
    this.currentIndex = null;

    /* 狀態 */
    this.state = {
      ninzu : '4x4',
      konmei: 'ただいま　恋愛中',
      kibetsu:'13期',
      showAll:false, showKibetsu:false, showKonmei:true,
      showPhoto:false, showNickname:false, showKi:false,
      showColorBlock:true, showColorText:false,
      customKonmei:''
    };

    /* 常數 */
    this.FS = { title:28, name:22, nick:18, gen:16 };
    this.colorMap = {
      '#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青',
      '#00FF00':'緑','#32CD32':'黄緑','#FFFFFF':'白',
      '#FF69B4':'濃ピンク','#FF1493':'濃ピンク','#FFB6C1':'薄ピンク',
      '#00CED1':'水','#800080':'紫'
    };
  }

  /* ========== 初始化 ========== */
  async init () {
    this.members = await (await fetch('members.json')).json();
    await Promise.all(this.members.map(m=>this.preload(m.name_ja,m.image)));
    this.bindEvents();
    this.updateAndRender();
  }
  preload(k,src){return new Promise(r=>{
    const img=new Image(); img.src=src;
    img.onload=()=>{this.preloadedImages[k]=img;r();};
    img.onerror=()=>{this.preloadedImages[k]=null;r();};
  });}

  /* ========== 事件 ========== */
  bindEvents(){
    document.querySelectorAll('#controls input, #controls select')
      .forEach(el=>el.addEventListener('change',()=>this.updateAndRender()));
    const cb=id=>document.getElementById(id);
    cb('showColorBlock').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorText').checked=false; this.updateAndRender();});
    cb('showColorText').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorBlock').checked=false; this.updateAndRender();});
    cb('showKibetsu').addEventListener('change',()=>{cb('showAll').checked=false; this.updateAndRender();});
    this.canvas.addEventListener('click',e=>this.handleClick(e));
    cb('downloadButton').addEventListener('click',()=>this.exportPNG());
  }

  /* ========== 狀態與格子 ========== */
  sync(){
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

  updateGrid(){
    const [cols,rowsSel]=this.state.ninzu.split('x').map(Number);
    let list=[];
    if(this.state.showAll){
      list=this.members.map(m=>m.name_ja);
    }else if(this.state.showKibetsu){
      list=this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);
    }
    const rows=list.length?Math.ceil(list.length/cols):rowsSel;
    if(!list.length && this.grid.length===cols*rowsSel){
      /* 手動模式僅在行列改變時重建 */
    }else{
      this.grid = Array(cols*rows).fill(null);
      list.forEach((n,i)=>this.grid[i]=n);
    }
    this.resizeCanvas(cols,rows);
  }

  resizeCanvas(cols,rows){
    const cw=this.canvas.width/cols;
    let ratio=0.5;
    if(this.state.showPhoto) ratio+=0.6;
    if(this.state.showNickname) ratio+=0.12;
    if(this.state.showKi) ratio+=0.12;
    if(this.state.showColorBlock||this.state.showColorText) ratio+=0.18;
    this.cellHeight=cw*ratio;
    const header=this.state.showKonmei?this.FS.title+13:0; // 公演名下移 2px
    this.canvas.height=rows*this.cellHeight+header;
  }

  updateAndRender(){ this.sync(); this.updateGrid(); this.render(); }

  /* ========== 繪製 ========== */
  render(tc=this.canvas, ctx=this.ctx, imgMap=this.preloadedImages){
    ctx.clearRect(0,0,tc.width,tc.height);
    ctx.fillStyle='#fff4f6'; ctx.fillRect(0,0,tc.width,tc.height);

    /* 公演名 */
    if(this.state.showKonmei){
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font=`${this.FS.title}px KozGoPr6N`;
      const t=this.state.konmei==='other'?this.state.customKonmei:this.state.konmei;
      ctx.fillText(t,tc.width/2,2);  // 向下 2px
    }

    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=tc.width/cols, ch=this.cellHeight;
    const y0=this.state.showKonmei?(this.FS.title+13):0;

    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols), c=i%cols, x=c*cw, y=r*ch+y0;
      ctx.strokeStyle='#F676A6'; ctx.lineWidth=2; ctx.strokeRect(x,y,cw,ch);
      if(name==null){
        ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N'; ctx.fillText('選択',x+cw/2,y+ch/2); return;
      }
      const m=this.members.find(t=>t.name_ja===name); let yy=y+6;
      if(this.state.showPhoto&&imgMap[name]){
        const img=imgMap[name], asp=img.naturalWidth/img.naturalHeight;
        let ph=ch*0.55, pw=ph*asp; if(pw>cw*0.8){pw=cw*0.8;ph=pw/asp;}
        ctx.drawImage(img,x+(cw-pw)/2,yy,pw,ph); yy+=ph+4;
      }
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font=`${this.FS.name}px KozGoPr6N`; ctx.fillText(m.name_ja,x+cw/2,yy); yy+=this.FS.name+4;
      if(this.state.showNickname){ ctx.font=`${this.FS.nick}px KozGoPr6N`; ctx.fillText(m.nickname,x+cw/2,yy); yy+=this.FS.nick+2; }
      if(this.state.showKi){ ctx.font=`${this.FS.gen}px KozGoPr6N`; ctx.fillText(m.ki,x+cw/2,yy); }
      if(this.state.showColorText){
        ctx.font='18px KozGoPr6N'; ctx.textBaseline='middle';
        ctx.fillText(m.colors.map(c=>this.colorMap[c]||c).join(' × '),x+cw/2,y+ch*0.86);
      }else if(this.state.showColorBlock){
        const bw=(cw*0.8)/m.colors.length, bh=bw*0.7, sx=x+(cw-bw*m.colors.length)/2;
        m.colors.forEach((c,j)=>{ctx.fillStyle=c; ctx.fillRect(sx+j*bw,y+ch*0.82,bw,bh);});
      }
    });
  }

  /* ========== 點擊選人 ========== */
  handleClick(e){
    const r=this.canvas.getBoundingClientRect();
    let x=e.clientX-r.left,y=e.clientY-r.top;
    if(this.state.showKonmei) y-=(this.FS.title+13);
    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=this.canvas.width/cols,ch=this.cellHeight;
    const col=Math.floor(x/cw),row=Math.floor(y/ch),idx=row*cols+col;
    if(idx<0||idx>=this.grid.length) return;
    if(this.grid[idx]!=null && x%cw>cw-40&& y%ch<40){ this.grid[idx]=null; this.render(); return; }
    if(this.grid[idx]==null) this.showPopup(idx);
  }

  /* ========== Popup ========== */
  showPopup(idx){
    this.currentIndex=idx;
    const pop=document.getElementById('popup'); pop.innerHTML='';
    [...new Set(this.members.map(m=>m.ki))].forEach(ki=>{
      const det=document.createElement('details');
      det.innerHTML=`<summary>${ki}</summary>`;
      const wrap=document.createElement('div'); wrap.className='member-list';
      this.members.filter(m=>m.ki===ki).forEach(mem=>{
        const it=document.createElement('div'); it.className='member-item';
        it.innerHTML=`<img src="${mem.image}" width="48"><span>${mem.name_ja}</span>`;
        it.onclick=()=>{pop.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));it.classList.add('selected');};
        wrap.appendChild(it);
      });
      det.appendChild(wrap); pop.appendChild(det);
    });
    const ok=document.createElement('button'); ok.textContent='選択';
    ok.onclick=()=>{
      const sel=pop.querySelector('.member-item.selected span');
      if(sel){ this.grid[this.currentIndex]=sel.textContent; pop.style.display='none'; this.render(); }
    };
    const close=document.createElement('button'); close.textContent='閉じる';
    close.onclick=()=>pop.style.display='none';
    pop.appendChild(ok); pop.appendChild(close); pop.style.display='block';
  }

  /* ========== 下載 PNG ========== */
  exportPNG(){
    this.updateAndRender();                                   // 先同步
    const names=[...new Set(this.grid.filter(Boolean))];
    const tasks=names.map(n=>{
      const m=this.members.find(x=>x.name_ja===n); if(!m) return Promise.resolve();
      const img=new Image(); img.crossOrigin='anonymous';
      const {host,pathname}=new URL(m.image);
      img.src=`https://images.weserv.nl/?url=${encodeURIComponent(host+pathname)}`;
      return new Promise(r=>{
        img.onload=()=>{this.preloadedImages[`EXPORT_${n}`]=img;r();};
        img.onerror=()=>{this.preloadedImages[`EXPORT_${n}`]=null;r();};
      });
    });
    Promise.all(tasks).then(()=>{
      const sc=2,tmp=document.createElement('canvas');
      tmp.width=this.canvas.width*sc; tmp.height=this.canvas.height*sc;
      const p=tmp.getContext('2d'); p.scale(sc,sc);
      const map=new Proxy(this.preloadedImages,{get:(t,k)=>t[`EXPORT_${k}`]||t[k]});
      this.render(tmp,p,map);
      const a=document.createElement('a'); a.download='penlight_colors.png';
      a.href=tmp.toDataURL('image/png'); a.click();
    });
  }
}

/* 啟動 */
window.addEventListener('DOMContentLoaded',()=>new PenlightGenerator().init());
