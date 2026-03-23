let langsDB = {};
let membersDB = [];

// 內建回退數據 (Fallback Data) - 確保本地打開不會因為 CORS 死圖
const fallbackLangs = {
    "zh-HK": { "app_title": "成員名單及應援色", "preset_placeholder": "-- 快速載入公演模板 (空白格) --", "ctrl_grid": "Grid 格數控制", "btn_8": "8 人", "btn_12": "12 人", "btn_16": "16 人", "btn_minus": "減 1 格", "btn_plus": "加 1 格", "ctrl_display": "顯示內容設定", "cfg_photo": "顯示成員圓形頭像", "cfg_gen": "顯示期別", "cfg_name": "顯示名字", "cfg_nick": "顯示暱稱", "ctrl_color_mode": "應援色呈現方式", "mode_block": "色塊方格 (打斜各半AB色)", "mode_text": "陰影色字 (單色底高對比)", "ctrl_sort": "排列方式", "sort_color": "按顏色", "sort_gen": "按期數", "btn_download": "下載名單", "modal_title": "選擇成員", "loading": "渲染高解析度圖片中...", "footer_text": "© 2026 AKB48 應援名單生成器. Not affiliated with AKB48 official." }
};

const fallbackMembers = [
    { id: "1", name_ja: "岩立 沙穂", nickname: "さっほー", ki: "13期生", genNum: 13, colorData: [ {color: "#3860FF", name: "青"}, {color: "#FFFFFF", name: "白"}, {color: "#FF3633", name: "赤"} ], image: "https://d2r1lkk9i7row.cloudfront.net/mobile/member/83100622.jpg" },
    { id: "2", name_ja: "村山 彩希", nickname: "ゆいりー", ki: "13期生", genNum: 13, colorData: [ {color: "#d32f2f", name: "赤"}, {color: "#ffeb3b", name: "黄"} ], image: "https://d2r1lkk9i7row.cloudfront.net/mobile/member/83100632.jpg" }
];

async function initApp() {
    try {
        const [memRes, langRes] = await Promise.all([ fetch('members.json'), fetch('langs.json') ]);
        if (!memRes.ok || !langRes.ok) throw new Error("Fetch failed");
        membersDB = await memRes.json();
        langsDB = await langRes.json();
    } catch (err) {
        console.log("Using local JSON fallback due to CORS or missing files.");
        membersDB = fallbackMembers;
        langsDB = fallbackLangs;
    }
    
    applyLanguage();
    renderHTMLGrid();
}

// 系統狀態
let currentLang = 'zh-HK';
let gridSlots = new Array(16).fill(null); 
let activeSlotIndex = -1;

const htmlGrid = document.getElementById('htmlGrid');
const modal = document.getElementById('memberModal');

document.getElementById('langSelector').addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyLanguage();
});

function applyLanguage() {
    const langData = langsDB[currentLang] || langsDB['zh-HK'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(langData[key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'OPTION') el.textContent = langData[key];
            else el.textContent = langData[key];
        }
    });
    const sel = document.getElementById('presetSelector');
    if (sel.options[0]) sel.options[0].textContent = langData['preset_placeholder'] || "-- 快速載入公演模板 (空白格) --";
}

// 六角形轉 rgba 以支援光暈
function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 打斜各半色塊計算 (CSS gradient - Hard Stops)
function getDiagonalGradient(colorData) {
    const c = colorData.map(cd => cd.color);
    if (c.length === 1) return c[0];
    if (c.length === 2) return `linear-gradient(135deg, ${c[0]} 0%, ${c[0]} 50%, ${c[1]} 50%, ${c[1]} 100%)`;
    if (c.length >= 3) return `linear-gradient(135deg, ${c[0]} 0%, ${c[0]} 33.33%, ${c[1]} 33.33%, ${c[1]} 66.66%, ${c[2]} 66.66%, ${c[2]} 100%)`;
}

['cfgPhoto', 'cfgGen', 'cfgName', 'cfgNick'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderHTMLGrid);
});
document.querySelectorAll('input[name="colorMode"]').forEach(radio => {
    radio.addEventListener('change', renderHTMLGrid);
});

