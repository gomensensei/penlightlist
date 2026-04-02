import os
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai
import json
from datetime import datetime
import pytz # 用於處理時區

# 1. 從 GitHub Secrets 讀取 API Key
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("❌ 找不到 API Key")
    exit(1)

client = genai.Client(api_key=API_KEY)

# 2. 讀取 AKB48 官方 Blog RSS
RSS_URL = "https://rssblog.ameba.jp/akihabara48/rss20.xml"
print("🔍 正在讀取 AKB48 官方 Blog RSS...")
feed = feedparser.parse(RSS_URL)

target_post = None
for entry in feed.entries:
    title = entry.title
    if "公演スケジュール" in title or "メンバー変更" in title or "出演メンバー" in title:
        target_post = entry
        break

# 注意：即使今天沒新文章，我們也可能需要運行腳本來刪除舊的過期公演
# 所以這裡我們先不急著 exit

# 3. 讀取現有的 schedules.json (如果有)
existing_schedules = []
if os.path.exists('schedules.json'):
    try:
        with open('schedules.json', 'r', encoding='utf-8') as f:
            existing_schedules = json.load(f)
    except:
        existing_schedules = []

# 4. 如果有新文章，抓取並交給 AI
new_schedules = []
if target_post:
    print(f"🎯 發現目標文章：{target_post.title}")
    response = requests.get(target_post.link)
    response.encoding = response.apparent_encoding
    soup = BeautifulSoup(response.text, 'html.parser')
    article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
    
    if article_body:
        blog_text = article_body.get_text(separator="\n", strip=True)
        print("Brain: 正在交由 Gemini AI 解析...")
        prompt = f"請解析以下 AKB48 公演名單為 JSON 格式，ID 格式為 YYYYMMDD_簡稱，成員名去空格並用日文漢字。內文：\n{blog_text}"
        
        try:
            ai_response = client.models.generate_content(
                model='gemini-3.1-flash-lite-preview',
                contents=prompt,
            )
            result_text = ai_response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            new_schedules = json.loads(result_text)
        except Exception as e:
            print(f"⚠️ AI 解析失敗: {e}")

# 5. 合併新舊資料並排除重複 (以 ID 為準)
all_data_map = {item['id']: item for item in existing_schedules}
for item in new_schedules:
    all_data_map[item['id']] = item # 新文章的資料覆蓋舊的

# 6. 🌟 關鍵步驟：刪除過期公演
# 獲取東京目前日期 (YYYYMMDD)
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
print(f"📅 日本今日日期：{today_str}")

# 只保留 ID 日期 >= 今日 的項目
filtered_schedules = [
    item for item in all_data_map.values() 
    if item['id'][:8] >= today_str
]

# 按日期排序 (由新到舊)
filtered_schedules.sort(key=lambda x: x['id'], reverse=False)

# 7. 儲存結果
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！目前保留 {len(filtered_schedules)} 場即將到來的公演。")
