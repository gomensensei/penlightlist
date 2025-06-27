// ================= script.js FINAL =================
class PenlightGenerator {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.members = [];
    this.preloadedImages = {};
    this.grid = [];
    this.cellHeight = 0;
    this.state = {
      ninzu:'4x4', konmei:'ただいま　恋愛中', kibetsu:'13期',
      showAll:false, showKibetsu:false, showKonmei:true,
      showPhoto:false, showNickname:false, showKi:false,
      showColorBlock:true, showColorText:false, customKonmei:''
    };
    this.colorMap = { '#FF0000':'赤','#FFFF00':'黄','#0000FF':'青','#FF69B4':'濃ピンク',
                      '#FF1493':'濃ピンク','#FFB6C1':'薄ピンク','#FFFFFF':'白',
                      '#00CED1':'水','#800080':'紫','#FFA500':'オレンジ',
                      '#00FF00':'緑','#32CD32':'黄緑' };
  }
  /* ---------- 初期化 ---------- */
  async init(){
    this.members = await (await fetch('members.json')).json();
    await Promise.all(this.members.map(m=>this.preload(m.name_ja,m.image)));
    this.bind(); this.updateAndRender();
  }
  preload(k,src){return new Promise(r=>{
    const i=new Image(); i.src=src; i.onload=()=>{this.preloadedImages[k]=i;r();};
    i.onerror=()=>{this.preloadedImages[k]=null;r();};
  });}
  /* ---------- 事件 ---------- */
  bind(){
    document.querySelectorAll('#controls input, #controls select')
      .forEach(el=>el.addEventListener('change',()=>this.updateAndRender()));
    const cb=id=>document.getElementById(id);
    cb('showColorBlock').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorText').checked=false; this.updateAndRender();});
    cb('showColorText').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorBlock').checked=false; this.updateAndRender();});
    cb('showKibetsu').addEventListener('change',()=>{cb('showAll').checked=false;this.updateAndRender();});
    this.canvas.addEventListener('click',e=>this.click(e));
    cb('downloadButton').addEventListener('click',()=>this.exportPNG());
  }
  /* ---------- 狀態同步 ---------- */
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
  /* ---------- 格子計算 ---------- */
  updateGrid(){
    const [cols,rowsSel]=this.state.ninzu.split('x').map(Number);
    let list=[];
    if(this.state.showAll){
      list=this.members.map(m=>m.name_ja);
    }else if(this.state.showKibetsu){
      list=this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);
    }
    /* rows 決策：有 list 就用 list，沒有 list (手動) 就 rowsSel */
    const rows=list.length?Math.ceil(list.length/cols):rowsSel;
    this.grid = Array(cols*rows).fill(null);
    list.forEach((n,i)=>this.grid[i]=n);
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
    const header=this.state.showKonmei?28+15:0;
    this.canvas.height=rows*this.cellHeight+header;
  }
  updateAndRender(){this.sync(); this.updateGrid(); this.render();}
  /* ---------- 繪製 ---------- */
  render(){
    const ctx=this.ctx, w=this.canvas.width, h=this.canvas.height;
    ctx.clearRect(0,0,w,h); ctx.fillStyle='#fff4f6'; ctx.fillRect(0,0,w,h);
    if(this.state.showKonmei){
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font='28px KozGoPr6N';
      ctx.fillText(this.state.konmei==='other'?this.state.customKonmei:this.state.konmei,w/2,0);
    }
    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=w/cols, ch=this.cellHeight, offset=this.state.showKonmei?43:0;
    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols), c=i%cols, x=c*cw, y=r*ch+offset;
      ctx.strokeStyle='#F676A6'; ctx.lineWidth=2; ctx.strokeRect(x,y,cw,ch);
      if(name==null){
        ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N'; ctx.fillText('選択',x+cw/2,y+ch/2); return;
      }
      const m=this.members.find(t=>t.name_ja===name); let yy=y+6;
      if(this.state.showPhoto&&this.preloadedImages[name]){
        const img=this.preloadedImages[name], asp=img.naturalWidth/img.naturalHeight;
        let ph=ch*0.55, pw=ph*asp; if(pw>cw*0.8){pw=cw*0.8; ph=pw/asp;}
        ctx.drawImage(img,x+(cw-pw)/2,yy,pw,ph); yy+=ph+4;
      }
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font='20px KozGoPr6N'; ctx.fillText(m.name_ja,x+cw/2,yy); yy+=24;
      if(this.state.showNickname){ ctx.font='18px KozGoPr6N'; ctx.fillText(m.nickname,x+cw/2,yy); yy+=20; }
      if(this.state.showKi){ ctx.font='16px KozGoPr6N'; ctx.fillText(m.ki,x+cw/2,yy); }
      if(this.state.showColorText){
        ctx.font='18px KozGoPr6N'; ctx.textBaseline='middle';
        ctx.fillText(m.colors.map(c=>this.colorMap[c]||c).join(' × '),x+cw/2,y+ch*0.86);
      }else if(this.state.showColorBlock){
        const bw=(cw*0.8)/m.colors.length, bh=bw*0.7, sx=x+(cw-bw*m.colors.length)/2;
        m.colors.forEach((c,j)=>{ctx.fillStyle=c; ctx.fillRect(sx+j*bw,y+ch*0.82,bw,bh);});
      }
    });
  }
  /* ---------- 點擊 ---------- */
  click(e){
    const r=this.canvas.getBoundingClientRect();
    let x=e.clientX-r.left, y=e.clientY-r.top;
    if(this.state.showKonmei) y-=43;
    const [cols]=this.state.ninzu.split('x').map(Number);
    const cw=this.canvas.width/cols, ch=this.cellHeight;
    const col=Math.floor(x/cw), row=Math.floor(y/ch), idx=row*cols+col;
    if(idx<0||idx>=this.grid.length) return;
    if(this.grid[idx]!=null && x%cw>cw-40 && y%ch<40){ this.grid[idx]=null; this.updateAndRender(); return;}
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
