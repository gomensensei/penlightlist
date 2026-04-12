import os
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai
import json
from datetime import datetime
import pytz

# 1. API 設定
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("❌ 找不到 API Key")
    exit(1)

client = genai.Client(api_key=API_KEY)

# 2. 讀取 RSS (掃描最新 5 篇文章)
RSS_URL = "https://rssblog.ameba.jp/akihabara48/rss20.xml"
print("🔍 正在掃描 AKB48 官方 Blog...")
feed = feedparser.parse(RSS_URL)

# 設定關鍵字（唔需要理空格）
keywords = ["公演スケジュール", "メンバー変更", "出演メンバー", "公演受付開始"]

target_entries = []
for e in feed.entries[:5]:
    # 🌟 核心修正：將標題入面所有半角同全角空格整走先
    clean_title = e.title.replace(" ", "").replace("　", "")
    if any(k in clean_title for k in keywords):
        target_entries.append(e)

# 3. 讀取現有資料
existing_schedules = []
if os.path.exists('schedules.json'):
    try:
        with open('schedules.json', 'r', encoding='utf-8') as f:
            existing_schedules = json.load(f)
    except:
        existing_schedules = []

all_data_map = {item['id']: item for item in existing_schedules}

# 4. 逐篇解析
if not target_entries:
    print("ℹ️ 最近 5 篇文章都無目標關鍵字。")
else:
    for entry in target_entries:
        print(f"🎯 發現目標標題：{entry.title}")
        response = requests.get(entry.link)
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')
        article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
        
        if article_body:
            blog_text = article_body.get_text(separator="\n", strip=True)
            # 強制要求 JSON Key 格式，防止出 undefined
            prompt = f"""
            你是一個專業的資料擷取機器人。請從以下 AKB48 Blog 內容中提取公演資訊。
            必須輸出一個純 JSON Array，每個 Object 必須包含以下 Key：
            "id": "YYYYMMDD_簡稱" (例如 20260413_boku)
            "date": "MM月DD日(星期) HH:MM"
            "title": "公演名稱"
            "members": ["名字1", "名字2"...] (名字去除空格，轉為日文漢字)

            內容如下：
            {blog_text}
            """
            
            try:
                ai_response = client.models.generate_content(
                    model='gemini-3.1-flash-lite-preview',
                    contents=prompt,
                )
                result_text = ai_response.text.strip()
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0].strip()
                
                new_data = json.loads(result_text)
                if isinstance(new_data, list):
                    for item in new_data:
                        all_data_map[item['id']] = item
                        print(f"✅ 成功提取：{item.get('date')} {item.get('title')}")
            except Exception as e:
                print(f"⚠️ 解析文章失敗: {e}")

# 5. 清理過期公演 (JST 東京時間)
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
# 只保留今日或之後嘅公演
filtered_schedules = [v for k, v in all_data_map.items() if k[:8] >= today_str]
filtered_schedules.sort(key=lambda x: x['id'])

# 6. 儲存
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！schedules.json 現在有 {len(filtered_schedules)} 場公演。")
