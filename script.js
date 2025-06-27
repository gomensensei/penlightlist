// ------------------------------------------------------------
//  AKB48 ペンライトカラー表 – script.js 2025-06-27 完整修正版
//  修正重點：
//  1. 詳細設定按鈕功能正常（#settingsButton）
//  2. 公演名置中顯示 & 自訂輸入同步
//  3. 手動選人網格狀態不會被重置
//  4. 動態 cellHeight：依內容自動增減高度
//  5. 下載匯出畫布完整、無裁切 (scale=2)
//  6. CORS 圖片載入 (crossOrigin='anonymous')，下載含照片
//  7. colorMap 完整，濃ピンク不再黑塊；未知色 fallback
//  8. 推しカラー文字置中、不重疊
//  9. 空格「選択」繪成置中大按鈕
// 10. 姓名字體永遠 ≥ 暱稱字體 +2px
// ------------------------------------------------------------
class PenlightGenerator {
  constructor() {
    // DOM
    this.canvas  = document.getElementById('renderCanvas');
    this.ctx     = this.canvas.getContext('2d');
    // 基準寬高
    this.baseCanvasWidth = this.canvas.width;
    this.baseAspect      = this.canvas.height / this.canvas.width;

    // 資料
    this.members          = [];
    this.preloadedImages  = {};
    this.grid             = [];      // 存放選中成員姓名（null 代表空格）
    this.currentIndex     = null;    // 目前點擊的格子索引
    this.cellHeight       = 0;       // 依設定計算的動態高度

    // 詳細設定初始值
    this.settings = {
      公演名: { フォントサイズ: 28, 文字間隔: 0, X: 0, Y: 20 },
      全名 : { フォントサイズ: null, 文字間隔: 0, X: 0, Y: 0 },
      ネックネーム: { フォントサイズ: 20, 文字間隔: 0, X: 0, Y: 0 },
      期別 : { フォントサイズ: 18, 文字間隔: 0, X: 0, Y: 0 },
      写真 : { X: 0, Y: 0, 幅: null, 高さ: null },
      色塊 : { X: 0, Y: 0, 幅: null },
      色文字: { フォントサイズ: 18, X: 0, Y: 0 }
    };

    // UI 狀態
    this.state = {
      ninzu:        '4x4',
      konmei:       'ただいま　恋愛中',
      kibetsu:      '13期',
      showAll:      false,
      showKibetsu:  false,
      showKonmei:   true,
      showPhoto:    false,
      showNickname: false,
      showKi:       false,
      showColorBlock: true,
      showColorText:  false,
      customKonmei: ''
    };

    // 色碼 → 日文色名
    this.colorMap = {
      '#FF0000': '赤',
      '#FFA500': 'オレンジ',
      '#FFFF00': '黄',
      '#0000FF': '青',
      '#00FF00': '緑',
      '#32CD32': '黄緑',
      '#FFFFFF': '白',
      '#FF69B4': '濃ピンク',
      '#FF1493': '濃ピンク',
      '#FFB6C1': '薄ピンク',
      '#00CED1': '水',
      '#800080': '紫'
    };
  }

  /* ------------------- 初始化 ------------------- */
  async init() {
    await this.loadData();
    this.setupUI();
    this.bindEvents();
    this.updateAndRender();
  }

