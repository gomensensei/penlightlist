import os
import re
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai
from google.genai import errors
import json
from datetime import datetime
import pytz

# 1. API 設定
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("❌ 找不到 API Key")
    exit(1)

client = genai.Client(api_key=API_KEY)
MODEL = 'gemini-3.1-flash-lite'

# 2. 讀取 RSS
RSS_URL = "https://rssblog.ameba.jp/akihabara48/rss20.xml"
print("🔍 正在掃描 AKB48 官方 Blog...")
rss_response = requests.get(RSS_URL, timeout=30)
rss_response.raise_for_status()
feed = feedparser.parse(rss_response.content)
if not feed.entries:
    raise SystemExit('Official AKB48 RSS returned no entries; schedules.json was not changed.')

keywords = ["公演スケジュール", "メンバー変更", "出演メンバー", "公演受付開始", "公演のご案内"]
clean_title = lambda t: re.sub(r"\s+", "", t)

target_urls = []
for e in feed.entries:
    if any(k in clean_title(e.title) for k in keywords):
        target_urls.append({"link": e.link, "title": e.title, "published": e.get("published", "")})

# 由舊至新處理
target_urls.reverse()

# 3. 讀取現有資料
existing_schedules = []
if os.path.exists('schedules.json'):
    try:
        with open('schedules.json', 'r', encoding='utf-8') as f:
            existing_schedules = json.load(f)
    except (OSError, ValueError) as error:
        raise SystemExit('Could not read schedules.json; refusing to overwrite it.') from error

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

        print(f"🎯 處理新文章：{title} ({link})")
        response = requests.get(link, timeout=30)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')
        article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
        if not article_body:
            raise SystemExit(f'Article body missing: {link}; schedules.json was not changed.')
        
        if article_body:
            blog_text = article_body.get_text(separator="\n", strip=True)
            
            # 🌟 關鍵修改：廢除「變更留空」指令，改為「見到全體就抄」
            prompt = f"""
            這是一篇AKB48公演名單。請提取資訊，輸出純 JSON Array，每個 Object 包含以下 Key：
            "id": "YYYYMMDD_HHMM" (例如 20260418_1300)
            "date": "MM月DD日(星期) HH:MM"
            "title": "公演名稱"
            "full_members": ["成員1", "成員2"] (🚨無論是否為變更通知，只要文章底部有完整列出「出演メンバー」全體名單，就必須全部提取。若文章內真的沒有全體名單，才留空 [])
            "added_members": ["代役成員"] (若有「出演/代打」成員)
            "removed_members": ["休演成員"] (若有「休演」成員)

            🚨【極度重要規則】：
            1. 如果文章包含同一天的日夜兩場(如13:00和17:30)，必須為「每一場」建立獨立 Object。
            2. 尋找「【休演】」字眼，將其成員放入 "removed_members"。
            3. 尋找「【出演】」字眼(且伴隨休演出現的代打)，將其放入 "added_members"。
            4. 名字必須去除空格，轉為日文漢字。
            5. 【標題強制統一】：無論原文寫法為何，"title" 必須強制統一為「XXX」公演 的格式。
            6. 不要將休館日、報名截止、非劇場活動轉成公演；沒有公演資料就輸出 []。
            7. 不要猜年份，使用文章或發布日期作準，並注意跨年。發布日期：{entry.get('published', '')}
            8. 如只寫全體成員或名單未公布，full_members 留空；不要把說明當成人名，也不要自行補名。

            內容：
            {blog_text}
            """
            
            try:
                ai_response = client.models.generate_content(
                    model=MODEL,
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )
                result_text = ai_response.text.strip()
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0].strip()
                
                new_data = json.loads(result_text)
                if not isinstance(new_data, list):
                    raise ValueError('Expected a JSON array')
                if new_data:
                    for item in new_data:
                        sched_id = item['id']
                        datetime.strptime(sched_id, '%Y%m%d_%H%M')
                        if not re.fullmatch(r'[0-9]{8}_[0-9]{4}', sched_id):
                            raise ValueError('Invalid schedule ID')
                        new_full = item.get('full_members', [])
                        added = item.get('added_members', [])
                        removed = item.get('removed_members', [])
                        
                        if sched_id not in all_data_map:
                            # 🌟 如果是全新遇到，有大名單就用大名單，無就用加減名單
                            all_data_map[sched_id] = {
                                "id": sched_id,
                                "date": item.get('date', ''),
                                "title": item.get('title', ''),
                                "members": new_full if len(new_full) >= 4 else list(set(added + new_full)),
                                "sources": [link]
                            }
                        else:
                            existing_members = all_data_map[sched_id].get('members', [])
                            
                            # 🌟 最強防呆與「有大食大」邏輯
                            # 如果 AI 成功抓到 >=4 人的名單 (代表文章底部有 official full list)，直接相信官方名單！
                            if len(new_full) >= 4:
                                all_data_map[sched_id]['members'] = new_full
                            else:
                                # 否則乖乖做加減數
                                curr_members = set(existing_members)
                                for rm in removed:
                                    curr_members.discard(rm)
                                for am in added:
                                    curr_members.add(am)
                                for am in new_full: # 防呆：如果 AI 偷懶將 1-3 個代打放入了 full_members
                                    curr_members.add(am)
                                all_data_map[sched_id]['members'] = list(curr_members)
                                
                        # 記錄 URL 來源
                        if 'sources' not in all_data_map[sched_id]:
                            all_data_map[sched_id]['sources'] = []
                        if link not in all_data_map[sched_id]['sources']:
                            all_data_map[sched_id]['sources'].append(link)
                            
                        print(f"✅ 更新成功：{sched_id} (目前人數: {len(all_data_map[sched_id]['members'])})")
            except errors.APIError as error:
                raise SystemExit(f'Gemini {MODEL} failed (HTTP {error.code}) for {link}; schedules.json was not changed.') from None
            except (ValueError, TypeError, KeyError, AttributeError) as error:
                raise SystemExit(f'Invalid Gemini response for {link} ({type(error).__name__}); schedules.json was not changed.') from None

# 5. 清理過期公演
jst = pytz.timezone('Asia/Tokyo')
today_str = datetime.now(jst).strftime('%Y%m%d')
filtered_schedules = [v for k, v in all_data_map.items() if k[:8] >= today_str]
filtered_schedules.sort(key=lambda x: x['id'])

# 6. 儲存
with open('schedules.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_schedules, f, ensure_ascii=False, indent=2)

print(f"💾 更新完成！目前有 {len(filtered_schedules)} 場公演。")
