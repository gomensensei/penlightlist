/* ------------------------------------------------------------
   AKB48 ペンライトカラー表 – script.js 2025-06-27 FINAL-6b
   ------------------------------------------------------------ */

/* 去掉所有半形 / 全形空白與換行，用於統一姓名 */
const normalize = s => s.replace(/[ \t\r\n　]+/g, '');

/* 期別 → 人数 (cols × rows) 對映 */
const periodLayout = {
  '13期':'2x1','15期':'2x1','ドラフト2期':'2x1','ドラフト3期':'2x1',
  'チーム8':'3x3','17期':'3x3','16期':'4x2','18期':'4x2',
  '19期':'3x2','20期':'2x2'
};

console.log('⚡ script.js FINAL-6b loaded');

class PenlightGenerator {
  constructor(){
    this.canvas = document.getElementById('renderCanvas');
    this.ctx    = this.canvas.getContext('2d');

    this.members = [];                // members.json 資料
    this.preloadedImages = {};        // 以 normalize(name) 為鍵
    this.grid = [];                   // 畫布格子 (normalize(name) 或 null)
    this.cellHeight = 0;
    this.currentIndex = null;

    /* UI 狀態 */
    this.state = {
      ninzu:'4x4', konmei:'ただいま　恋愛中', kibetsu:'13期',
      showAll:false, showKibetsu:false, showKonmei:true,
      showPhoto:false, showNickname:false, showKi:false,
      showColorBlock:true, showColorText:false, customKonmei:''
    };

    /* 字體大小常數 */
    this.FS = { title:28, name:22, nick:18, gen:16 };

    /* 色碼 → 文字 */
    this.colorMap = {
      '#FF0000':'赤','#FFA500':'オレンジ','#FFFF00':'黄','#0000FF':'青',
      '#00FF00':'緑','#32CD32':'黄緑','#FFFFFF':'白',
      '#FF69B4':'濃ピンク','#FF1493':'濃ピンク','#FFB6C1':'薄ピンク',
      '#00CED1':'水','#800080':'紫'
    };
  }

  /* ---------- 初始化 ---------- */
  async init(){
    this.members = await (await fetch('members.json')).json();
    await Promise.all(this.members.map(m => this._preload(m.name_ja, m.image)));
    this._bind(); this.updateAndRender();
  }
  _preload(name, src){
    return new Promise(res=>{
      const img=new Image(); img.src=src;
      img.onload  = ()=>{ this.preloadedImages[normalize(name)]=img; res(); };
      img.onerror = ()=>{ this.preloadedImages[normalize(name)]=null; res(); };
    });
  }

