let langsDB = {};
let membersDB = [];

// 純淨 SVG，保證 Github Pages 任何環境下都不會丟失 Icon
const sysUI = {
    plus: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};

// 狀態監控
let currentLang = 'zh-HK';
let gridSlots = new Array(8).fill(null); // 強制初始 8 格 4x2
let activeSlotIndex = -1;
let currentTitleState = { type: 'preset', id: '8_tewo' }; 
let isTitleCustomized = false;

const htmlGrid = document.getElementById('htmlGrid');

// 終極容錯機制：將你上傳的原始 members.json 自動補齊新屬性，防止畫布崩潰
function parseMemberData(rawArray) {
    return rawArray.map((m, idx) => {
        if (m.colorData && Array.isArray(m.colorData)) return m; 

        let cData = [];
        if (m.color_a) cData.push({ color: m.color_a, name: "色A" });
        if (m.color_b) cData.push({ color: m.color_b, name: "色B" });
        if (m.name_ja === "岩立 沙穂") cData = [{color: "#3860FF", name: "青"}, {color: "#FFFFFF", name: "白"}, {color: "#d32f2f", name: "赤"}];

        return {
            id: m.id || String(idx + 1),
            name_ja: m.name_ja || "", name_kana: m.name_kana || "", name_en: m.name_en || "", name_ko: m.name_ko || "",
            nickname: m.nickname || m.name_en || m.name_ja || "",
            ki: m.generation || m.ki || "",
            genNum: parseFloat((m.generation || m.ki || "99").replace(/[^0-9.]/g, '')) || 99,
            colorData: cData, image: m.image || ""
        };
    });
}

// 攔截所有報錯，防止黑畫面
window.onerror = function(msg, url, line) {
    console.error("System Error: ", msg, url, line);
    return true; 
};

async function initApp() {
    try {
        const [memRes, langRes] = await Promise.all([ fetch('members.json'), fetch('langs.json') ]);
        if (!memRes.ok || !langRes.ok) throw new Error("Fetch failed");
        
        const rawMembers = await memRes.json();
        membersDB = parseMemberData(rawMembers); 
        langsDB = await langRes.json();
    } catch (err) {
        console.warn("Fetch API failed. Check if running on Server/GitHub.");
        // 防禦性 Fallback 確保 Github Pages 未更新時仍可運行
        langsDB = { "zh-HK": { "app_title": "成員名單及應援色", "preset_placeholder": "-- 選擇空白公演人數 --", "btn_download": "下載名單" } };
        membersDB = []; 
    }
    
    applyLanguage();
    renderHTMLGrid();
}

document.getElementById('customTitle').addEventListener('input', () => { isTitleCustomized = true; });

document.getElementById('langSelector').addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyLanguage();
    updateTitleFromState();
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
    
    if (!isTitleCustomized && currentTitleState) updateTitleFromState();
    if (d['title_placeholder']) document.getElementById('customTitle').placeholder = d['title_placeholder'];
    
    const sel = document.getElementById('presetSelector');
    if (sel.options[0]) sel.options[0].textContent = d['preset_placeholder'] || "-- 快速載入公演模板 --";
    const genSel = document.getElementById('genSelector');
    if (genSel.options[0]) genSel.options[0].textContent = d['gen_placeholder'] || "-- 選擇期數全體載入 --";
}

function updateTitleFromState() {
    if (isTitleCustomized || !currentTitleState) return;
    const titleInput = document.getElementById('customTitle');
    const d = langsDB[currentLang] || langsDB['zh-HK'];
    
    if (currentTitleState.type === 'preset') {
        titleInput.value = d['preset_' + currentTitleState.id] || "公演";
    } else if (currentTitleState.type === 'gen') {
        let genStr = currentTitleState.id; 
        let translated = genStr;
        if (genStr.includes('期生')) translated = genStr.replace('期生', d['term_gen'] || '期生');
        else if (genStr === 'ドラフト生') translated = d['term_draft'] || 'ドラフト生';
        titleInput.value = translated + " " + (d['term_support_list'] || '應援名單');
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
    const val = e.target.value; 
    if (val) {
        const parts = val.split('_');
        gridSlots = new Array(parseInt(parts[0])).fill(null);
        currentTitleState = { type: 'preset', id: val };
        isTitleCustomized = false;
        updateTitleFromState();
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
            currentTitleState = { type: 'gen', id: gen };
            isTitleCustomized = false;
            updateTitleFromState();
            renderHTMLGrid();
        } else { alert("找不到該期生成員資料。請確保 members.json 資料庫已更新。"); }
    }
    e.target.value = '';
});

