import os
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai  # <--- 呢度就係最新版嘅魔法 Import！
import json

# 1. 從 GitHub Secrets 讀取 API Key (安全做法)
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("❌ 找不到 API Key，請檢查 GitHub Secrets 設定。")
    exit(1)

# 啟動全新 Gemini Client
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

if not target_post:
    print("✅ 今日無最新公演名單更新，提早收工！")
    exit(0)

print(f"🎯 發現目標文章：{target_post.title}")
print(f"🔗 網址：{target_post.link}")

# 3. 進入文章擷取純文字
print("📖 正在進入文章讀取內文...")
response = requests.get(target_post.link)
response.encoding = response.apparent_encoding
soup = BeautifulSoup(response.text, 'html.parser')

article_body = soup.find(attrs={"data-uranus-component": "entryBody"})
if not article_body:
    print("❌ 找不到文章內文")
    exit(1)

blog_text = article_body.get_text(separator="\n", strip=True)

# 4. 呼叫 Gemini AI 進行智能抽取
print("🧠 正在交由 Gemini AI 解析內文並抽取成員名單...")
prompt = f"""
你是一個專門解析 AKB48 官方 Blog 的智能助手。
請閱讀以下的 Blog 內文，提取出所有提及的「公演日程」、「公演名稱」以及「出演成員」。
要求：
1. 嚴格以 JSON 陣列格式輸出，不要包含任何 Markdown 標記 (如 ```json) 或多餘的文字。
2. 每個公演生成一個 Object。
3. "id" 欄位請用「日期_公演簡稱」的英文格式，例如 "20260415_boku"。
4. 成員名字請統一去除中間的空格（如「岩立 沙穂」改為「岩立沙穂」），並確保使用正確的日文漢字（如 黒、恵、歩、実、内、遥、姫、奥）。
5. 如果內文提到「休演」的成員，請不要將其列入 "members" 列表中。
6. 如果內文提到「一部出演」，請照樣列入。

Blog 內文如下：
{blog_text}
"""

try:
# 改用有龐大免費額度的 gemini-1.5-flash 模型
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=prompt,
    )
    result_text = response.text.strip()
    
    # 清理可能殘留的 markdown 標記
    if result_text.startswith("```json"):
        result_text = result_text.replace("```json", "").replace("```", "").strip()

    schedule_data = json.loads(result_text)
    print("✨ 成功解析出公演資料！")
    print(json.dumps(schedule_data, indent=2, ensure_ascii=False))
    
    # 5. 儲存並覆蓋 schedules.json
    with open('schedules.json', 'w', encoding='utf-8') as f:
        json.dump(schedule_data, f, ensure_ascii=False, indent=2)
    print("💾 已成功儲存至 schedules.json！")

except Exception as e:
    print(f"❌ AI 解析或 JSON 轉換失敗：{e}")
    exit(1)
