from pathlib import Path

content = """# 🌸 AKB48 成員名單及應援色生成器  
# AKB48 メンバー名簿＆応援色ジェネレーター  
# AKB48 Member Lineup & Penlight Color Generator

---

## 繁體中文

### 簡介
這是一個專為 AKB48 粉絲設計的高品質視覺生成工具，用於快速製作成員名單及應援色（推しカラー）圖卡。  
無論是生誕祭、劇場公演、演唱會，還是各類粉絲應援企劃，都可以透過此工具輕鬆生成清晰、美觀、可直接分享或列印使用的高畫質圖像。

### 核心功能

#### 1. 專業應援色呈現
- 支援「色塊方格（打斜 AB 色）」模式
- 支援「陰影色文字」模式
- 精確還原每位成員的專屬推しカラー

#### 2. 智能響應式版面
- 電腦版：左側預覽名單，右側調整參數
- 手機版：上方顯示名單，下方顯示設定區
- 方便在不同裝置上快速操作

#### 3. 自動平衡排版
- 根據人數自動計算最佳 Grid 排列
- 例如 8 人公演可自動排成 4 × 2
- 16 期 7 人、19 / 21 期 5 人等特殊人數可自動置中對齊
- 支援一鍵載入各期生完整名單

#### 4. 多語言介面
支援以下七種語言：
- 繁體中文
- 簡體中文
- 日本語
- English
- 한국어
- ไทย
- Bahasa Indonesia

#### 5. 智能文字縮放
- 長名字可自動縮小字體，避免超出範圍
- 長顏色名稱亦可自動調整大小
- 在繁體中文、簡體中文及日文介面中支援平假名注音（Furigana）

#### 6. 高畫質輸出
- 一鍵導出無損 PNG
- 已優化間距、對齊與文字縮放
- 確保期別、名字、暱稱與顏色資訊不會互相重疊
- 適合用於印刷、SNS 分享及現場應援

### 快速開始
1. 將本專案所有檔案上傳至 GitHub 倉庫  
2. 啟用 GitHub Pages  
3. 開啟生成的網站網址即可開始使用  

### 檔案結構
- `index.html`：網站主體結構
- `style.css`：令和感美學 UI 樣式、動態漸變背景及字體定義
- `script.js`：核心互動邏輯、Canvas 繪圖引擎及自動容錯機制
- `members.json`：成員資料庫（包含 ID、姓名、注音、應援色 Hex Code 及頭像連結）
- `langs.json`：七種語言翻譯字典

### 維護指南

#### 如何更新成員名單？
當有成員畢業或新加入時，只需修改 `members.json`：

- 畢業刪除：直接刪除該成員的 JSON 物件即可，無需重新排列 ID，系統會自動遍歷處理
- 新增成員：新增對應的 JSON 物件，填入姓名、顏色資料及圖片資訊
- 修正資料：可直接修改名稱、注音、顏色名稱或圖片連結

#### 如何修正應援色？
直接修改 `colorData` 內的：
- `color`：Hex 色碼
- `name`：顯示文字

#### 圖片下載問題
為提高下載成功率，網站已加入 CORS Bypass 機制。  
若在部分瀏覽器或特殊環境下仍無法順利載入頭像，建議：
- 取消勾選頭像選項後再下載
- 或直接使用螢幕截圖作為替代方案

### 免責聲明與版權
#### 使用目的
本工具希望：
- 協助新粉絲更了解如何支持成員
- 讓現有粉絲更方便整理與分享應援資訊
- 鼓勵大家發掘更多推し、推し増し與公演組合魅力

#### 版權聲明
本工具為非官方粉絲製作，僅供非商業用途使用。  
相關成員肖像、名稱及品牌權利歸 AKB48 與 株式会社DH 所有。

### 作者
由粉絲 **ゴメン先生（gomensensei）** 製作。

### 結語
這不只是一個圖卡工具，而是一個為 AKB48 粉絲文化而設的應援視覺系統。  
希望每一次應援，都能更清楚、更好看，也更有力量。

---

## 日本語

### 概要
本ツールは、AKB48ファンのために作られた高品質なビジュアル生成ツールです。  
メンバー一覧と応援色（推しカラー）を、見やすく美しい画像として素早く作成できます。  
生誕祭、劇場公演、コンサート、各種ファン企画など、さまざまな応援シーンで使える高解像度の画像を簡単に生成できます。

### 主な機能

#### 1. 応援色の高精度表示
- 「斜めAB配色のカラーブロック」表示に対応
- 「シャドウ付き文字色」表示に対応
- 各メンバーの推しカラーをできるだけ正確に再現

#### 2. レスポンシブレイアウト
- PC版：左側にプレビュー、右側に設定パネル
- スマホ版：上部に一覧、下部に設定エリア
- デバイスを問わず快適に操作可能

#### 3. 自動バランスレイアウト
- 人数に応じて最適な Grid を自動計算
- 例えば 8 人公演なら自動で 4 × 2 に配置
- 16期 7人、19 / 21期 5人などの特殊人数にも自動対応し、中央揃えで整列
- 各期生の全員一覧をワンクリックで読み込み可能

#### 4. 多言語対応
以下の7言語に対応しています：
- 繁體中文
- 简体中文
- 日本語
- English
- 한국어
- ไทย
- Bahasa Indonesia

#### 5. スマート文字調整
- 長い名前は自動で文字サイズを縮小
- 長いカラー名も自動調整
- 繁体字中国語・簡体字中国語・日本語モードでは、ふりがな表示に対応

#### 6. 高画質出力
- ワンクリックで PNG を無劣化書き出し
- 余白、整列、文字サイズを最適化
- 期別、名前、ニックネーム、カラー情報が重ならないよう調整済み
- 印刷、SNS投稿、現場応援に最適

### クイックスタート
1. 本プロジェクトの全ファイルを GitHub リポジトリにアップロードします  
2. GitHub Pages を有効化します  
3. 公開された URL にアクセスするとすぐに利用できます  

### ファイル構成
- `index.html`：サイトの基本構造
- `style.css`：令和風デザインのUI、動的グラデーション背景、フォント定義
- `script.js`：主要な操作ロジック、Canvas 描画エンジン、自動エラー対策
- `members.json`：メンバーデータベース（ID、名前、ふりがな、応援色のHexコード、画像リンクを含む）
- `langs.json`：7言語分の翻訳辞書

### メンテナンス

#### メンバー一覧の更新方法
卒業や新加入があった場合は、`members.json` を編集してください。

- 卒業メンバーの削除：該当する JSON オブジェクトを削除するだけで構いません。ID の振り直しは不要です
- 新メンバーの追加：必要な情報を含む JSON オブジェクトを追加してください
- 情報修正：名前、ふりがな、カラー名、画像URLなどを直接編集できます

#### 応援色の修正方法
`colorData` 内の以下を修正してください：
- `color`：Hexカラーコード
- `name`：表示名

#### 画像読み込みに関する問題
ダウンロード成功率を高めるため、サイトには CORS Bypass の仕組みを導入しています。  
ただし、一部ブラウザや特殊な環境では画像が正常に読み込めない場合があります。その際は：
- 画像表示のチェックを外してからダウンロードする
- あるいは画面キャプチャを代替手段として使用する

### 免責事項・著作権
#### 目的
本ツールは以下を目的としています：
- 新規ファンが応援方法を理解しやすくすること
- 既存ファンが応援情報を整理・共有しやすくすること
- 推しや推し増し、公演ごとの魅力をより多く発見できるようにすること

#### 著作権について
本ツールは非公式のファン制作物であり、非商用目的でのみ使用してください。  
メンバーの肖像、名称、ブランドに関する権利は AKB48 および 株式会社DH に帰属します。

### 作者
ファンである **ゴメン先生（gomensensei）** により制作されました。

### メッセージ
これは単なる画像作成ツールではなく、AKB48ファン文化のための応援ビジュアルシステムです。  
一回一回の応援が、より見やすく、より美しく、より力強いものになりますように。

---

## English

### Overview
This is a high-quality visual generator created for AKB48 fans.  
It helps users quickly create member lineup graphics and penlight color boards based on each member’s official or commonly used oshii color theme.  
It is suitable for birthday projects, theater performances, concerts, and many other fan support activities, with clean and high-resolution output ready for sharing or printing.

### Features

#### 1. Professional Color Presentation
- Supports a diagonal AB-color block style
- Supports a shadow-text color style
- Reproduces each member’s penlight color as accurately as possible

#### 2. Responsive Layout
- Desktop: preview on the left, settings on the right
- Mobile: lineup on the top, controls on the bottom
- Designed for smooth operation across devices

#### 3. Auto-balanced Layout
- Automatically calculates the best grid arrangement based on member count
- For example, an 8-member stage can be arranged as a clean 4 × 2 layout
- Special counts such as 7 members or 5 members can also be centered automatically
- Supports one-click loading for full generation-based member lists

#### 4. Multi-language Support
The interface supports seven languages:
- Traditional Chinese
- Simplified Chinese
- Japanese
- English
- Korean
- Thai
- Bahasa Indonesia

#### 5. Smart Text Scaling
- Long member names are automatically resized to prevent overflow
- Long color names are also adjusted automatically
- Furigana display is supported in Traditional Chinese, Simplified Chinese, and Japanese modes

#### 6. High-quality Export
- One-click lossless PNG export
- Spacing, alignment, and text scaling are optimized
- Generation, name, nickname, and color information are adjusted to avoid overlap
- Suitable for printing, social sharing, and live support use

### Quick Start
1. Upload all project files to your GitHub repository  
2. Enable GitHub Pages  
3. Open the published URL and start using the tool  

### File Structure
- `index.html`: main page structure
- `style.css`: Reiwa-inspired UI design, animated gradient background, and font definitions
- `script.js`: core interaction logic, Canvas rendering engine, and automatic fallback handling
- `members.json`: member database including ID, name, furigana, penlight color hex code, and image link
- `langs.json`: translation dictionary for all seven supported languages

### Maintenance

#### How to update the member list
When a member graduates or a new member joins, simply edit `members.json`.

- To remove a graduated member: delete the corresponding JSON object directly. No need to reorder IDs
- To add a new member: add a new JSON object with the required information
- To correct existing data: edit the name, furigana, color label, or image link directly

#### How to update penlight colors
Edit the following fields inside `colorData`:
- `color`: Hex color code
- `name`: display text

#### Image loading issues
To improve download reliability, the site includes a CORS bypass mechanism.  
If member images still fail to load in certain browsers or environments, you can:
- disable the avatar option before exporting
- or use a screenshot as an alternative

### Disclaimer and Copyright
#### Purpose
This tool is intended to:
- help new fans better understand how to support members
- help existing fans organize and share support information more easily
- encourage discovery of more oshimen, oshimashi, and stage lineup combinations

#### Copyright
This is an unofficial fan-made tool for non-commercial use only.  
All rights related to member images, names, and branding belong to AKB48 and DH Inc.

### Author
Created by fan **ゴメン先生 (gomensensei)**.

### Final Note
This is not just a graphic generator. It is a visual support system built for AKB48 fan culture.  
May every act of support become clearer, better-looking, and more powerful.
"""

path = Path("/mnt/data/AKB48_Penlight_Generator_README_trilingual.md")
path.write_text(content, encoding="utf-8")
print(str(path))