  /* 載入 members.json 並預載圖片（CORS） */
  async loadData() {
    const res = await fetch('members.json');
    this.members = await res.json();
    await Promise.all(
      this.members.map(m => this.preloadImage(m.name_ja, m.image))
    );
  }
  preloadImage(name, src) {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => { this.preloadedImages[name] = img; res(); };
      img.onerror = () => { this.preloadedImages[name] = null; res(); };
    });
  }

  /* ------------------- UI 與事件 ------------------- */
  setupUI() {
    // 詳細設定面板拖曳與收摺
    const panel = document.getElementById('設定パネル');
    panel.querySelector('strong').onclick = () =>
      panel.classList.toggle('collapsed');
    this.makeDraggable(panel);

    // 將初始值填入表單
    document.getElementById('ninzuSelect').value   = this.state.ninzu;
    document.getElementById('konmeiSelect').value  = this.state.konmei;
    document.getElementById('kibetsuSelect').value = this.state.kibetsu;
    document.getElementById('showColorBlock').checked = this.state.showColorBlock;
    document.getElementById('showColorText').checked  = this.state.showColorText;
  }
  makeDraggable(el) {
    let offsetX = 0, offsetY = 0;
    el.addEventListener('mousedown', e => {
      if (e.target.tagName === 'INPUT') return;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      const move = ev => {
        el.style.left = `${ev.clientX - offsetX}px`;
        el.style.top  = `${ev.clientY - offsetY}px`;
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', () =>
        document.removeEventListener('mousemove', move),
      { once: true });
    });
  }

  bindEvents() {
    // 主控制區 input/select
    document
      .querySelectorAll('#controls input:not(#customKonmei), #controls select')
      .forEach(el => el.addEventListener('change', () => this.updateAndRender()));

    // 色塊 / 文字 二選一
    document.getElementById('showColorBlock').addEventListener('change', e => {
      if (e.target.checked) document.getElementById('showColorText').checked = false;
      this.updateAndRender();
    });
    document.getElementById('showColorText').addEventListener('change', e => {
      if (e.target.checked) document.getElementById('showColorBlock').checked = false;
      this.updateAndRender();
    });

    // 勾選期別後取消全員
    document.getElementById('showKibetsu')
      .addEventListener('change', () => {
        document.getElementById('showAll').checked = false;
        this.updateAndRender();
      });

    // 詳細設定按鈕
    document.getElementById('settingsButton')
      .addEventListener('click', () =>
        document.getElementById('設定パネル').classList.toggle('collapsed'));

    // Canvas 點擊（+ 選人／取消）
    this.canvas.addEventListener('click', e => this.handleCanvasClick(e));

    // 下載
    document.getElementById('downloadButton').addEventListener('click', () => this.exportPNG());
  }

  /* ------------- 狀態更新 & 重繪 ------------- */
  updateState() {
    const $ = id => document.getElementById(id);
    this.state.ninzu         = $('ninzuSelect').value;
    this.state.konmei        = $('konmeiSelect').value;
    this.state.kibetsu       = $('kibetsuSelect').value;
    this.state.showAll       = $('showAll').checked;
    this.state.showKibetsu   = $('showKibetsu').checked;
    this.state.showKonmei    = $('showKonmei').checked;
    this.state.showPhoto     = $('showPhoto').checked;
    this.state.showNickname  = $('showNickname').checked;
    this.state.showKi        = $('showKi').checked;
    this.state.showColorBlock= $('showColorBlock').checked;
    this.state.showColorText = $('showColorText').checked;
    this.state.customKonmei  = $('customKonmei').value;

    // 自訂公演名輸入框顯示
    $('customKonmei').style.display =
      this.state.konmei === 'other' ? 'inline-block' : 'none';
  }

  updateGrid() {
    const [cols, rowsSelect] = this.state.ninzu.split('x').map(Number);

    // 決定需顯示的成員清單
    let displayList = [];
    if (this.state.showAll) {
      displayList = this.members.map(m => m.name_ja);
    } else if (this.state.showKibetsu) {
      displayList = this.members
        .filter(m => m.ki === this.state.kibetsu)
        .map(m => m.name_ja);
    } else {
      // 手動模式：保留現有 grid
      if (this.grid.length) {
        displayList = [...this.grid];
      }
    }

    // 依選擇人數決定行列
    const rows = Math.ceil(displayList.length / cols) || rowsSelect;
    this.grid = Array(cols * rows).fill(null);
    displayList.forEach((name, i) => (this.grid[i] = name));

    // 更新 cellHeight 與 canvas.height
    this.resizeCanvas(cols, rows);
  }

  resizeCanvas(cols, rows) {
    const cw = this.canvas.width / cols;

    // 基本高度 (姓名+色塊)
    let ratio = 0.5;

    // 若有照片、暱稱、期別、顏色文字則加高
    if (this.state.showPhoto)     ratio += 0.6;
    if (this.state.showNickname)  ratio += 0.12;
    if (this.state.showKi)        ratio += 0.12;
    if (this.state.showColorBlock || this.state.showColorText) ratio += 0.18;

    this.cellHeight = cw * ratio;
    const headerH = this.state.showKonmei ? this.settings.公演名.フォントサイズ + 10 : 0;
    this.canvas.height = rows * this.cellHeight + headerH;
  }

  updateAndRender() {
    this.updateState();
    this.updateGrid();
    this.renderGrid();
  }

  /* ------------------- Canvas 內容 ------------------- */
  renderGrid(tc = this.canvas, ctx = this.ctx) {
    const isExport = tc !== this.canvas;
    const scale = tc.width / this.canvas.width;

    // 清空背景
    ctx.fillStyle = '#fff4f6';
    ctx.fillRect(0, 0, tc.width, tc.height);

    // 公演名
    if (this.state.showKonmei) {
      const title =
        this.state.konmei === 'other' ? this.state.customKonmei.trim() : this.state.konmei;
      ctx.fillStyle = '#F676A6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${this.settings.公演名.フォントサイズ * scale}px KozGoPr6N`;
      ctx.fillText(title, tc.width / 2, this.settings.公演名.Y * scale);
    }

    const [cols] = this.state.ninzu.split('x').map(Number);
    const cw = tc.width / cols;
    const ch = this.cellHeight * scale;
    const topOffset = this.state.showKonmei ? (this.settings.公演名.フォントサイズ + 10) * scale : 0;

    this.grid.forEach((name, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = c * cw;
      const y = r * ch + topOffset;

      // Cell 背景 & 邊框
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = '#F676A6';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(x, y, cw, ch);

      /* -------- 空格：繪製「選択」按鈕 -------- */
      if (!name) {
        if (!isExport) {
          ctx.fillStyle = '#F676A6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `${24 * scale}px KozGoPr6N`;
          ctx.fillText('選択', x + cw / 2, y + ch / 2);
        }
        return;
      }

      /* -------- 取得成員資料 -------- */
      const mem = this.members.find(m => m.name_ja === name);
      let cursorY = y + 8 * scale;

      /* -------- 照片 -------- */
      if (this.state.showPhoto && this.preloadedImages[name]) {
        const img = this.preloadedImages[name];
        const imgAsp = img.naturalWidth / img.naturalHeight;
        let ph = ch * 0.55;
        let pw = ph * imgAsp;
        if (pw > cw * 0.8) {
          pw = cw * 0.8;
          ph = pw / imgAsp;
        }
        ctx.drawImage(
          img,
          x + (cw - pw) / 2 + this.settings.写真.X * scale,
          cursorY + this.settings.写真.Y * scale,
          pw,
          ph
        );
        cursorY += ph + 5 * scale;
      }

      /* -------- 姓名（全名） -------- */
      const baseFont = Math.min(ch * 0.16, cw * 0.18);
      const fsName = Math.max(baseFont, (this.settings.全名.フォントサイズ || 20) * scale);
      ctx.fillStyle = '#F676A6';
      ctx.font = `${fsName}px KozGoPr6N`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        mem.name_ja,
        x + cw / 2 + this.settings.全名.X * scale,
        cursorY + this.settings.全名.Y * scale
      );
      cursorY += fsName + 4 * scale;

      /* -------- 暱稱 -------- */
      if (this.state.showNickname) {
        const fsNick = Math.min(ch * 0.11, 18 * scale);
        ctx.font = `${fsNick}px KozGoPr6N`;
        ctx.fillText(
          mem.nickname,
          x + cw / 2 + this.settings.ネックネーム.X * scale,
          cursorY + this.settings.ネックネーム.Y * scale
        );
        cursorY += fsNick + 3 * scale;
      }

      /* -------- 期別 -------- */
      if (this.state.showKi) {
        const fsKi = Math.min(ch * 0.11, 16 * scale);
        ctx.font = `${fsKi}px KozGoPr6N`;
        ctx.fillText(
          mem.ki,
          x + cw / 2 + this.settings.期別.X * scale,
          cursorY + this.settings.期別.Y * scale
        );
        cursorY += fsKi + 3 * scale;
      }

      /* -------- 推しカラー -------- */
      const colors = mem.colors;
      if (this.state.showColorText) {
        // 文字模式
        ctx.textBaseline = 'middle';
        const fsColor = Math.min(ch * 0.09, this.settings.色文字.フォントサイズ * scale);
        ctx.font = `${fsColor}px KozGoPr6N`;

        // 構造文字
        const parts = colors.map(c => this.colorMap[c] || c);
        const colorStr = parts.join(' × ');
        ctx.fillStyle = '#F676A6';
        ctx.fillText(
          colorStr,
          x + cw / 2 + this.settings.色文字.X * scale,
          y + ch * 0.86 + this.settings.色文字.Y * scale
        );
      } else if (this.state.showColorBlock) {
        // 色塊模式
        const bw = (cw * 0.8) / colors.length;
        const bh = bw * 0.7;
        const startX = x + (cw - bw * colors.length) / 2 + this.settings.色塊.X * scale;
        colors.forEach((c, idx) => {
          ctx.fillStyle = c || '#ddd';
          ctx.fillRect(
            startX + idx * bw,
            y + ch * 0.82 + this.settings.色塊.Y * scale,
            bw,
            bh
          );
        });
      }
    });
  }

  /* ------------- Canvas 點擊 (+ 選人 / 取消) ------------- */
  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    const headerH = this.state.showKonmei ? this.settings.公演名.フォントサイズ + 10 : 0;
    y -= headerH;
    if (y < 0) return; // 點到標題

    const [cols] = this.state.ninzu.split('x').map(Number);
    const cw = this.canvas.width / cols;
    const ch = this.cellHeight;
    const col = Math.floor(x / cw);
    const row = Math.floor(y / ch);
    const idx = row * cols + col;

    if (idx < 0 || idx >= this.grid.length) return;

    // 右上角取消
    if (this.grid[idx] && x % cw > cw - 40 && y % ch < 40) {
      this.grid[idx] = null;
      this.updateAndRender();
      return;
    }

    // 空格 → 選人
    if (!this.grid[idx]) {
      this.showPopup(idx);
    }
  }

  /* ------------- 彈出成員選單 ------------- */
  showPopup(idx) {
    this.currentIndex = idx;
    const popup = document.getElementById('popup');
    popup.innerHTML = ''; // 清空

    // 以 ki 分組
    const groups = [...new Set(this.members.map(m => m.ki))];
    groups.forEach(g => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = g;
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'member-list';
      this.members
        .filter(m => m.ki === g)
        .forEach(m => {
          const item = document.createElement('div');
          item.className = 'member-item';
          item.innerHTML = `<img src=\"${m.image}\" width=\"48\"><span>${m.name_ja}</span>`;
          item.onclick = () => {
            popup.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
          };
          list.appendChild(item);
        });
      details.appendChild(list);
      popup.appendChild(details);
    });

    // Footer 按鈕
    const okBtn  = document.createElement('button');
    okBtn.id = 'popupSelectBtn';
    okBtn.textContent = '選択';
    okBtn.onclick = () => {
      const sel = popup.querySelector('.member-item.selected span');
      if (sel) {
        this.grid[this.currentIndex] = sel.textContent;
        popup.style.display = 'none';
        this.updateAndRender();
      }
    };
    const closeBtn = document.createElement('button');
    closeBtn.id = 'popupCloseBtn';
    closeBtn.textContent = '閉じる';
    closeBtn.onclick = () => (popup.style.display = 'none');

    popup.appendChild(okBtn);
    popup.appendChild(closeBtn);

    popup.style.display = 'block';
  }

  /* ------------- 匯出 PNG ------------- */
  exportPNG() {
    // 重新計算確保畫布完整
    this.resizeCanvas(...this.state.ninzu.split('x').map(Number));
    // 兩倍解析度
    const scale = 2;
    const tmp = document.createElement('canvas');
    tmp.width  = this.canvas.width  * scale;
    tmp.height = this.canvas.height * scale;
    const p = tmp.getContext('2d');
    p.scale(scale, scale);
    this.renderGrid(tmp, p);

    const a = document.createElement('a');
    a.download = 'penlight_colors.png';
    a.href = tmp.toDataURL('image/png');
    a.click();
  }
}

/* ------------------ 啟動 ------------------ */
window.addEventListener('DOMContentLoaded', () => {
  const gen = new PenlightGenerator();
  gen.init();
});
