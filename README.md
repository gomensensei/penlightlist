# AKB48 Penlight List | AKB48 成員名單及應援色 | AKB48 メンバー名簿＆応援色

![Version](https://img.shields.io/badge/Version-2026.07.03-pink)
![License](https://img.shields.io/badge/License-Non--Commercial-blue)
![Platform](https://img.shields.io/badge/Platform-Web-orange)
![Cloud Save](https://img.shields.io/badge/Cloud%20Save-Optional-lightblue)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-ff69b4)

---

## Project Overview | 專案簡介 | プロジェクト概要

**[ZH]** 這是一個為 AKB48 粉絲製作的非官方成員名單與應援色生成器。它可以快速整理公演出場名單、成員頭像、期別、名字、暱稱與 penlight color，輸出成清晰圖片，方便劇場公演、演唱會、生誕祭與 fan project 使用。

**[EN]** AKB48 Penlight List is an unofficial fan-made lineup and penlight color generator. It helps fans create clean cast-list graphics with member photos, generations, names, nicknames, and penlight colors for theater shows, concerts, birthday projects, and fan support.

**[JP]** AKB48 Penlight List は、メンバー一覧とペンライトカラーを整理する非公式ファンツールです。劇場公演、コンサート、生誕祭、ファン企画向けに、写真、期別、名前、ニックネーム、応援色を見やすい画像として出力できます。

---

## Main Features | 功能說明 | 主な機能

### 1. Penlight Color Board
* **[ZH]** 支援斜線雙色方格與文字陰影模式，清楚呈現每位成員推色。
* **[EN]** Supports diagonal dual-color blocks and shadow-text mode for member penlight colors.
* **[JP]** 斜め2色ブロックと文字影表示で、各メンバーの応援色を表示できます。

### 2. Cast List Builder
* **[ZH]** 可一鍵載入公演模板、期生全體或自選成員，適合出發前快速 check 出場名單。
* **[EN]** Load performance templates, generation groups, or custom members for quick pre-show cast checks.
* **[JP]** 公演テンプレート、期別全体、任意メンバーを読み込み、出発前の出演確認に使えます。

### 3. Responsive Export
* **[ZH]** 自動計算 grid、文字縮放與圖片排版，支援高畫質 PNG 下載。
* **[EN]** Auto-balances grid layout, text scaling, and image placement for high-quality PNG export.
* **[JP]** グリッド、文字サイズ、画像配置を自動調整し、高画質 PNG として出力できます。

### 4. Schedule Rail
* **[ZH]** 可瀏覽近期 schedule，並用展開模式快速查看公演項目。
* **[EN]** Includes a schedule rail with compact and expanded browsing modes.
* **[JP]** 予定レールで公演情報をコンパクト表示または展開表示できます。

### 5. Local Save + Optional Cloud Save
* **[ZH]** 本機保存永遠可用；登入 Tool48 Account 後可選擇把清單備份到 cloud。
* **[EN]** Local save always works. Tool48 Account adds optional cloud backup for signed-in users.
* **[JP]** ローカル保存は常に利用可能です。Tool48 Account にログインすると任意で cloud backup できます。

---

## Technical Highlights | 技術亮點 | 技術的特徴

* **Queued Image Loading**: Member images are loaded in a controlled queue for smoother browser rendering.
* **Display / Export Path Separation**: Visible images use normal browser loading; export paths avoid breaking canvas behavior.
* **Multilingual i18n**: `langs.json` covers Traditional Chinese, Simplified Chinese, Japanese, English, Korean, Thai, and Indonesian.
* **Mobile-first Controls**: Save popovers, schedule rail, and export actions are compact on narrow screens.
* **Privacy-first Design**: We will not disclose personal data without explicit consent.

---

## Quick Start | 快速開始 | クイックスタート

1. Keep all files in the same folder.
2. Open `index.html`, or use a local server if JSON/image loading is blocked.
3. Choose a language, load a template or members, adjust display options, then export.

```bash
python -m http.server 4174
```

Open:

```text
http://127.0.0.1:4174/
```

---

## File Structure | 檔案結構 | ファイル構成

* `index.html` - Main UI, controls, account popover, export modal.
* `style.css` - Layout, responsive rules, account/save popovers, schedule rail.
* `script.js` - Member loading, grid rendering, image export, local save, optional Supabase cloud save.
* `members.json` - Member profile, generation, image, and color data.
* `langs.json` - Multilingual UI copy.
* `schedules.json` - Schedule rail source data.

---

## Maintenance | 維護 | メンテナンス

* Update member information in `members.json`.
* Update translations in `langs.json`.
* Update schedule data in `schedules.json`.
* Keep local save usable without login.
* Cloud save must remain optional and hidden when logged out.
* If cloud save fails with database permissions, review `supabase-penlight-cloud-save-grants.sql`.

---

## Disclaimer | 免責聲明 | 免責事項

**[ZH]** 本專案為非官方、非商業粉絲工具，只供個人整理、分享應援資訊及 fan project 使用。所有成員圖片、名稱、商標及相關素材權利屬 AKB48、DH Co., Ltd. 及各自權利持有人。

**[EN]** This is an unofficial, non-commercial fan tool for personal organisation, support sharing, and fan projects only. All member images, names, trademarks, and related materials belong to AKB48, DH Co., Ltd., and their respective rights holders.

**[JP]** 本プロジェクトは非公式・非商用のファンツールです。個人整理、応援情報共有、ファン企画のために使用してください。メンバー画像、名称、商標、関連素材の権利は AKB48、DH Co., Ltd. および各権利者に帰属します。

---

## Created by | 製作 | 制作

**ゴメン先生 (gomensensei)**