// 完美 Flexbox 佈局算法
function calculateGridCols(total) {
    if (total <= 3) return total;
    if (total === 4) return 4; 
    if (total === 5) return 3; 
    if (total === 6) return 3; 
    if (total === 7) return 4; 
    if (total === 8) return 4; // 強制 4x2
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
    try {
        const cols = calculateGridCols(gridSlots.length);
        htmlGrid.innerHTML = '';

        const photo = document.getElementById('cfgPhoto').checked;
        const gen = document.getElementById('cfgGen').checked;
        const name = document.getElementById('cfgName').checked;
        const nick = document.getElementById('cfgNick').checked;
        const mode = document.querySelector('input[name="colorMode"]:checked').value;

        gridSlots.forEach((obj, idx) => {
            const cell = document.createElement('div');
            cell.className = `grid-cell${obj ? ' filled mode-' + mode : ''}${!photo ? ' no-photo' : ''}${!name && !nick ? ' no-name' : ''}`;
            // 寫死寬度，完全防範 CSS 變數緩存失效導致格仔消失
            cell.style.flex = `0 0 calc((100% - ${(cols - 1) * 16}px) / ${cols} - 0.5px)`;

            if (!obj) {
                cell.innerHTML = `<i class="add-icon">${sysUI.plus}</i>`;
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
                        ${photo ? `<div class="avatar-wrap"><img src="${obj.image}" class="avatar-img" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>` : ''}
                        <div class="text-wrap">
                            ${finalGenHtml}
                            ${finalNameHtml}
                            ${nick && obj.nickname ? `<div class="cell-nick">${obj.nickname}</div>` : ''}
                        </div>
                        ${colorHtml}
                    </div>
                    <div class="remove-btn" onclick="removeMember(event, ${idx})">${sysUI.x}</div>
                `;
                cell.onclick = () => openModal(idx);
            }
            htmlGrid.appendChild(cell);
        });
    } catch(e) {
        console.error("Grid Rendering Failed:", e);
    }
}

function openModal(idx) {
    activeSlotIndex = idx;
    const b = document.getElementById('modalBody');
    b.innerHTML = '';
    membersDB.forEach(m => {
        const d = document.createElement('div'); d.className = 'member-option';
        const nameToUse = (currentLang === 'ko') ? m.name_ko : (['en', 'th', 'id'].includes(currentLang) ? m.name_en : m.name_ja);
        d.innerHTML = `<img src="${m.image}" referrerpolicy="no-referrer"><span>${nameToUse}</span>`;
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

// 完美高可見度 Ripple 動畫 (支援所有觸控與點擊)
function createRipple(e) {
    const btn = e.target.closest('.btn, .icon-btn');
    if (!btn) return;
    const c = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    c.style.width = c.style.height = `${d}px`;
    
    let clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    c.style.left = `${clientX - rect.left - d/2}px`;
    c.style.top = `${clientY - rect.top - d/2}px`;
    c.className = "ripple";
    
    const old = btn.querySelector(".ripple");
    if(old) old.remove();
    btn.appendChild(c);
    setTimeout(() => c.remove(), 600);
}
document.addEventListener('mousedown', createRipple);
document.addEventListener('touchstart', createRipple, {passive: true});

document.getElementById('themeToggle').addEventListener('click', () => document.body.classList.toggle('dark-mode'));

// 手寫底層圓角公式，確保 100% 瀏覽器兼容下載不報錯
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
}

// Canvas 導出 (防疊字 Y-Offset 與 Promise.race 超時強制執行)
async function drawCanvasExport() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';

    // 防止字體或圖片載入卡死，強制 600ms 後無論如何都解鎖下載
    try {
        await Promise.race([
            document.fonts ? document.fonts.ready : Promise.resolve(),
            new Promise(r => setTimeout(r, 600))
        ]);
    } catch(e) {}

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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 60px 'Noto Sans JP', sans-serif`;
    ctx.fillText(customTitle, canvas.width / 2, 60);

    const photo = document.getElementById('cfgPhoto').checked;
    const gen = document.getElementById('cfgGen').checked;
    const name = document.getElementById('cfgName').checked;
    const nick = document.getElementById('cfgNick').checked;
    const mode = document.querySelector('input[name="colorMode"]:checked').value;

    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        let timeout = setTimeout(() => resolve(null), 1000); 
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

        ctx.save(); drawRoundedRect(ctx, x, y, cellW, cellH, 20); ctx.clip();

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
                    const avatarRadius = cellW * 0.22, cx = x + cellW / 2, cy = y + cellH * 0.33; 
                    ctx.beginPath(); ctx.arc(cx, cy, avatarRadius + 6, 0, Math.PI * 2); 
                    ctx.fillStyle = mode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#333' : '#FFF'); ctx.fill();
                    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, avatarRadius, 0, Math.PI * 2); ctx.clip();
                    const scale = Math.max((avatarRadius*2) / img.width, (avatarRadius*2) / img.height);
                    const w = img.width * scale, h = img.height * scale;
                    ctx.drawImage(img, cx - w/2, cy - h/2, w, h); ctx.restore();
                }
            }

            ctx.textAlign = 'center'; ctx.textBaseline = 'top'; 
            const textColor = mode === 'block' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#2C3E50');
            const subColor = mode === 'block' ? 'rgba(255,255,255,0.8)' : (isDark ? '#888' : '#999');
            
            let fontScale = photo ? 1 : 1.35;
            if (!name && !nick && !gen) fontScale = 1; 

            if (mode === 'block') { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2; } 
            else { ctx.shadowColor = "transparent"; }

            // 完美防疊字 Y-Offset
            let textElements = [];
            if (gen && member.ki) {
                textElements.push({ text: member.ki, font: `700 ${cellW*0.055*fontScale}px 'Noto Sans JP', sans-serif`, color: subColor, h: cellW*0.055*fontScale, gap: cellW*0.025*fontScale });
            }
            if (name) {
                if (['zh-HK', 'zh-CN', 'ja'].includes(currentLang) && member.name_kana) {
                    textElements.push({ text: member.name_kana, font: `700 ${cellW*0.04*fontScale}px 'Noto Sans JP', sans-serif`, color: subColor, h: cellW*0.04*fontScale, gap: cellW*0.01*fontScale });
                }
                const nameToUse = (currentLang === 'ko') ? member.name_ko : (['en', 'th', 'id'].includes(currentLang) ? member.name_en : member.name_ja);
                textElements.push({ text: nameToUse, font: `900 ${cellW*0.11*fontScale}px 'Noto Sans JP', sans-serif`, color: textColor, h: cellW*0.11*fontScale, gap: cellW*0.03*fontScale });
            }
            if (nick && member.nickname) {
                textElements.push({ text: member.nickname, font: `700 ${cellW*0.065*fontScale}px 'Noto Sans JP', sans-serif`, color: subColor, h: cellW*0.065*fontScale, gap: cellW*0.03*fontScale });
            }

            let totalTextHeight = textElements.reduce((sum, el) => sum + el.h + el.gap, 0);
            if (textElements.length > 0) totalTextHeight -= textElements[textElements.length-1].gap;
            
            let currentY = y + cellH * (photo ? 0.70 : 0.45) - (totalTextHeight / 2);

            textElements.forEach(el => {
                ctx.font = el.font; ctx.fillStyle = el.color; ctx.fillText(el.text, x + cellW/2, currentY); currentY += el.h + el.gap;
            });

            if (mode === 'text') {
                currentY += cellW * 0.05 * fontScale; 
                ctx.font = `900 ${cellW * 0.08 * fontScale}px 'Noto Sans JP', sans-serif`;
                let totalW = 0;
                member.colorData.forEach((cd, idx) => { totalW += ctx.measureText(cd.name).width; if (idx < member.colorData.length - 1) totalW += ctx.measureText(" x ").width; });
                let textX = x + cellW/2 - totalW/2; ctx.textAlign = 'left';
                member.colorData.forEach((cd, idx) => {
                    ctx.fillStyle = cd.color; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
                    ctx.fillText(cd.name, textX, currentY); textX += ctx.measureText(cd.name).width;
                    if (idx < member.colorData.length - 1) {
                        ctx.shadowColor = "transparent"; ctx.fillStyle = subColor; ctx.font = `bold ${cellW * 0.06 * fontScale}px 'Noto Sans JP', sans-serif`;
                        ctx.fillText(" x ", textX, currentY + cellW*0.01*fontScale); textX += ctx.measureText(" x ").width; ctx.font = `900 ${cellW * 0.08 * fontScale}px 'Noto Sans JP', sans-serif`; 
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
        drawRoundedRect(ctx, x, y, cellW, cellH, 20); ctx.stroke();
    }

    try {
        const link = document.createElement('a'); link.download = `Support_Map_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
    } catch(err) {
        console.error(err);
        alert("下載完成！如果圖片未彈出，表示受限於瀏覽器跨域防護。請嘗試取消勾選『顯示頭像』再下載，或直接螢幕截圖。");
    }
    overlay.style.display = 'none';
}

document.getElementById('downloadBtn').addEventListener('click', drawCanvasExport);
window.addEventListener('DOMContentLoaded', initApp);
