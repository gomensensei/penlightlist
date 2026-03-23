let langsDB = {};
let membersDB = [];
let currentTitleKey = 'preset_tewo'; 
let isTitleCustomized = false;

const fallbackUI = {
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};

async function initApp() {
    try {
        const [memRes, langRes] = await Promise.all([ fetch('members.json'), fetch('langs.json') ]);
        if (!memRes.ok || !langRes.ok) throw new Error("Fetch failed");
        membersDB = await memRes.json();
        langsDB = await langRes.json();
    } catch (err) {
        console.warn("Using local JSON fallback due to CORS.");
        langsDB = { "zh-HK": { "app_title": "成員名單及應援色", "preset_placeholder": "-- 快速載入公演模板 --", "btn_download": "下載名單" } };
        membersDB = []; 
    }
    
    // 初始化為 8 格
    gridSlots = new Array(8).fill(null);
    applyLanguage();
    renderHTMLGrid();
}

let currentLang = 'zh-HK';
let gridSlots = [];
let activeSlotIndex = -1;
const htmlGrid = document.getElementById('htmlGrid');

document.getElementById('customTitle').addEventListener('input', () => { isTitleCustomized = true; });

document.getElementById('langSelector').addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyLanguage();
    updateTitleFromKey();
    renderHTMLGrid(); 
});

function applyLanguage() {
    const d = langsDB[currentLang] || langsDB['zh-HK'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(d[key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'OPTION') el.textContent = d[key];
            else el.textContent = d[key];
        }
    });
    
    if (!isTitleCustomized && currentTitleKey) updateTitleFromKey();
    if (d['title_placeholder']) document.getElementById('customTitle').placeholder = d['title_placeholder'];
    
    const sel = document.getElementById('presetSelector');
    if (sel.options[0]) sel.options[0].textContent = d['preset_placeholder'] || "-- 快速載入公演模板 (空白格) --";
    const genSel = document.getElementById('genSelector');
    if (genSel.options[0]) genSel.options[0].textContent = d['gen_placeholder'] || "-- 選擇期數全體載入 --";
}

function updateTitleFromKey() {
    if (!currentTitleKey || isTitleCustomized) return;
    const titleInput = document.getElementById('customTitle');
    const d = langsDB[currentLang] || langsDB['zh-HK'];
    if (currentTitleKey.startsWith('preset_')) {
        titleInput.value = d[currentTitleKey] || currentTitleKey;
    } else if (currentTitleKey.startsWith('gen_')) {
        const genRaw = currentTitleKey.replace('gen_', '');
        let translatedGen = genRaw;
        if (genRaw.includes('期生')) {
            translatedGen = genRaw.replace('期生', d['term_gen'] || '期生');
        } else if (genRaw === 'ドラフト生') {
            translatedGen = d['term_draft'] || 'ドラフト生';
        }
        titleInput.value = translatedGen + " " + (d['term_support_list'] || '應援名單');
    }
}

function hexToRgba(hex, a) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getDiagonalGradient(cd) {
    const c = cd.map(x => x.color);
    if (c.length === 1) return c[0];
    if (c.length === 2) return `linear-gradient(135deg, ${c[0]} 0%, ${c[0]} 50%, ${c[1]} 50%, ${c[1]} 100%)`;
    return `linear-gradient(135deg, ${c[0]} 0%, ${c[0]} 33.33%, ${c[1]} 33.33%, ${c[1]} 66.66%, ${c[2]} 66.66%, ${c[2]} 100%)`;
}

['cfgPhoto', 'cfgGen', 'cfgName', 'cfgNick'].forEach(id => document.getElementById(id).addEventListener('change', renderHTMLGrid));
document.querySelectorAll('input[name="colorMode"]').forEach(r => r.addEventListener('change', renderHTMLGrid));

document.getElementById('presetSelector').addEventListener('change', (e) => {
    const val = e.target.value; // e.g. "8_tewo"
    if (val) {
        const parts = val.split('_');
        gridSlots = new Array(parseInt(parts[0])).fill(null);
        currentTitleKey = 'preset_' + parts[1];
        isTitleCustomized = false;
        updateTitleFromKey();
        renderHTMLGrid();
    }
    e.target.value = ''; 
});

document.getElementById('genSelector').addEventListener('change', (e) => {
    const gen = e.target.value;
    if (gen) {
        const filtered = membersDB.filter(m => gen === "ドラフト生" ? m.ki.includes("ドラフト") : m.ki === gen);
        if (filtered.length > 0) {
            gridSlots = [...filtered];
            currentTitleKey = 'gen_' + gen;
            isTitleCustomized = false;
            updateTitleFromKey();
            renderHTMLGrid();
        } else { alert("找不到該期生成員資料。"); }
    }
    e.target.value = '';
});

