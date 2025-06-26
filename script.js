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
      '#FF0000': '赤',
      '#FFA500': 'オレンジ',
      '#FFFF00': '黄',
      '#0000FF': '青',
      '#00FF00': '緑',
      '#FFFFFF': '白',
      '#FF69B4': 'ピンク',
      '#FFB6C1': '薄ピンク',
      '#32CD32': '黄緑',
      '#00CED1': '水',
      '#800080': '紫',
      '#FF1493': '濃いピンク'
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
      img.crossOrigin = "anonymous";
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
