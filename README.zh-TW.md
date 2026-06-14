<div align="center">

# reviewport

### 在真實畫面上驗收 AI agent 的前端改動,再把要修的清單送回給 agent。

你的 agent 一口氣改了 40 個地方。**reviewport** 帶你逐筆走過每個改動——就在它 render 出來的位置——讓你幾秒內按下「正確」或「需修正」,再把待修清單一鍵送回 agent。

[![npm](https://img.shields.io/npm/v/reviewport.svg)](https://www.npmjs.com/package/reviewport)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)

[線上 Demo](https://kai012N.github.io/reviewport/) · [Manifest 規格](./docs/MANIFEST_SCHEMA.md) · [Agent 協定](./docs/AGENT_PROTOCOL.md) · [English](./README.md)

</div>

---

## 痛點

git diff 給你看的是**程式碼**,不會告訴你「這個改動最後落在畫面的哪裡、長得對不對」。當 AI agent 在前端改了幾十個地方,驗收就變成把每一段 diff 在腦中對應回畫面上的某個位置——或乾脆相信它說的「完成了」(但常常沒有)。

現有工具全都是**正向**的——*人點一個元素 → agent 去改*。reviewport 佔住沒人做的**反向**:**agent 先宣告它改了什麼,你逐筆在真實畫面上驗收。**

## 運作方式

```
agent 改完程式碼  →  產出 change manifest  →  reviewport 把審查側欄蓋到你的 live 站
                                                      ↓
        你逐筆走過:跳到該處、看到就地高亮、按 ✓ 或 ✗
                                                      ↓
            匯出 ✗ 清單  →  貼回 agent  →  重改  →  再來一輪
```

一份小小的 **change manifest**(`review-manifest.json`)描述每個改動:在哪個 route、改了什麼、怎麼在頁面上找到它。reviewport 把審查 overlay 注入你的 dev server,自動導航到每個改動、就地高亮,讓你標記。匯出同時有「人類可讀」與「機器可讀」兩種格式,所以 agent 能確定性地接著處理。

## 快速開始(零安裝)

你本來就有 dev server,把 reviewport 接在它前面:

```bash
# 1. 建一份起始 manifest(或讓你的 agent 產出——見下)
npx reviewport init

# 2. 在 dev server 前面跑 reviewport
npx reviewport proxy --target http://localhost:5173 --open
```

打開 proxy 後的網址,審查 overlay 就出現了。**不用下載 app、不改你的專案、不裝 extension、不用註冊帳號。**

沒有 dev server(只是一包靜態 HTML/CSS/JS)?直接 serve:

```bash
npx reviewport serve ./public --open
```

## 讓你的 agent 自己產出 manifest

重點是:**做出這些改動的 agent,自己描述這些改動。** reviewport 首發就支援 Claude Code,並提供任何 agent 都能遵守的可攜協定:

- **Claude Code** → 放入 [skill + hooks](./integrations/claude-code/)。它改完前端後會自動寫出 `review-manifest.json`,`Stop` hook 還能順手起 overlay。
- **Cline / Cursor / Aider / 任何 agent** → 加上 [integrations/](./integrations/) 裡約 20 行的規則,或直接把 [docs/AGENT_PROTOCOL.md](./docs/AGENT_PROTOCOL.md) 餵給你的 agent。契約很簡單:*交還之前,把每個使用者可見的改動寫一筆到 `./review-manifest.json`。*

manifest 是一份**開放、有版本的 schema**——見 [docs/MANIFEST_SCHEMA.md](./docs/MANIFEST_SCHEMA.md)。reviewport 是參考實作的 viewer;任何人都能產生或消費這個格式。

## Manifest 三種定位方式(`anchor.mode`)

| mode | 定位 | 適用 |
|---|---|---|
| `text` | 頁面上的可見文字(TreeWalker) | 文案、標籤、內容 |
| `code-marker` | render 出來的程式碼區塊中的某一行 | 文件、範例片段 |
| `look-here` | CSS selector + 一句人類提示 | 沒有文字可定位的 CSS／版面／視覺改動 |

## 指令

```
reviewport proxy --target <url> [--port 6173] [--manifest <path>] [--route-base <p>] [--open]
reviewport serve <dir>          [--port 6173] [--manifest <path>] [--open]
reviewport validate [manifest]
reviewport init [manifest]
```

manifest 會熱重載——agent 重寫它時,overlay 跟著更新。

## 現況

Pre-1.0(`0.x`)。CLI 與 overlay 今天就能用;manifest schema 與 agent 協定正朝 `1.0` 收斂,屆時成為穩定、有版本承諾的契約。1.0 之前可能有小幅 breaking change——請 pin 版本。特別歡迎對 **manifest 格式** 的回饋。

## 貢獻 / 授權

歡迎 PR——見 [CONTRIBUTING.md](./CONTRIBUTING.md)(採 DCO sign-off 與 Changesets)與 [行為準則](./CODE_OF_CONDUCT.md)。

[Apache-2.0](./LICENSE) © 2026 kai012N。專利授權是刻意的:reviewport 的定位是「可被安全採用為跨 agent 共用基礎設施」。