document.getElementById('presetSelector').addEventListener('change', (e) => {
    const val = e.target.value;
    const titleInput = document.getElementById('customTitle');
    if (val) {
        gridSlots = new Array(parseInt(val)).fill(null);
        titleInput.value = e.target.options[e.target.selectedIndex].text.replace(/ \(\d+人\)/, '');
        renderHTMLGrid();
    }
    e.target.value = ''; 
});

function calculateGridCols(total) {
    if (total <= 4) return total;
    if (total <= 8) return 4;
    if (total <= 12) return 4;
    if (total <= 16) return 4;
    return Math.ceil(Math.sqrt(total)); 
}

function setGridSize(size) {
    const oldSlots = [...gridSlots];
    gridSlots = new Array(size).fill(null);
    oldSlots.forEach((member, i) => { if (i < size) gridSlots[i] = member; });
    renderHTMLGrid();
}

function changeGridBy(amount) { setGridSize(Math.max(1, gridSlots.length + amount)); }

function renderHTMLGrid() {
    const cols = calculateGridCols(gridSlots.length);
    htmlGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    htmlGrid.innerHTML = '';

    const cfgPhoto = document.getElementById('cfgPhoto').checked;
    const cfgGen = document.getElementById('cfgGen').checked;
    const cfgName = document.getElementById('cfgName').checked;
    const cfgNick = document.getElementById('cfgNick').checked;
    const colorMode = document.querySelector('input[name="colorMode"]:checked').value;

    gridSlots.forEach((memberObj, index) => {
        const cell = document.createElement('div');
        // 添加 no-photo class 控制置中放大
        let classes = `grid-cell${memberObj ? ' filled mode-' + colorMode : ''}`;
        if (!cfgPhoto) classes += ` no-photo`;
        cell.className = classes;

        if (!memberObj) {
            cell.innerHTML = `<i data-lucide="plus" class="add-icon"></i>`;
            cell.onclick = () => openModal(index);
        } else {
            let colorHtml = ''; let bgStyle = ''; let overlayHtml = '';

            if (colorMode === 'block') {
                bgStyle = `background: ${getDiagonalGradient(memberObj.colorData)};`;
                overlayHtml = `<div class="cell-overlay"></div>`;
            } else {
                // 陰影色字模式：加入微弱 Radial Glow 背景
                bgStyle = `background: radial-gradient(circle at center, ${hexToRgba(memberObj.colorData[0].color, 0.15)} 0%, transparent 70%);`;
                colorHtml = `<div class="color-display">` + memberObj.colorData.map((c, i) => {
                    let span = `<span class="c-text" style="color:${c.color}; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${c.name}</span>`;
                    if (i < memberObj.colorData.length - 1) span += `<span class="c-text-x">x</span>`;
                    return span;
                }).join('') + `</div>`;
            }

            cell.innerHTML = `
                <div class="cell-bg" style="${bgStyle}"></div>
                ${overlayHtml}
                <div class="cell-content">
                    ${cfgPhoto ? `<div class="avatar-wrap"><img src="${memberObj.image || ''}" class="avatar-img" crossorigin="anonymous" onerror="this.style.display='none'"></div>` : ''}
                    <div class="text-wrap">
                        ${cfgGen && memberObj.ki ? `<div class="cell-gen">${memberObj.ki}</div>` : ''}
                        ${cfgName ? `<div class="cell-name">${memberObj.name_ja}</div>` : ''}
                        ${cfgNick && memberObj.nickname ? `<div class="cell-nick">(${memberObj.nickname})</div>` : ''}
                    </div>
                    ${colorHtml}
                </div>
                <div class="remove-btn" onclick="removeMember(event, ${index})"><i data-lucide="x" size="14"></i></div>
            `;
            cell.onclick = () => openModal(index);
        }
        htmlGrid.appendChild(cell);
    });
    // 每次更新 DOM 後必須重新呼叫 createIcons 否則會消失
    lucide.createIcons();
}

function openModal(index) {
    activeSlotIndex = index;
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';
    
    membersDB.forEach(m => {
        const div = document.createElement('div'); div.className = 'member-option';
        div.innerHTML = `<img src="${m.image}" crossorigin="anonymous"><span>${m.name_ja}</span>`;
        div.onclick = () => { gridSlots[activeSlotIndex] = m; closeModal(); renderHTMLGrid(); };
        modalBody.appendChild(div);
    });
    document.getElementById('memberModal').classList.add('active');
}

