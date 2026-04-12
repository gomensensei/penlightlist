import os
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai
import json
from datetime import datetime
import pytz

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
# 🌟 這裡加入了你新增的關鍵字
keywords = ["公演スケジュール", "メンバー変更", "出演メンバー", "公演受付開始のお知らせ"]

for entry in feed.entries:
    title = entry.title
    if any(k in title for k in keywords):
        target_post = entry
        break

# 3. 讀取現有的 schedules.json
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
        print("🧠 Brain: 正在交由 Gemini AI 解析...")
        prompt = f"請解析以下 AKB48 公演名單為 JSON 格式，ID 格式為 YYYYMMDD_簡稱，成員名去空格並用日文漢字。內文：\n{blog_text}"
        
        try:
            # 繼續使用你發現的免費 Lite 版
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

# 5. 合併資料
all_data_map = {item['id']: item for item in existing_schedules}
for item in new_schedules:
    all_data_map[item['id']] = item

# 6. 刪除過期公演 (JST 時區)
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
print(f"📅 日本今日日期：{today_str}")

filtered_schedules = [
    item for item in all_data_map.values() 
    if item['id'][:8] >= today_str
]
filtered_schedules.sort(key=lambda x: x['id'])

# 7. 儲存
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！目前保留 {len(filtered_schedules)} 場公演。")