  /* ---------- 綁定事件 ---------- */
  _bind(){
    /* 所有控制項變更 */
    document.querySelectorAll('#controls input, #controls select')
      .forEach(el=>el.addEventListener('change',()=>this.updateAndRender()));

    const cb=id=>document.getElementById(id);

    /* 色塊 / 文字 互斥 */
    cb('showColorBlock').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorText').checked=false;
      this.updateAndRender();
    });
    cb('showColorText').addEventListener('change',e=>{
      if(e.target.checked) cb('showColorBlock').checked=false;
      this.updateAndRender();
    });

    /* 期別下拉：自動切換人數 */
    cb('kibetsuSelect').addEventListener('change',()=>{
      const lay = periodLayout[ cb('kibetsuSelect').value ];
      if(lay) cb('ninzuSelect').value = lay;
      this.updateAndRender();
    });
    /* 勾期別取消全員 */
    cb('showKibetsu').addEventListener('change',()=>{
      cb('showAll').checked=false; this.updateAndRender();
    });

    /* Canvas 點擊 (+ / 清除) */
    this.canvas.addEventListener('click',e=>this._handleClick(e));

    /* 下載 */
    cb('downloadButton').addEventListener('click',()=>this.exportPNG());
  }

  /* ---------- 同步狀態 ---------- */
  _sync(){
    const $=id=>document.getElementById(id);
    Object.assign(this.state,{
      ninzu: $('ninzuSelect').value,
      konmei:$('konmeiSelect').value,
      kibetsu:$('kibetsuSelect').value,
      customKonmei:$('customKonmei').value,
      showAll:$('showAll').checked, showKibetsu:$('showKibetsu').checked,
      showKonmei:$('showKonmei').checked, showPhoto:$('showPhoto').checked,
      showNickname:$('showNickname').checked, showKi:$('showKi').checked,
      showColorBlock:$('showColorBlock').checked, showColorText:$('showColorText').checked
    });
    $('customKonmei').style.display=
      this.state.konmei==='other'?'inline-block':'none';
  }

  /* ---------- 更新格子 ---------- */
  _updateGrid(){
    const [cols, rowsSel] = this.state.ninzu.split('x').map(Number);

    /* 決定要顯示的成員清單 */
    let list=[];
    if(this.state.showAll) list=this.members.map(m=>m.name_ja);
    else if(this.state.showKibetsu)
      list=this.members.filter(m=>m.ki===this.state.kibetsu).map(m=>m.name_ja);

    const rows = list.length ? Math.ceil(list.length/cols) : rowsSel;
    const need = cols * rows;

    /* 若手動且行列未變 → 保留原 grid；否則重建 */
    if(!list.length && this.grid.length===need){
      // Do nothing
    }else{
      this.grid = Array(need).fill(null);
      list.forEach((n,i)=>this.grid[i]=normalize(n));
    }

    this._resizeCanvas(cols, rows);
  }

  _resizeCanvas(cols, rows){
    const cw=this.canvas.width/cols;
    let ratio = 0.5;
    if(this.state.showPhoto) ratio+=0.6;
    if(this.state.showNickname) ratio+=0.12;
    if(this.state.showKi) ratio+=0.12;
    if(this.state.showColorBlock || this.state.showColorText) ratio+=0.18;

    this.cellHeight = cw * ratio;
    const header = this.state.showKonmei ? this.FS.title + 13 : 0;
    this.canvas.height = rows * this.cellHeight + header;
  }

  updateAndRender(){ this._sync(); this._updateGrid(); this._render(); }

  /* ---------- 繪製 ---------- */
  _render(tc=this.canvas, ctx=this.ctx, imgMap=this.preloadedImages){
    ctx.clearRect(0,0,tc.width,tc.height);
    ctx.fillStyle='#fff4f6'; ctx.fillRect(0,0,tc.width,tc.height);

    /* 公演名 */
    if(this.state.showKonmei){
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font=`${this.FS.title}px KozGoPr6N`;
      const title=this.state.konmei==='other'
        ? this.state.customKonmei : this.state.konmei;
      ctx.fillText(title, tc.width/2, 2);
    }

    const [cols] = this.state.ninzu.split('x').map(Number);
    const cw = tc.width/cols, ch = this.cellHeight;
    const top = this.state.showKonmei ? (this.FS.title+13) : 0;

    this.grid.forEach((name,i)=>{
      const r=Math.floor(i/cols), c=i%cols;
      const x=c*cw, y=r*ch+top;

      ctx.strokeStyle='#F676A6'; ctx.lineWidth=2;
      ctx.strokeRect(x,y,cw,ch);

      if(name==null){
        ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N';
        ctx.fillText('選択', x+cw/2, y+ch/2);
        return;
      }

      const mem = this.members.find(m=>normalize(m.name_ja)===name);
      if(!mem){
        ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='24px KozGoPr6N';
        ctx.fillText('選択', x+cw/2, y+ch/2);
        return;
      }

      let cursorY = y + 6;

      /* 照片 */
      if(this.state.showPhoto && imgMap[name]){
        const img = imgMap[name];
        const asp = img.naturalWidth / img.naturalHeight;
        let ph = ch * 0.55, pw = ph * asp;
        if(pw > cw*0.8){ pw = cw*0.8; ph = pw / asp; }
        ctx.drawImage(img, x+(cw-pw)/2, cursorY, pw, ph);
        cursorY += ph + 4;
      }

      /* 姓名 + 其他文字 */
      ctx.fillStyle='#F676A6'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.font=`${this.FS.name}px KozGoPr6N`;
      ctx.fillText(mem.name_ja, x+cw/2, cursorY);
      cursorY += this.FS.name + 4;

      if(this.state.showNickname){
        ctx.font=`${this.FS.nick}px KozGoPr6N`;
        ctx.fillText(mem.nickname, x+cw/2, cursorY);
        cursorY += this.FS.nick + 2;
      }
      if(this.state.showKi){
        ctx.font=`${this.FS.gen}px KozGoPr6N`;
        ctx.fillText(mem.ki, x+cw/2, cursorY);
      }

      /* 推しカラー */
      if(this.state.showColorText){
        ctx.font='18px KozGoPr6N'; ctx.textBaseline='middle';
        ctx.fillText(mem.colors.map(c=>this.colorMap[c]||c).join(' × '),
          x+cw/2, y+ch*0.86);
      }else if(this.state.showColorBlock){
        const bw=(cw*0.8)/mem.colors.length, bh=bw*0.7;
        const sx=x+(cw-bw*mem.colors.length)/2;
        mem.colors.forEach((c,j)=>{
          ctx.fillStyle=c; ctx.fillRect(sx+j*bw, y+ch*0.82, bw, bh);
        });
      }
    });
  }

  /* ---------- Canvas 點擊 ---------- */
  _handleClick(e){
    const rect=this.canvas.getBoundingClientRect();
    let x=e.clientX-rect.left, y=e.clientY-rect.top;
    if(this.state.showKonmei) y -= (this.FS.title+13);

    const [cols] = this.state.ninzu.split('x').map(Number);
    const cw=this.canvas.width/cols, ch=this.cellHeight;
    const col=Math.floor(x/cw), row=Math.floor(y/ch), idx=row*cols+col;
    if(idx<0 || idx>=this.grid.length) return;

    /* 右上角刪除 */
    if(this.grid[idx]!=null && x%cw>cw-40 && y%ch<40){
      this.grid[idx]=null; this._render(); return;
    }
    if(this.grid[idx]==null) this._openPopup(idx);
  }

  /* ---------- Popup ---------- */
  _openPopup(idx){
    this.currentIndex=idx;
    const pop=document.getElementById('popup'); pop.innerHTML='';

    [...new Set(this.members.map(m=>m.ki))].forEach(ki=>{
      const det=document.createElement('details');
      det.innerHTML=`<summary>${ki}</summary>`;
      const list=document.createElement('div'); list.className='member-list';

      this.members.filter(m=>m.ki===ki).forEach(mem=>{
        const it=document.createElement('div'); it.className='member-item';
        it.dataset.name=mem.name_ja;
        it.innerHTML=`<img src="${mem.image}" width="48"><span>${mem.name_ja}</span>`;
        it.onclick=()=>{
          pop.querySelectorAll('.member-item').forEach(i=>i.classList.remove('selected'));
          it.classList.add('selected');
        };
        list.appendChild(it);
      });

      det.appendChild(list);
      pop.appendChild(det);
    });

    const ok=document.createElement('button'); ok.textContent='選択';
    ok.onclick=()=>{
      const sel=pop.querySelector('.member-item.selected');
      if(sel){
        this.grid[this.currentIndex]=normalize(sel.dataset.name);
        pop.style.display='none'; this._render();
      }
    };
    const close=document.createElement('button'); close.textContent='閉じる';
    close.onclick=()=>pop.style.display='none';
    pop.appendChild(ok); pop.appendChild(close);
    pop.style.display='block';
  }

  /* ---------- 匯出 PNG ---------- */
  exportPNG(){
    this.updateAndRender();  // 同步畫布

    const names=[...new Set(this.grid.filter(Boolean))];
    const tasks=names.map(n=>{
      const mem=this.members.find(m=>normalize(m.name_ja)===n);
      if(!mem) return Promise.resolve();
      const proxy=new Image(); proxy.crossOrigin='anonymous';
      const {host,pathname}=new URL(mem.image);
      proxy.src=`https://images.weserv.nl/?url=${encodeURIComponent(host+pathname)}`;
      return new Promise(r=>{
        proxy.onload =()=>{ this.preloadedImages[n]=proxy; r(); };
        proxy.onerror=()=>{ this.preloadedImages[n]=null;   r(); };
      });
    });

    Promise.all(tasks).then(()=>{
      /* 建立雙倍解析度畫布 */
      const scale=2, tmp=document.createElement('canvas');
      tmp.width=this.canvas.width*scale;
      tmp.height=this.canvas.height*scale;
      const p=tmp.getContext('2d'); p.scale(scale,scale);

      /* 直接使用 this.preloadedImages */
      this._render(tmp, p, this.preloadedImages);

      const link=document.createElement('a');
      link.download='penlight_colors.png';
      link.href=tmp.toDataURL('image/png');
      link.click();
    });
  }
}

/* ---------- 啟動 ---------- */
window.addEventListener('DOMContentLoaded',()=>new PenlightGenerator().init());
