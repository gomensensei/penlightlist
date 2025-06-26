class PenlightGenerator {
  constructor() {
    this.canvas = document.getElementById("renderCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.baseCanvasWidth = this.canvas.width;
    this.baseAspect = this.canvas.height / this.canvas.width;
    this.members = [];
    this.preloadedImages = {};
    this.grid = [];
    this.currentIndex = null;
    this.settings = {
      公演名: { フォントサイズ: 24, 文字間隔: 0, X: 10, Y: 10 },
      全名: { フォントサイズ: null, 文字間隔: 0, X: 0, Y: 0 },
      ネックネーム: { フォントサイズ: 16, 文字間隔: 0, X: 0, Y: 0 },
      期別: { フォントサイズ: 16, 文字間隔: 0, X: 0, Y: 0 },
      写真: { X: 0, Y: 0, 幅: null, 高さ: null },
      色塊: { X: 0, Y: 0, 幅: null },
      色文字1: { フォントサイズ: 14, X: 0, Y: 0 },
      色文字2: { フォントサイズ: 14, X: 0, Y: 0 },
    };
    this.state = {
      ninzu: "2x1",
      konmei: "ただいま　恋愛中",
      kibetsu: "13期",
      showAll: false,
      showKibetsu: false,
      showKonmei: false,
      showPhoto: false,
      showNickname: false,
      showKi: false,
      showColorBlock: true,
      showColorText: false,
      customKonmei: "",
    };
    this.colorMap = {
      '#FF0000': '赤', '#FFA500': 'オレンジ', '#FFFF00': '黄', '#0000FF': '青', '#00FF00': '緑',
      '#FFFFFF': '白', '#FF69B4': 'ピンク', '#FFB6C1': '薄ピンク', '#32CD32': '黄緑',
      '#00CED1': '水', '#800080': '紫', '#FF1493': '濃いピンク', '#FFD700': '金', '#C0C0C0': '銀'
    };
  }

  async init() {
    await this.loadData();
    this.setupUI();
    this.bindEvents();
    this.updateAndRender();
  }

  async loadData() {
    try {
      const res = await fetch("members.json");
      this.members = await res.json();
      await Promise.all(this.members.map(m => this.preloadImage(m.name_ja, m.image)));
    } catch (error) {
      console.error("データロードエラー:", error);
    }
  }

  preloadImage(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // 允許跨域加載圖片
      img.src = src;
      img.onload = () => { this.preloadedImages[name] = img; resolve(); };
      img.onerror = () => { this.preloadedImages[name] = null; console.warn(`画像ロード失敗: ${name}, ${src}`); resolve(); };
    });
  }

  setupUI() {
    this.makeResponsive();
    this.injectSettingsPanel();
    document.getElementById('ninzuSelect').value = this.state.ninzu;
    document.getElementById('konmeiSelect').value = this.state.konmei;
    document.getElementById('kibetsuSelect').value = this.state.kibetsu;
    document.getElementById('showColorBlock').checked = this.state.showColorBlock;
    document.getElementById('showColorText').checked = this.state.showColorText;
  }

  makeResponsive() {
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.width = '100%';
    this.canvas.style.height = 'auto';
  }

  injectSettingsPanel() {
    let panel = document.getElementById('設定パネル');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = '設定パネル';
      panel.style.cssText = 'position: fixed; top: 100px; left: 50px; background: #fff; border: 2px solid #F676A6; padding: 8px; z-index: 1000; cursor: move; display: none;';
      panel.innerHTML = `<strong>詳細設定</strong><div id="詳細中身"></div>`;
      document.body.appendChild(panel);
    } else {
      panel.innerHTML = `<strong>詳細設定</strong><div id="詳細中身"></div>`;
      panel.style.display = 'none';
    }
    const body = panel.querySelector('#詳細中身');
    body.innerHTML = '';
    Object.entries(this.settings).forEach(([key, cfg]) => {
      const group = document.createElement('div');
      group.style.margin = '6px 0';
      const title = document.createElement('div');
      title.textContent = key;
      title.style.fontWeight = 'bold';
      group.appendChild(title);
      Object.entries(cfg).forEach(([prop, val]) => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.textContent = `${prop}：`;
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = val || 0;
        inp.style.width = '60px';
        inp.step = '1';
        inp.addEventListener('input', () => {
          this.settings[key][prop] = parseFloat(inp.value) || 0;
          this.updateAndRender();
        });
        label.appendChild(inp);
        group.appendChild(label);
      });
      body.appendChild(group);
    });
    this.makeDraggable(panel);
  }

  makeDraggable(el) {
    let posX, posY;
    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'INPUT') {
        posX = e.clientX - el.offsetLeft;
        posY = e.clientY - el.offsetTop;
        const moveHandler = (moveEvent) => {
          el.style.left = (moveEvent.clientX - posX) + 'px';
          el.style.top = (moveEvent.clientY - posY) + 'px';
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', () => {
          document.removeEventListener('mousemove', moveHandler);
        }, { once: true });
      }
    });
  }

  updateGrid() {
    const [cols, rows] = this.state.ninzu.split("x").map(Number);
    const totalCells = cols * rows;
    if (this.grid.length !== totalCells) {
      const newGrid = Array(totalCells).fill(null);
      this.grid.forEach((val, i) => {
        if (i < totalCells) newGrid[i] = val;
      });
      this.grid = newGrid;
    }
    if (this.state.showAll) {
      this.grid = Array(cols * Math.ceil(this.members.length / cols)).fill(null);
      this.members.forEach((m, i) => this.grid[i] = m.name_ja);
    } else if (this.state.showKibetsu) {
      const filtered = this.members.filter(m => m.ki === this.state.kibetsu).map(m => m.name_ja);
      this.grid = Array(cols * Math.ceil(filtered.length / cols)).fill(null);
      filtered.forEach((n, i) => this.grid[i] = n);
    }
    this.resizeCanvas(cols, this.grid.length);
  }

  resizeCanvas(cols, total) {
    const rows = Math.ceil(total / cols);
    const cw = this.canvas.width / cols;
    let chBase = cw * this.baseAspect;
    let extraHeight = 0;
    if (this.state.showPhoto) extraHeight += chBase * 0.6;
    if (this.state.showNickname) extraHeight += chBase * 0.15;
    if (this.state.showKi) extraHeight += chBase * 0.15;
    if (this.state.showColorBlock || this.state.showColorText) extraHeight += chBase * 0.2;
    const ch = Math.max(chBase, extraHeight) * (this.state.showPhoto ? 1.5 : 1);
    const hd = this.state.showKonmei ? this.settings.公演名.フォントサイズ + 10 : 0;
    this.canvas.height = rows * ch + hd;
  }

  renderGrid(tc = this.canvas, tcx = this.ctx) {
    const isDL = tc !== this.canvas;
    const scale = tc.width / this.baseCanvasWidth;
    tcx.fillStyle = '#fff4f6';
    tcx.fillRect(0, 0, tc.width, tc.height);

    if (this.state.showKonmei) {
      tcx.fillStyle = '#F676A6';
      tcx.font = `${this.settings.公演名.フォントサイズ * scale}px KozGoPr6N`;
      tcx.textAlign = 'left';
      tcx.textBaseline = 'top';
      const t = this.state.konmei === 'other' ? this.state.customKonmei.trim() : this.state.konmei;
      tcx.fillText(t, this.settings.公演名.X * scale, this.settings.公演名.Y * scale);
    }

    const cols = +this.state.ninzu.split("x")[0];
    const cw = tc.width / cols;
    const ch = cw * this.baseAspect * (this.state.showPhoto ? 1.5 : 1);
    const colorMap = this.colorMap;

    this.grid.forEach((name, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const x = c * cw, y = r * ch + (this.state.showKonmei ? (this.settings.公演名.フォントサイズ + 10) * scale : 0);
      tcx.fillStyle = '#fff4f6';
      tcx.fillRect(x, y, cw, ch);
      tcx.strokeStyle = '#F676A6';
      tcx.strokeRect(x, y, cw, ch);

      if (!name) {
        if (!isDL) {
          tcx.fillStyle = '#F676A6';
          tcx.font = `${24 * scale}px KozGoPr6N`;
          tcx.textAlign = 'center';
          tcx.textBaseline = 'middle';
          tcx.fillText('+', x + cw / 2, y + ch / 2);
        }
        return;
      }

      const mem = this.members.find(m => m.name_ja === name);
      if (!mem) return;
      let y0 = y + 10 * scale;
      let usedHeight = 0;

      if (this.state.showPhoto && this.preloadedImages[name]) {
        const img = this.preloadedImages[name];
        const asp = img.naturalWidth / img.naturalHeight;
        let h = ch * 0.5;
        let w = h * asp;
        if (w > cw * 0.7) { w = cw * 0.7; h = w / asp; }
        const xOffset = (cw - w) / 2;
        tcx.drawImage(img, x + xOffset, y0, w, h);
        y0 += h + 10 * scale;
        usedHeight += h + 10 * scale;
      }

      const availHeight = ch - usedHeight;
      const L = name.length;
      let fs = this.settings.全名.フォントサイズ || Math.min(availHeight * 0.3, (cw - 20) / (L * 0.5), 20);
      tcx.fillStyle = '#F676A6';
      tcx.textAlign = 'center';
      tcx.textBaseline = 'top';
      tcx.font = `${fs * scale}px KozGoPr6N`;
      tcx.fillText(name, x + cw / 2 + this.settings.全名.X * scale, y0 + this.settings.全名.Y * scale);
      y0 += fs + 10 * scale;

      if (this.state.showNickname) {
        let s = this.settings.ネックネーム.フォントサイズ || Math.min(availHeight * 0.15, 16);
        tcx.font = `${s * scale}px KozGoPr6N`;
        tcx.fillText(mem.nickname, x + cw / 2 + this.settings.ネックネーム.X * scale, y0 + this.settings.ネックネーム.Y * scale);
        y0 += s + 5 * scale;
      }

      if (this.state.showKi) {
        let s = this.settings.期別.フォントサイズ || Math.min(availHeight * 0.15, 16);
        tcx.font = `${s * scale}px KozGoPr6N`;
        tcx.fillText(mem.ki, x + cw / 2 + this.settings.期別.X * scale, y0 + this.settings.期別.Y * scale);
        y0 += s + 5 * scale;
      }

      if (this.state.showColorText) {
        tcx.textBaseline = 'middle';
        const colors = mem.colors.split(' x ') || [];
        let totWidth = 0;
        colors.forEach((c, i) => {
          const text = colorMap[c] || c;
          tcx.font = `${this.settings['色文字' + (i + 1)].フォントサイズ * scale}px KozGoPr6N`;
          totWidth += tcx.measureText(text).width + (i < colors.length - 1 ? tcx.measureText(' x ').width + 10 : 0);
        });
        let xx = x + (cw - totWidth) / 2 + this.settings.色文字1.X * scale;
        colors.forEach((c, i) => {
          const text = colorMap[c] || c;
          tcx.fillStyle = c === '#FFFFFF' ? '#f5f2f2' : (colorMap[c] ? Object.keys(colorMap).find(key => colorMap[key] === c) : '#000000');
          tcx.font = `${this.settings['色文字' + (i + 1)].フォントサイズ * scale}px KozGoPr6N`;
          tcx.fillText(text, xx, y + ch * 0.9 + this.settings['色文字' + (i + 1)].Y * scale);
          xx += tcx.measureText(text).width;
          if (i < colors.length - 1) {
            tcx.fillStyle = '#F676A6';
            tcx.fillText(' x ', xx, y + ch * 0.9);
            xx += tcx.measureText(' x ').width + 10;
          }
        });
      } else if (this.state.showColorBlock) {
        const colors = mem.colors.split(' x ') || [];
        const bw = cw * (0.8 / Math.max(colors.length, 1));
        const tw = bw * colors.length;
        const xOffset = (cw - tw) / 2;
        colors.forEach((c, j) => {
          tcx.fillStyle = colorMap[c] ? Object.keys(colorMap).find(key => colorMap[key] === c) || '#f0f0f0' : '#000000';
          tcx.fillRect(x + xOffset + j * bw, y + ch * 0.8 + this.settings.色塊.Y * scale, bw, bw * 0.8);
        });
      }

      if (!isDL) {
        tcx.fillStyle = '#F676A6';
        tcx.font = `12px KozGoPr6N`;
        tcx.textAlign = 'right';
        tcx.textBaseline = 'top';
        tcx.fillText('選択', x + cw - 10, y + 10);
      }
    });
  }

  updateAndRender() {
    this.updateState();
    this.updateGrid();
    this.renderGrid();
  }

  updateState() {
    this.state.ninzu = document.getElementById("ninzuSelect").value;
    this.state.konmei = document.getElementById("konmeiSelect").value;
    this.state.kibetsu = document.getElementById("kibetsuSelect").value;
    this.state.showAll = document.getElementById("showAll").checked;
    this.state.showKibetsu = document.getElementById("showKibetsu").checked;
    this.state.showKonmei = document.getElementById("showKonmei").checked;
    this.state.showPhoto = document.getElementById("showPhoto").checked;
    this.state.showNickname = document.getElementById("showNickname").checked;
    this.state.showKi = document.getElementById("showKi").checked;
    this.state.showColorBlock = document.getElementById("showColorBlock").checked;
    this.state.showColorText = document.getElementById("showColorText").checked;
    this.state.customKonmei = document.getElementById("customKonmei").value;
    if (this.state.konmei === 'other') {
      document.getElementById('customKonmei').style.display = 'block';
    } else {
      document.getElementById('customKonmei').style.display = 'none';
    }
  }

  bindEvents() {
    const inputs = document.querySelectorAll('#controls input:not(#customKonmei), #controls select');
    inputs.forEach(el => el.addEventListener('change', () => this.updateAndRender()));

    document.getElementById('showColorBlock').addEventListener('change', (e) => {
      if (e.target.checked) document.getElementById('showColorText').checked = false;
      this.updateAndRender();
    });
    document.getElementById('showColorText').addEventListener('change', (e) => {
      if (e.target.checked) document.getElementById('showColorBlock').checked = false;
      this.updateAndRender();
    });
    document.getElementById('showKibetsu').addEventListener('change', () => {
      document.getElementById('showAll').checked = false;
      this.updateAndRender();
    });

    document.getElementById('settingsButton').addEventListener('click', () => {
      const panel = document.getElementById('設定パネル');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        panel.classList.remove('collapsed');
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top - (this.state.showKonmei ? (this.settings.公演名.フォントサイズ + 10) * (this.canvas.width / this.baseCanvasWidth) : 0);
      const cols = +this.state.ninzu.split("x")[0];
      const cw = this.canvas.width / cols;
      const ch = cw * this.baseAspect * (this.state.showPhoto ? 1.5 : 1);
      const col = Math.floor(mx / cw);
      const row = Math.floor(my / ch);
      const idx = row * cols + col;
      if (idx >= 0 && idx < this.grid.length) {
        const x = col * cw, y = row * ch;
        if (!this.grid[idx]) {
          this.showPopup(idx);
        } else if (mx > x + cw - 30 && my < y + 30) {
          this.grid[idx] = null;
          this.updateAndRender();
        }
      }
    });

    document.getElementById('downloadButton').addEventListener('click', async () => {
      await this.loadData();
      const tmp = document.createElement('canvas');
      tmp.width = this.canvas.width * 2;
      tmp.height = this.canvas.height * 2;
      const p = tmp.getContext('2d');
      p.scale(2, 2);
      this.renderGrid(tmp, p);
      const a = document.createElement('a');
      a.download = 'penlight_colors_300dpi.png';
      a.href = tmp.toDataURL('image/png');
      a.click();
    });
  }

  showPopup(idx) {
    this.currentIndex = idx;
    const popup = document.getElementById('popup');
    const periods = [...new Set(this.members.map(m => m.ki))];
    let html = '';
    periods.forEach(p => {
      html += `<details><summary>${p}</summary><div class="member-list">`;
      this.members.filter(m => m.ki === p).forEach(m => html += `<div class="member-item"><img src="${m.image}" width="50"><span>${m.name_ja}</span></div>`);
      html += '</div></details>';
    });
    html += `<div class="popup-footer"><button id="popupSelectBtn">選択</button><button id="popupCloseBtn">閉じる</button></div>`;
    popup.innerHTML = html;
    popup.style.display = 'block';
    popup.querySelectorAll('.member-item').forEach(it => it.onclick = () => {
      popup.querySelectorAll('.member-item').forEach(i => i.classList.remove('selected'));
      it.classList.add('selected');
    });
    document.getElementById('popupSelectBtn').onclick = () => {
      const s = popup.querySelector('.member-item.selected span');
      if (s) {
        this.grid[this.currentIndex] = s.textContent;
        popup.style.display = 'none';
        this.updateAndRender();
      }
    };
    document.getElementById('popupCloseBtn').onclick = () => popup.style.display = 'none';
  }
}

const generator = new PenlightGenerator();
generator.init();