function closeModal() { document.getElementById('memberModal').classList.remove('active'); }
function removeMember(event, index) { event.stopPropagation(); gridSlots[index] = null; renderHTMLGrid(); }

function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        let d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
        h /= 6;
    }
    return { h: h * 360, s, l };
}

function sortByColor() {
    const filled = gridSlots.filter(m => m !== null);
    const emptyCount = gridSlots.length - filled.length;
    filled.sort((a, b) => hexToHSL(a.colorData[0].color).h - hexToHSL(b.colorData[0].color).h);
    gridSlots = [...filled, ...new Array(emptyCount).fill(null)];
    renderHTMLGrid();
}

function sortByGen() {
    const filled = gridSlots.filter(m => m !== null);
    const emptyCount = gridSlots.length - filled.length;
    filled.sort((a, b) => (a.genNum || 99) - (b.genNum || 99)); 
    gridSlots = [...filled, ...new Array(emptyCount).fill(null)];
    renderHTMLGrid();
}

document.querySelectorAll('.btn').forEach(btn => btn.addEventListener('click', function(e) {
    const circle = document.createElement("span");
    const diameter = Math.max(this.clientWidth, this.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - this.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - this.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    const ripple = this.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();
    this.appendChild(circle);
}));

async function drawCanvasExport() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';

    const canvas = document.getElementById('exportCanvas');
    const ctx = canvas.getContext('2d');
    const cols = calculateGridCols(gridSlots.length);
    const rows = Math.ceil(gridSlots.length / cols);
    
    const cellW = 400, cellH = 533, padding = 24, headerHeight = 120;
    const customTitle = document.getElementById('customTitle').value || "AKB48 應援名單";

    canvas.width = cols * cellW + padding * (cols + 1);
    canvas.height = rows * cellH + padding * (rows + 1) + headerHeight;

    const isDark = document.body.classList.contains('dark-mode');
    ctx.fillStyle = isDark ? '#1a1a2e' : '#fdfbfb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#2C3E50';
    ctx.textAlign = 'center'; ctx.font = `900 60px 'Noto Sans JP'`;
    ctx.fillText(customTitle, canvas.width / 2, 80);

    const cfgPhoto = document.getElementById('cfgPhoto').checked;
    const cfgGen = document.getElementById('cfgGen').checked;
    const cfgName = document.getElementById('cfgName').checked;
    const cfgNick = document.getElementById('cfgNick').checked;
    const colorMode = document.querySelector('input[name="colorMode"]:checked').value;

    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url;
    });

    for (let i = 0; i < gridSlots.length; i++) {
        const x = padding + (i % cols) * (cellW + padding);
        const y = headerHeight + padding + Math.floor(i / cols) * (cellH + padding);
        const member = gridSlots[i];

        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 20); ctx.clip();

        if (member) {
            if (colorMode === 'block') {
                const grad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
                const len = member.colorData.length;
                if (len === 1) { grad.addColorStop(0, member.colorData[0].color); grad.addColorStop(1, member.colorData[0].color); } 
                else if (len === 2) {
                    grad.addColorStop(0, member.colorData[0].color); grad.addColorStop(0.5, member.colorData[0].color);
                    grad.addColorStop(0.5, member.colorData[1].color); grad.addColorStop(1, member.colorData[1].color);
                } else if (len >= 3) {
                    grad.addColorStop(0, member.colorData[0].color); grad.addColorStop(0.333, member.colorData[0].color);
                    grad.addColorStop(0.333, member.colorData[1].color); grad.addColorStop(0.666, member.colorData[1].color);
                    grad.addColorStop(0.666, member.colorData[2].color); grad.addColorStop(1, member.colorData[2].color);
                }
                ctx.fillStyle = grad; ctx.fillRect(x, y, cellW, cellH);
                const overlayGrad = ctx.createLinearGradient(x, y + cellH - 220, x, y + cellH);
                overlayGrad.addColorStop(0, 'rgba(0,0,0,0)'); overlayGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
                ctx.fillStyle = overlayGrad; ctx.fillRect(x, y + cellH - 220, cellW, 220);
            } else {
                // 文本模式背景 Radial Glow
                ctx.fillStyle = isDark ? '#1E1E1E' : '#FFFFFF'; ctx.fillRect(x, y, cellW, cellH);
                const cx = x + cellW / 2, cy = y + cellH / 2;
                const rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellW);
                rGrad.addColorStop(0, hexToRgba(member.colorData[0].color, 0.15));
                rGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = rGrad; ctx.fillRect(x, y, cellW, cellH);
            }

            if (cfgPhoto && member.image) {
                const img = await loadImage(member.image);
                if (img) {
                    const avatarRadius = cellW * 0.22, cx = x + cellW / 2, cy = y + cellH * 0.35; 
                    ctx.beginPath(); ctx.arc(cx, cy, avatarRadius + 6, 0, Math.PI * 2); 
                    ctx.fillStyle = colorMode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#333' : '#FFF'); ctx.fill();
                    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, avatarRadius, 0, Math.PI * 2); ctx.clip();
                    const scale = Math.max((avatarRadius*2) / img.width, (avatarRadius*2) / img.height);
                    const w = img.width * scale, h = img.height * scale;
                    ctx.drawImage(img, cx - w/2, cy - h/2, w, h); ctx.restore();
                }
            }

            ctx.textAlign = 'center';
            const textColor = colorMode === 'block' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#2C3E50');
            const subColor = colorMode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#888' : '#999');
            
            // 動態調整無頭像時的 Y 軸和字體比例
            let currentY = cfgPhoto ? (y + cellH * 0.65) : (y + cellH * 0.45);
            let fontScale = cfgPhoto ? 1 : 1.35;
            
            if (colorMode === 'block') { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2; } 
            else { ctx.shadowColor = "transparent"; }

            if (cfgGen && member.ki) { ctx.fillStyle = subColor; ctx.font = `700 ${cellW * 0.06 * fontScale}px 'Noto Sans JP'`; ctx.fillText(member.ki, x + cellW/2, currentY); currentY += cellW * 0.1 * fontScale; }
            if (cfgName) { ctx.fillStyle = textColor; ctx.font = `900 ${cellW * 0.11 * fontScale}px 'Noto Sans JP'`; ctx.fillText(member.name_ja, x + cellW/2, currentY); currentY += cellW * 0.08 * fontScale; }
            if (cfgNick && member.nickname) { ctx.fillStyle = subColor; ctx.font = `700 ${cellW * 0.07 * fontScale}px 'Noto Sans JP'`; ctx.fillText(`(${member.nickname})`, x + cellW/2, currentY); currentY += cellW * 0.1 * fontScale; }

            if (colorMode === 'text') {
                currentY += cellW * 0.02 * fontScale; ctx.font = `900 ${cellW * 0.08 * fontScale}px 'Noto Sans JP'`;
                let totalW = 0;
                member.colorData.forEach((cd, idx) => { totalW += ctx.measureText(cd.name).width; if (idx < member.colorData.length - 1) totalW += ctx.measureText(" x ").width; });
                let startX = x + cellW/2 - totalW/2; ctx.textAlign = 'left';
                member.colorData.forEach((cd, idx) => {
                    ctx.fillStyle = cd.color; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
                    ctx.fillText(cd.name, startX, currentY); startX += ctx.measureText(cd.name).width;
                    if (idx < member.colorData.length - 1) {
                        ctx.shadowColor = "transparent"; ctx.fillStyle = subColor; ctx.font = `bold ${cellW * 0.06 * fontScale}px 'Noto Sans JP'`;
                        ctx.fillText(" x ", startX, currentY); startX += ctx.measureText(" x ").width; ctx.font = `900 ${cellW * 0.08 * fontScale}px 'Noto Sans JP'`; 
                    }
                });
                ctx.shadowColor = "transparent"; ctx.textAlign = 'center'; 
            }
        } else {
            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
            ctx.fillRect(x, y, cellW, cellH);
        }

        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = colorMode === 'block' ? 'rgba(0,0,0,0.1)' : (isDark ? '#333' : '#EEE');
        ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 20); ctx.stroke();
    }

    const link = document.createElement('a'); link.download = `Support_Map_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png'); link.click();
    overlay.style.display = 'none';
}

document.getElementById('downloadBtn').addEventListener('click', drawCanvasExport);
document.getElementById('themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark-mode'); });

window.addEventListener('DOMContentLoaded', initApp);