// 確保精確 4x2 佈局及智能中心對齊
function calculateGridCols(total) {
    if (total <= 3) return total;
    if (total === 4) return 4; 
    if (total === 5) return 3; 
    if (total === 6) return 3; 
    if (total === 7) return 4; 
    if (total === 8) return 4; 
    if (total === 9) return 3; 
    if (total <= 12) return 4; 
    if (total <= 16) return 4; 
    return Math.ceil(Math.sqrt(total)); 
}

function setGridSize(size) {
    const oldSlots = [...gridSlots];
    gridSlots = new Array(size).fill(null);
    oldSlots.forEach((m, i) => { if (i < size) gridSlots[i] = m; });
    renderHTMLGrid();
}
function changeGridBy(n) { setGridSize(Math.max(1, gridSlots.length + n)); }

function renderHTMLGrid() {
    const cols = calculateGridCols(gridSlots.length);
    htmlGrid.style.setProperty('--cols', cols);
    htmlGrid.innerHTML = '';

    const photo = document.getElementById('cfgPhoto').checked;
    const gen = document.getElementById('cfgGen').checked;
    const name = document.getElementById('cfgName').checked;
    const nick = document.getElementById('cfgNick').checked;
    const mode = document.querySelector('input[name="colorMode"]:checked').value;

    gridSlots.forEach((obj, idx) => {
        const cell = document.createElement('div');
        cell.className = `grid-cell${obj ? ' filled mode-' + mode : ''}${!photo ? ' no-photo' : ''}${!name && !nick ? ' no-name' : ''}`;

        if (!obj) {
            cell.innerHTML = `<i class="add-icon">${fallbackUI.plus}</i>`;
            cell.onclick = () => openModal(idx);
        } else {
            let colorHtml = '', bg = '', overlay = '';
            if (mode === 'block') {
                bg = `background: ${getDiagonalGradient(obj.colorData)};`;
                overlay = `<div class="cell-overlay"></div>`;
            } else {
                bg = `background: radial-gradient(circle at center, ${hexToRgba(obj.colorData[0].color, 0.15)} 0%, transparent 70%);`;
                colorHtml = `<div class="color-display">` + obj.colorData.map((c, i) => {
                    let s = `<span class="c-text" style="color:${c.color}; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${c.name}</span>`;
                    if (i < obj.colorData.length - 1) s += `<span class="c-text-x">x</span>`;
                    return s;
                }).join('') + `</div>`;
            }

            let finalNameHtml = '', finalGenHtml = '';
            if (['zh-HK', 'zh-CN', 'ja'].includes(currentLang)) {
                if(gen) finalGenHtml = `<div class="cell-gen">${obj.ki}</div>`;
                if(name) finalNameHtml = `<ruby class="cell-name">${obj.name_ja}<rt>${obj.name_kana || ''}</rt></ruby>`;
            } else if (currentLang === 'ko') {
                if(gen) finalGenHtml = `<div class="cell-gen">${obj.ki}</div>`;
                if(name) finalNameHtml = `<div class="cell-name">${obj.name_ko || obj.name_en}</div>`;
            } else {
                if(gen) finalGenHtml = `<div class="cell-gen">${obj.ki}</div>`;
                if(name) finalNameHtml = `<div class="cell-name">${obj.name_en}</div>`;
            }

            cell.innerHTML = `
                <div class="cell-bg" style="${bg}"></div>${overlay}
                <div class="cell-content">
                    ${photo ? `<div class="avatar-wrap"><img src="${obj.image}" class="avatar-img" crossorigin="anonymous" onerror="this.style.display='none'"></div>` : ''}
                    <div class="text-wrap">
                        ${finalGenHtml}
                        ${finalNameHtml}
                        ${nick && obj.nickname ? `<div class="cell-nick">${obj.nickname}</div>` : ''}
                    </div>
                    ${colorHtml}
                </div>
                <div class="remove-btn" onclick="removeMember(event, ${idx})">${fallbackUI.x}</div>
            `;
            cell.onclick = () => openModal(idx);
        }
        htmlGrid.appendChild(cell);
    });
    if (window.lucide) lucide.createIcons();
}

