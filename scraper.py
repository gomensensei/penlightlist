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

keywords = ["公演スケジュール", "メンバー変更", "出演メンバー", "公演受付開始", "公演のご案内"]
clean_title = lambda t: t.replace(" ", "").replace("　", "")

target_urls = []
for e in feed.entries:
    if any(k in clean_title(e.title) for k in keywords):
        target_urls.append({"link": e.link, "title": e.title})

# 🌟 特殊救援機制：強制補回跌出 RSS 的歷史文章 (重建資料庫用)
rescue_list = [
    # 舊文章放前面，新文章放後面
    {"link": "https://ameblo.jp/akihabara48/entry-12962469245.html", "title": "【救援】原本大名單"},
    {"link": "https://ameblo.jp/akihabara48/entry-12962706641.html", "title": "【救援】變更通知"}
]

# 將救援文章加入掃描清單 (避免重複)
existing_links = [t["link"] for t in target_urls]
for r in rescue_list:
    if r["link"] not in existing_links:
        target_urls.append(r)

# 🌟 由舊至新處理 (非常重要：先建大名單，後做變更加減)
target_urls.reverse()

# 3. 讀取現有資料
existing_schedules = []
if os.path.exists('schedules.json'):
    try:
        with open('schedules.json', 'r', encoding='utf-8') as f:
            existing_schedules = json.load(f)
    except:
        existing_schedules = []

processed_urls = set()
for item in existing_schedules:
    if 'sources' in item:
        processed_urls.update(item['sources'])
    elif 'url' in item:
        processed_urls.add(item['url'])

all_data_map = {item['id']: item for item in existing_schedules}

# 4. 逐篇解析
if not target_urls:
    print("ℹ️ 找不到目標文章。")
else:
    for entry in target_urls:
        link = entry["link"]
        title = entry["title"]
        
        if link in processed_urls:
            print(f"⏩ 已經處理過，跳過：{title}")
            continue

        print(f"🎯 處理新文章：{title}")
        response = requests.get(link)
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')
        article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
        
        if article_body:
            blog_text = article_body.get_text(separator="\n", strip=True)
            prompt = f"""
            這是一篇AKB48公演名單。請提取資訊，輸出純 JSON Array，每個 Object 包含以下 Key：
            "id": "YYYYMMDD_HHMM" (例如 20260417_1830)
            "date": "MM月DD日(星期) HH:MM"
            "title": "公演名稱"
            "is_change": true (如果是休演/代打變更通知) 或 false (如果是公佈完整名單)
            "full_members": ["成員1", "成員2"] (如果是完整名單，列出所有人。變更請留空 [])
            "added_members": ["代役成員"] (如果是變更通知中的「出演/代打」成員)
            "removed_members": ["休演成員"] (如果是變更通知中的「休演」成員)

            🚨【極度重要規則】：
            1. 如果文章包含多天公演，必須為「每一場」建立獨立 Object。
            2. 尋找「【休演】」字眼，將其成員放入 "removed_members"。
            3. 尋找「【出演】」字眼(且伴隨休演出現的代打)，將其放入 "added_members"。
            4. 名字必須去除空格，轉為日文漢字。
            5. 【標題強制統一】：無論原文寫法為何，"title" 必須強制統一為「XXX」公演 的格式。例如原文寫「僕の太陽」或「僕の太陽公演」，都必須輸出為「僕の太陽」公演。如果本身已經有「」，請勿重複添加。

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
                        new_full = item.get('full_members', [])
                        added = item.get('added_members', [])
                        removed = item.get('removed_members', [])
                        is_change = item.get('is_change', False)
                        
                        if sched_id not in all_data_map:
                            all_data_map[sched_id] = {
                                "id": sched_id,
                                "date": item.get('date', ''),
                                "title": item.get('title', ''),
                                "members": new_full if new_full else added,
                                "sources": [link]
                            }
                        else:
                            existing_members = all_data_map[sched_id].get('members', [])
                            
                            # 防呆：如果 AI 偷懶將代打當成完整名單
                            if len(new_full) > 0 and len(new_full) <= 3 and len(existing_members) >= 4:
                                is_change = True
                                added.extend(new_full)
                                new_full = []
                                
                            if is_change or added or removed:
                                curr_members = set(existing_members)
                                for rm in removed:
                                    curr_members.discard(rm)
                                for am in added:
                                    curr_members.add(am)
                                all_data_map[sched_id]['members'] = list(curr_members)
                            elif new_full:
                                all_data_map[sched_id]['members'] = new_full
                                
                            if 'sources' not in all_data_map[sched_id]:
                                all_data_map[sched_id]['sources'] = []
                            if link not in all_data_map[sched_id]['sources']:
                                all_data_map[sched_id]['sources'].append(link)
                                
                        print(f"✅ 更新成功：{sched_id} (目前人數: {len(all_data_map[sched_id]['members'])})")
            except Exception as e:
                print(f"⚠️ 解析文章失敗: {e}")

# 5. 清理過期公演
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
filtered_schedules = [v for k, v in all_data_map.items() if k[:8] >= today_str]
filtered_schedules.sort(key=lambda x: x['id'])

# 6. 儲存
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！目前有 {len(filtered_schedules)} 場公演。")
