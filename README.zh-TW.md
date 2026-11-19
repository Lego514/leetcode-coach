# LeetCode Coach（刷題教練）

[English](README.md) · **中文**

幫忙準備美國軟體工程師面試的刷題教練。題目還是在 LeetCode 上寫，這個 App 負責寫題以外的事：決定今天練什麼、用 FSRS（Anki 用的排程演算法）排好每一題的複習、練習用英文把解法講清楚，並拿 AI 回饋。

<picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/tour-dark.gif"><img src="docs/images/tour-light.gif" alt="一天怎麼用：今天的計畫、照面試步驟計時練習、記錄寫得怎麼樣、用英文講解並拿五個重點的 AI 回饋、參考板書一步一步播放、進度頁的演算法樹"></picture>

**[用示範資料試用](https://coach.legoli.dev/?demo)**（六週編出來的練習紀錄，不用註冊）· **[白板範例](https://dsaboard.legoli.dev/#example=206)** · [English](README.md)

- **不只看自評的間隔重複**：FSRS-6，再依寫題時間、提示看到第幾層、卡在哪調整，每一個間隔都說得出為什麼。
- **本機優先的 PWA**：資料存在瀏覽器的 IndexedDB，離線也能用；登入後透過 Hono API 和 PostgreSQL 同步（outbox、last-write-wins）。
- **自己寫的開源白板**（[dsa-whiteboard](https://github.com/Lego514/dsa-whiteboard)，發佈在 npm）：在 Cloudflare Durable Objects 上即時共同編輯，213 題都有一步一步播放的參考板書。

網頁從 Cloudflare 送出，打開馬上就有。後端用免費方案，閒置一陣子會休眠，之後第一次登入或同步最多要等一分鐘讓它醒來；這段時間 App 照樣離線可用。示範連結只會在空的瀏覽器載入資料，只存在你的瀏覽器、不會同步，按「清除示範資料」就清掉。

## 能做什麼

照一天用的順序：

1. **今天**：列出到期的複習，和從 NeetCode 150、Blind 75、Grind 169（共 213 題、18 個模式）挑的新題，照你有的時間排。**面試衝刺**會排好到面試那天以前的每一天。
2. **練習**：在 LeetCode 寫題，這裡計時、照面試的七個步驟各寫一句想法，提示一層一層打開。
3. **記錄**：寫得怎麼樣、卡在哪。FSRS 排下一次複習，也寫出為什麼隔這幾天。
4. **講解**：用英文講一次解法（也可以打字）。Claude 依五個重點打分數、給更好的講法，還能扮演面試官追問。也可以用自己的 API 金鑰，或自己的 ChatGPT、Claude 對話。
5. **白板**：拖拉 20 多種資料結構把想法畫出來。每一題都有一步一步播放的參考板書，白板也能共用、一起編輯。
6. **行為面試**：用 STAR 寫故事，開口練習並拿 AI 回饋。
7. **微複習**：零碎時間用，一回合 5 張只要點的卡片，大約一分鐘。
8. **進度**：跟著練習長大、忘了會變黃的演算法樹，跟著連續天數長大的卡皮巴拉，依難度和公司看的準備度，以及講解能力的進步曲線。

不用帳號、離線都能用，登入後在不同裝置之間同步。整個 App 有繁體中文和英文。每一個功能的說明在 [docs/features.zh-TW.md](docs/features.zh-TW.md)。

<table>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/practice-dark.png"><img src="docs/images/practice-light.png" alt="計時練習，面試步驟一次一步"></picture><br><b>計時練習</b>：計時器、面試步驟一次一步，每一步寫一句；「我卡住了」「寫完了」隨時按得到。</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/whiteboard-dark.png"><img src="docs/images/whiteboard-light.png" alt="白板上 Longest Substring Without Repeating Characters 的滑動視窗模板"></picture><br><b>白板</b>：陣列、指標、視窗框和計數字典，一鍵放上模板。</td>
  </tr>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/ai-feedback-dark.png"><img src="docs/images/ai-feedback-light.png" alt="口頭講解的 AI 回饋，五個重點各有分數和參考講法"></picture><br><b>用英文講出來</b>：即時逐字稿，講完 Claude 依五個重點打分數並給參考講法。</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/explaining-dark.png"><img src="docs/images/explaining-light.png" alt="八次講解練習的分數曲線，和五個重點各講到幾成"></picture><br><b>講解能力</b>：每次練習的分數、五個重點各講到幾成、最常漏掉哪一個。</td>
  </tr>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/progress-dark.png"><img src="docs/images/progress-light.png" alt="進度頁的演算法樹：模式是樹枝，題目是葉子、果實和花"></picture><br><b>演算法樹</b>：模式是樹枝，會了的題目是葉子；快忘了會變黃，征服的題目結果實，熟練的模式開花。</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/capybara-day-dark.svg"><img src="docs/images/capybara-day-light.svg" alt="卡皮巴拉的一天：還沒練習在床上睡覺，打卡後用電腦，做完今天的目標就喝珍奶或泡溫泉"></picture><br><b>卡皮巴拉</b>：還沒練習時睡覺、陪你寫到做完今天的目標，再一起慶祝；會長大，也會收集頭飾。</td>
  </tr>
</table>

截圖用的是編出來的示範資料，跟著 GitHub 的淺色、深色主題換；畫面是英文介面。

## 技術上的重點

- **離線優先的同步**：每次寫入都在同一個交易裡存進 IndexedDB、記進待上傳清單（outbox）。一個 `POST /api/sync` 同時上傳和下載；每筆紀錄 last-write-wins，刪除留墓碑；伺服器的版本號來自 Postgres sequence，並在每個使用者的 advisory lock 下配發，下載的游標不會漏掉任何改動。複習排程不同步，從練習紀錄重播算出來。[同步怎麼做](docs/architecture.md#offline-first-sync)
- **有證據的排程**：照公式自己寫 FSRS-6，測試裡跟官方的 `ts-fsrs` 在幾百組隨機紀錄上比對；再用寫題時間、提示深度、卡在哪調整每一次，寫得不順的一週內再確認。畫面上的「為什麼隔這幾天」跟排程用同一份程式。[複習排程](docs/scheduling.md)
- **白板發佈成套件**：[dsa-whiteboard](https://github.com/Lego514/dsa-whiteboard) 不用任何繪圖函式庫，從 GitHub Actions 帶 provenance 發佈到 npm；共用的房間一個 Cloudflare Durable Object。213 題的參考板書，測試會檢查每一步都照參考講解的順序。
- **有防護的 AI**：Claude Opus 5.5 用 JSON schema 輸出結構化結果，伺服器有允許名單和每人每天的額度。同一份提示詞和 schema（`shared/ai.ts`）也在瀏覽器裡配使用者自己的金鑰跑，金鑰不會送到伺服器。
- **安全**：scrypt 雜湊密碼、只存 session token 的雜湊、`__Host-` cookie、用 Content-Type 和 Origin 擋 CSRF、限流、用 PKCE 的 GitHub 登入，每一種同步的紀錄都有 zod schema 檢查。[安全](docs/architecture.md#security)
- **照正式環境測**：Playwright 對正式建置和真的 PostgreSQL 17，在 Chromium 和 iPhone WebKit 上跑，用假的 GitHub 測 OAuth，也測兩個瀏覽器互相同步；CI 還會建 Docker 映像、對跑起來的容器測。
- **免費方案也秒開**：網頁由 Cloudflare Workers 從邊緣送出，`/api` 由一個小 Worker 在同一個網址轉給 Render 上的 Node API，只有登入和同步要等免費的伺服器醒來。

技術選擇的表在英文 README 的 [Tech stack](README.md#tech-stack)，每一項的理由在 [docs/architecture.md](docs/architecture.md#tech-stack-in-detail)。

## 本機執行

需要 Node 24。不用另外裝資料庫，開發時用內建的 PGlite。

```bash
npm install
npm run dev    # 網頁 http://localhost:5173，API http://localhost:8787
npm test       # 單元、API 和兩台裝置同步的測試
```

`docker compose up --build` 會把正式版和 PostgreSQL 一起跑在 http://localhost:8080。

## 文件

- [功能](docs/features.zh-TW.md)：每一個功能的說明
- [開發和部署](docs/deploying.zh-TW.md)：本機開發、Docker、部署到 Render、Neon、Cloudflare，和選用的服務
- 英文的技術文件：[Architecture](docs/architecture.md)（程式結構、同步、資料模型、安全）、[Review scheduling](docs/scheduling.md)、[Development](docs/development.md)、[Deploying](docs/deploying.md)、[Data and privacy](docs/privacy.md)