function openModal(idx) {
    activeSlotIndex = idx;
    const b = document.getElementById('modalBody');
    b.innerHTML = '';
    membersDB.forEach(m => {
        const d = document.createElement('div'); d.className = 'member-option';
        const nameToUse = (currentLang === 'ko') ? m.name_ko : (['en', 'th', 'id'].includes(currentLang) ? m.name_en : m.name_ja);
        d.innerHTML = `<img src="${m.image}" crossorigin="anonymous"><span>${nameToUse}</span>`;
        d.onclick = () => { gridSlots[activeSlotIndex] = m; closeModal(); renderHTMLGrid(); };
        b.appendChild(d);
    });
    document.getElementById('memberModal').classList.add('active');
}

function closeModal() { document.getElementById('memberModal').classList.remove('active'); }
function removeMember(e, i) { e.stopPropagation(); gridSlots[i] = null; renderHTMLGrid(); }

function hexToHSL(h) {
    let r = parseInt(h.slice(1,3),16)/255, g = parseInt(h.slice(3,5),16)/255, b = parseInt(h.slice(5,7),16)/255;
    let max = Math.max(r,g,b), min = Math.min(r,g,b), hue = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
        let d = max - min; s = l > 0.5 ? d/(2-max-min) : d/(max+min);
        switch(max) { case r: hue = (g-b)/d + (g<b?6:0); break; case g: hue = (b-r)/d+2; break; case b: hue = (r-g)/d+4; break; }
        hue /= 6;
    }
    return { h: hue * 360, s: s, l: l };
}

function sortColorsByHue(cArr) {
    return cArr.sort((a, b) => {
        const hslA = hexToHSL(a.color), hslB = hexToHSL(b.color);
        const isMono = (hsl) => hsl.s < 0.1 || hsl.l < 0.1 || hsl.l > 0.9;
        if (isMono(hslA) && !isMono(hslB)) return 1;
        if (!isMono(hslA) && isMono(hslB)) return -1;
        return hslA.h - hslB.h; 
    });
}

function sortByColor() {
    let filled = gridSlots.filter(x => x !== null);
    filled.forEach(m => { m.colorData = sortColorsByHue([...m.colorData]); });
    filled.sort((a,b) => {
        const hslA = hexToHSL(a.colorData[0].color), hslB = hexToHSL(b.colorData[0].color);
        const isMonoA = hslA.s < 0.1 || hslA.l < 0.1 || hslA.l > 0.9;
        const isMonoB = hslB.s < 0.1 || hslB.l < 0.1 || hslB.l > 0.9;
        if (isMonoA && !isMonoB) return 1; if (!isMonoA && isMonoB) return -1;
        return hslA.h - hslB.h;
    });
    gridSlots = [...filled, ...new Array(gridSlots.length - filled.length).fill(null)];
    renderHTMLGrid();
}

function sortByGen() {
    const f = gridSlots.filter(x => x !== null);
    f.sort((a,b) => a.genNum - b.genNum);
    gridSlots = [...f, ...new Array(gridSlots.length - f.length).fill(null)];
    renderHTMLGrid();
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const c = document.createElement("span");
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    c.style.width = c.style.height = `${d}px`;
    const rect = btn.getBoundingClientRect();
    c.style.left = `${e.clientX - rect.left - d/2}px`;
    c.style.top = `${e.clientY - rect.top - d/2}px`;
    c.classList.add("ripple");
    const old = btn.querySelector(".ripple");
    if(old) old.remove();
    btn.appendChild(c);
    setTimeout(() => c.remove(), 600);
});

document.getElementById('themeToggle').addEventListener('click', () => document.body.classList.toggle('dark-mode'));

