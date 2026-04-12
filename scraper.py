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

# 2. 讀取 RSS 
RSS_URL = "https://rssblog.ameba.jp/akihabara48/rss20.xml"
print("🔍 正在掃描 AKB48 官方 Blog...")
feed = feedparser.parse(RSS_URL)

keywords = ["公演スケジュール", "メンバー変更", "出演メンバー", "公演受付開始"]
clean_title = lambda t: t.replace(" ", "").replace("　", "")

target_entries = []
# 🌟 關鍵修正 1：移除 [:5] 限制，掃描 RSS 內所有文章，防止大名單被擠走
for e in feed.entries:
    if any(k in clean_title(e.title) for k in keywords):
        target_entries.append(e)

# 由舊至新處理，先建立底層大名單，再處理最新變更
target_entries.reverse()

# 3. 讀取現有資料
existing_schedules = []
if os.path.exists('schedules.json'):
    try:
        with open('schedules.json', 'r', encoding='utf-8') as f:
            existing_schedules = json.load(f)
    except:
        existing_schedules = []

# 建立已處理 URL 清單，防重複
processed_urls = set()
for item in existing_schedules:
    if 'sources' in item:
        processed_urls.update(item['sources'])
    elif 'url' in item:
        processed_urls.add(item['url'])

all_data_map = {item['id']: item for item in existing_schedules}

# 4. 逐篇解析
if not target_entries:
    print("ℹ️ 找不到目標文章。")
else:
    for entry in target_entries:
        if entry.link in processed_urls:
            print(f"⏩ 已經處理過，跳過：{entry.title}")
            continue

        print(f"🎯 處理新文章：{entry.title}")
        response = requests.get(entry.link)
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')
        article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
        
        if article_body:
            blog_text = article_body.get_text(separator="\n", strip=True)
            # 🌟 關鍵修正 2：更嚴謹的 AI 提示，強制分開「完整名單」與「加減成員」
            prompt = f"""
            請仔細閱讀以下 AKB48 Blog 內容，提取公演資訊。
            注意：如果文章包含「多天」的公演，必須為「每一場」建立獨立的 Object。
            
            必須輸出一個純 JSON Array，每個 Object 包含以下 Key：
            "id": "YYYYMMDD_HHMM" (例如 20260417_1830)
            "date": "MM月DD日(星期) HH:MM"
            "title": "公演名稱"
            "is_change": true (如果是休演/代役變更通知) 或 false (如果是公佈完整名單)
            "full_members": ["成員1", "成員2"] (如果是完整名單，列出所有人。如果是變更，請留空 [])
            "added_members": ["代役成員"] (如果是變更，列出新增/代役的成員)
            "removed_members": ["休演成員"] (如果是變更，列出休演的成員)

            注意：成員名字必須去除空格，轉為日文漢字。
            內容：
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
                        sched_id = item['id']
                        
                        # 如果是全新公演
                        if sched_id not in all_data_map:
                            all_data_map[sched_id] = {
                                "id": sched_id,
                                "date": item.get('date', ''),
                                "title": item.get('title', ''),
                                # 如果係全新，拎 full_members，如果無就拎 added_members
                                "members": item.get('full_members', []) or item.get('added_members', []),
                                "sources": [entry.link]
                            }
                        # 如果公演已存在，執行加減數
                        else:
                            if item.get('is_change'):
                                curr_members = set(all_data_map[sched_id].get('members', []))
                                for rm in item.get('removed_members', []):
                                    curr_members.discard(rm) # 踢走休演
                                for am in item.get('added_members', []):
                                    curr_members.add(am)     # 加入代役
                                all_data_map[sched_id]['members'] = list(curr_members)
                            else:
                                if item.get('full_members'):
                                    all_data_map[sched_id]['members'] = item.get('full_members', [])
                            
                            # 記錄 URL 來源
                            if 'sources' not in all_data_map[sched_id]:
                                all_data_map[sched_id]['sources'] = []
                            if entry.link not in all_data_map[sched_id]['sources']:
                                all_data_map[sched_id]['sources'].append(entry.link)
                                
                        print(f"✅ 成功更新：{sched_id} (目前人數: {len(all_data_map[sched_id]['members'])})")
            except Exception as e:
                print(f"⚠️ 解析文章失敗: {e}")

# 5. 清理過期公演 (JST 東京時間)
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
filtered_schedules = [v for k, v in all_data_map.items() if k[:8] >= today_str]
filtered_schedules.sort(key=lambda x: x['id'])

# 6. 儲存
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！schedules.json 現在有 {len(filtered_schedules)} 場公演。")