// Canvas 導出 (包含置中防疊字重寫 & 強制 Timeout 解決下載卡死)
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

    const photo = document.getElementById('cfgPhoto').checked;
    const gen = document.getElementById('cfgGen').checked;
    const name = document.getElementById('cfgName').checked;
    const nick = document.getElementById('cfgNick').checked;
    const mode = document.querySelector('input[name="colorMode"]:checked').value;

    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        let timeout = setTimeout(() => resolve(null), 1500); // 1.5s timeout 防卡死
        img.onload = () => { clearTimeout(timeout); resolve(img); };
        img.onerror = () => { clearTimeout(timeout); resolve(null); }; 
        img.src = url + "?v=" + Date.now();
    });

    for (let i = 0; i < gridSlots.length; i++) {
        let cellsInThisRow = cols;
        if (Math.floor(i / cols) === rows - 1) cellsInThisRow = gridSlots.length % cols || cols;
        const rowWidth = cellsInThisRow * cellW + (cellsInThisRow - 1) * padding;
        const startX = (canvas.width - rowWidth) / 2;
        const x = startX + (i % cols) * (cellW + padding);
        const y = headerHeight + padding + Math.floor(i / cols) * (cellH + padding);
        const member = gridSlots[i];

        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 20); ctx.clip();

        if (member) {
            if (mode === 'block') {
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
                ctx.fillStyle = isDark ? '#1E1E1E' : '#FFFFFF'; ctx.fillRect(x, y, cellW, cellH);
                const cx = x + cellW / 2, cy = y + cellH / 2;
                const rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellW);
                rGrad.addColorStop(0, hexToRgba(member.colorData[0].color, 0.15)); rGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = rGrad; ctx.fillRect(x, y, cellW, cellH);
            }

            if (photo && member.image) {
                const img = await loadImage(member.image);
                if (img) {
                    const avatarRadius = cellW * 0.22, cx = x + cellW / 2, cy = y + cellH * 0.35; 
                    ctx.beginPath(); ctx.arc(cx, cy, avatarRadius + 6, 0, Math.PI * 2); 
                    ctx.fillStyle = mode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#333' : '#FFF'); ctx.fill();
                    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, avatarRadius, 0, Math.PI * 2); ctx.clip();
                    const scale = Math.max((avatarRadius*2) / img.width, (avatarRadius*2) / img.height);
                    const w = img.width * scale, h = img.height * scale;
                    ctx.drawImage(img, cx - w/2, cy - h/2, w, h); ctx.restore();
                }
            }

            ctx.textAlign = 'center';
            const textColor = mode === 'block' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#2C3E50');
            const subColor = mode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#888' : '#999');
            
            // 完美防疊字 Y-coordinate 計算
            let currentY = photo ? (y + cellH * 0.55) : (y + cellH * 0.25);
            let fontScale = photo ? 1 : 1.35;
            if (!name && !nick) fontScale = 1; 
            
            if (mode === 'block') { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2; } 
            else { ctx.shadowColor = "transparent"; }

            // 1. 期生
            if (gen && member.ki) {
                currentY += cellW * 0.06 * fontScale; 
                ctx.fillStyle = subColor; ctx.font = `700 ${cellW * 0.05 * fontScale}px 'Noto Sans JP'`;
                ctx.fillText(member.ki, x + cellW/2, currentY); 
            }

            // 2. 平假名 & 名字
            if (name) {
                if (['zh-HK', 'zh-CN', 'ja'].includes(currentLang) && member.name_kana) {
                    currentY += cellW * 0.06 * fontScale; 
                    ctx.fillStyle = subColor; ctx.font = `700 ${cellW * 0.04 * fontScale}px 'Noto Sans JP'`;
                    ctx.fillText(member.name_kana, x + cellW/2, currentY); 
                }
                currentY += cellW * 0.11 * fontScale; 
                const nameToUse = (currentLang === 'ko') ? member.name_ko : (['en', 'th', 'id'].includes(currentLang) ? member.name_en : member.name_ja);
                ctx.fillStyle = textColor; ctx.font = `900 ${cellW * 0.11 * fontScale}px 'Noto Sans JP'`;
                ctx.fillText(nameToUse, x + cellW/2, currentY); 
            }

            // 3. 暱稱
            if (nick && member.nickname) { 
                currentY += cellW * 0.08 * fontScale; 
                ctx.fillStyle = subColor; ctx.font = `700 ${cellW * 0.06 * fontScale}px 'Noto Sans JP'`; 
                ctx.fillText(member.nickname, x + cellW/2, currentY); 
            }

            // 4. 色字
            if (mode === 'text') {
                currentY += cellW * 0.10 * fontScale; 
                ctx.font = `900 ${cellW * 0.08 * fontScale}px 'Noto Sans JP'`;
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
        ctx.lineWidth = 2; ctx.strokeStyle = mode === 'block' ? 'rgba(0,0,0,0.1)' : (isDark ? '#333' : '#EEE');
        ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 20); ctx.stroke();
    }

    try {
        const link = document.createElement('a'); link.download = `Support_Map_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
    } catch(err) {
        alert("下載失敗：因為 CORS 安全性，無法導出包含外部圖片的畫布。請嘗試取消勾選『顯示成員圓形頭像』再下載，或直接螢幕截圖。");
    }
    overlay.style.display = 'none';
}

document.getElementById('downloadBtn').addEventListener('click', drawCanvasExport);
window.addEventListener('DOMContentLoaded', initApp);
