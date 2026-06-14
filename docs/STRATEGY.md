> **命名更新(2026-06-14)**:本策略書草擬時的候選名為 `DiffSight`,最終定案為 **`reviewport`**(理由見 [DECISIONS.md](./DECISIONS.md) D3)。以下內文凡出現 `DiffSight` / `diffsight` 之處,請一律讀作 `reviewport`;第 5 節「命名建議」為當時的分析過程,保留作歷史紀錄。其餘策略結論(定位、產品形態、開源治理、行銷)皆仍適用。

# DiffSight 產品化策略總綱

> 給 kai012N(Jason)的決策版上市策略。本文為「最酷的專案」第四個專案的總綱;命名、套件名、license 名、程式識別字一律保留英文,其餘繁體中文。
> 來源:12-agent 策略分析(競品掃描含 web 查證、產品形態評比、模組化架構、開源治理、命名 + 真實 npm/GitHub 可用性查核、go-to-market),2026-06-14。

---

## 1. 一句話定位

- **zh-TW**:「AI 改了一大包前端,DiffSight 讓你在真實畫面上逐筆驗收每個改動落在哪、長得對不對,再把要修的清單一鍵送回 agent。」
- **EN**:「DiffSight is the verification half of the AI-frontend loop: it takes any agent's change manifest and walks you through every edit right where it renders in your live UI — approve or flag each, then send the fix-list back to the agent.」

定位的關鍵字不是「annotation」,而是 **verification**。整個市場目前都在做「人指 → agent 改」的正向回饋;我們做的是還沒人佔住的反向:**agent 先宣告它改了什麼,人逐筆驗收**。對外永遠先講這個品類差異,名字其次。

---

## 2. 市場與差異化

**市場已被驗證、且正在熱起來。** Vibe Annotations、Agentation、Domscribe、DOM-Review、AgentClick 在 2025–2026 密集上線,證明「in-page + 接 agent」這個市場是真的;DEV.to/Substack 的「My AI Agent Said It Was Done. It Hadn't Done Anything.」、Show HN「verify it locally」、RDEL #129(約 70% agent PR 審查更慢或被拒)都在喊同一個痛點。需求是具體的。

**但他們全都做「正向」,沒人做「驗收」。** 這就是我們的縫隙。三個沒有任何競品同時具備的楔子:

1. **以 agent 自己產出的 manifest 為審查單位**(verification,不是 input)。
2. **真正 zero-install / zero-dependency 的 framework-agnostic 注入**(HTTP proxy,不用 extension、不用 bundler plugin、不用 Storybook、不用 SaaS)。
3. **agent-agnostic 開放協定 + Claude Code skill/hook 參考實作**,讓 Cline/Cursor/Aider 也能採用同一份 schema。

**最該認真看待的風險(按優先序):**

- **大廠吸收(頭號威脅)**:Cursor cloud agent 已會自動附 self-verification 截圖/影片到 PR。對策是**佔住開放、agent-agnostic 的 manifest schema**——一個標準比一個功能難被吸收——並在大廠動手前先把 Claude Code skill 做到最好。
- **訊息被稀釋**:買家可能分不清 verification vs annotation,把我們歸進同一堆。對策:展示永遠用「review agent 已經做完的事」的 manifest walkthrough,而非又一個 point-and-annotate demo。
- **競品低成本切進來**:Vibe Annotations 已是 framework-agnostic + MCP,加一個「review completed changes」模式並不難。我們的窗口期 = manifest 標準 + zero-dep 護城河,要快。
- **注入的可靠度是執行風險**:HTTPS/HMR websocket/CSP/SSR streaming 都可能弄壞 HTML 注入;anchor 在 agent 再次編輯或 HMR re-render 後會失效。**anchor 解析的穩健度是成敗關鍵**,必須有「找不到 → 退回跳到檔案」的優雅 fallback。
- **與 pixel-diff 互補而非取代**:我們驗「這就是那個改動、它落在這」,但不像 Percy/Chromatic 做整頁 pixel regression。定位成互補,別硬碰。

---

## 3. 產品形態建議(直接回答你的問題)

**你的問題是:「讓別人 drop-in、用 Skill 的方式叫起來,還是下載成 app?」**

**正面回答:兩者都不是單選,而是同一個 loop 的兩半,用一份共享 JSON schema 接起來。**

- **「檢視器(viewer)」= zero-install 的 `npx` 工具**——不用下載 app、不用改專案,在 dev server 前面起一個 proxy。
- **「產生器(producer)」= drop-in、Skill 式的那一半**——Claude Code skill + hook 自動在 agent 編輯後寫出 manifest。

**最終推薦:做分層 hybrid,但不要一次全做。** 架構從第一天就是「可分離的核心引擎 + 薄 adapter」,然後:

- **先出 zero-config `npx` 注入式 proxy** 當英雄產品與公開門面。
- **不要先做 Vite plugin**:它服務不了你自己那三個無 bundler 的靜態站(01-portfolio / 02-binoculars / 03-yushan 沒有 package.json,bundler plugin 物理上跑不起來,但 proxy 什麼都能服務),也排除多數非 Vite 使用者。
- **不要早做 browser extension**:CSP 會無聲擋掉注入、商店審查/權限驚嚇/MV3/各瀏覽器維護成本,換來的還是更差的 in-page 體驗。

**為什麼是這個答案(五個落地理由):** ① 你自己的三個專案就是 zero-dep 靜態站,proxy 才服務得了——產品必須能服務它自己的作者。② `npx` 一行零安裝零設定,本身就是行銷素材。③ in-page overlay + round-trip 正是 Percy/BrowserStack 做不到的護城河,proxy 保住 zero-runtime-dependency 賣點。④ 真正耐久的資產是 **manifest schema + anchoring/overlay 引擎**;bundler API(2026 的 Rolldown/Vite+)、Claude Code plugin API 都會 churn,所以它們屬於薄、可丟棄的 adapter,不屬於核心。⑤ 用 AGENTS.md(已是 Linux Foundation 標準,60k+ repo,Codex/Cursor/Copilot/Gemini/Aider/Windsurf/Zed 原生讀取)發佈協定,讓任何 agent 都能當 producer,Claude Code skill+hook 當高級 turnkey adapter。**分層不是更多工,對 solo maintainer 反而是更少的總維護**——每次 API churn 只碰一個薄 adapter,永遠不碰引擎。

---

## 4. 模組化架構

### 4.1 Manifest schema(keystone artifact)

檔名 `review-manifest.json`,versioned JSON,zero-dep 可驗。**頂層**:`schemaVersion`(必)、`generatedAt`(必)、`changes[]`(必)、`agent`/`task`/`baseUrl`/`defaults`(選)。**Change 物件**:`id`(必,唯一,localStorage 持久化用)、`route`(必)、`title`(必)、`category`(必,enum 可擴充)、`anchor`(必)、`before`/`after`/`severity`/`files`/`description`/`status`(選)。

**核心是 anchor 的三模式 discriminated union(`mode`)**:
- `text` — TreeWalker 找可見文字(`value`/`after`、`occurrence`、`selector` scope)。
- `code-marker` — 在 rendered code block 用 `marker` token 標行(`selector`、`lineHint`)。
- `look-here` — 自由文字「看這區」(`hint` 必、`selector`/`region` 選)。

**Anchor 優先序(協定強制):** `text` > `code-marker` > `look-here`。`status.state ∈ {pending, approved, rejected}`,export 收集所有 `rejected` 成貼回 agent 的 payload。未知 key/category 一律寬容(forward-compat),絕不因此 reject。

### 4.2 套件拆分(pnpm/npm-workspaces monorepo)

| 套件 | 職責 |
|---|---|
| `@diffsight/core` | 皇冠資產:framework-agnostic、**zero runtime deps** 的 overlay。manifest 解析、三個 anchor resolver、Shadow-DOM sidebar、auto-nav、highlight、localStorage、鍵盤導航、可拖曳面板、進度條、export。出 ESM source + 自帶 IIFE bundle 字串。 |
| `@diffsight/schema` | spec 變可執行:`MANIFEST.md` + `manifest.schema.json`(Draft 2020-12)+ 手刻 zero-dep `validate()` + 產生的 TS types。單一事實來源。 |
| `@diffsight/inject` | Node 注入層:`buildInjectionTags()`、`htmlInjector()`(所有 adapter 共用的字串轉換)、`createProxy()`(zero-dep node:http/https 反向代理,prototype 的產品化)。 |
| `@diffsight/cli` | 使用者入口:`diffsight proxy / serve / validate / init / open`。zero deps(node:util parseArgs)。 |
| `@diffsight/vite-plugin` | 第一方 Vite adapter,`vite` 僅 peerDep。`configureServer` + `transformIndexHtml`。後續 webpack/next/astro 的範本。 |
| `@diffsight/agent` | AI 整合層:`AGENT-PROTOCOL.md` + Claude Code plugin(`.claude-plugin/plugin.json`、skill、PostToolUse/Stop hook)+ Cline/Cursor/Aider 的 preset rules 檔。純 docs+JSON+shell。 |

### 4.3 File tree(精簡)

```
diffsight/                      # monorepo root
├── package.json  pnpm-workspace.yaml  tsconfig.base.json
├── LICENSE (Apache-2.0)  NOTICE  README.md  README.zh-TW.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  GOVERNANCE.md  SECURITY.md  MAINTAINERS.md
├── .github/{workflows/{ci,release,pages}.yml, ISSUE_TEMPLATE/*, CODEOWNERS, dependabot.yml}
├── docs/{MANIFEST_SCHEMA.md, AGENT_PROTOCOL.md, ANCHORING.md, ARCHITECTURE.md, DEVLOG.md, DECISIONS.md}
├── examples/{vitepress-design-system/, react-vite-app/}
└── packages/{core, schema, inject, cli, vite-plugin, agent}/
```

### 4.4 AI 整合設計(兩層)

- **(A) agent-agnostic 協定** `docs/AGENT_PROTOCOL.md`:契約是「改完前端、交還給人之前,把 manifest 寫到 `./review-manifest.json`,每個使用者可見的改動一筆」。因為只是寫一個固定路徑的 JSON 檔,協定**不需要 agent 提供任何 API**——任何能寫檔的工具都能遵守。Cline 給 `.clinerules`、Cursor 給 cursorrules snippet、Aider 給 `CONVENTIONS.md`(各約 20 行)。
- **(B) Claude Code plugin**(高級 turnkey):skill `diffsight-emit-manifest` 教 schema 與 anchor 優先序;`PostToolUse(Write|Edit)` hook 偵測前端編輯、非阻斷地提醒 agent 累積改動;`Stop` hook 在 manifest 存在時 validate 並起 `diffsight proxy`,讓 overlay 在 agent 一收手就備好。**Round-trip**:overlay export 出「These changes need fixing: c-3 …」格式,人貼回,skill 認得這格式 → 重改 → 重生 manifest,閉環。
- **round-trip 同時出機器可讀版**:export 除了 free text,也產出 machine-readable 的 rejected-list JSON 並寫進協定,讓 agent 能確定性解析。

---

## 5. 命名建議

**推薦:`DiffSight`,npm 套件 `diffsight`(unscoped)。**

可用性已查證:`diffsight` 在 npm 回 404(可用);GitHub 只有一個 0 星、無關的 `Rooteq/DiffSight`(差速輪機器人),實質可宣告。為什麼勝過其他候選:

- `PinView` — npm 可用,但 GitHub「pinview」topic 有 28 repo、多個高星(GoodieBag/Pinview ~824 星),雖全是 mobile、無 JS 衝突,但**辨識度差、SEO 不利**。淘汰當主名。
- `ShipSight` — npm 可用,但 GitHub org handle `ShipSight` 已被別人註冊(只能用你自己帳號當 owner)。能用但要避開那個 org。
- `ChangeLight` / `Overspect` — 都安全;`ChangeLight` 友善但和 changelog 工具語意混淆,`Overspect` 夠獨特但需要解釋。皆列為備案。

`DiffSight` 兼顧「開發者心智模型(diff)」+「看見它 render(sight)」、可唸、好記、跨 npm 與 GitHub 實質自由。**動作項:儘早註冊 npm `diffsight` + GitHub repo `kai012N/diffsight`**;若日後需要再保留 `@kai012n/diffsight` scoped fallback。

---

## 6. 開源治理

**License:採 `Apache-2.0`,不是 MIT。** 這是刻意的決策,要寫進 `DECISIONS.md`。理由:DiffSight 被定位成**跨廠商基礎設施**(一個要被 Claude Code/Cline/Cursor/Aider 採用、被企業 dev team 依賴的 manifest 標準 + 協定)。這正是 Apache-2.0 比 MIT 多的那一項——**明確的逐貢獻者專利授權 + 報復終止條款**——會 load-bearing 的場景:它給企業/OSPO 法務白紙黑字保證,沒有人能日後對 review-manifest 技法主張專利。Apache-2.0 是 agent/protocol 類 OSS 的事實標準(Kubernetes、OpenTelemetry、gRPC、多數 MCP 工具)。成本對 solo 很小:加 `NOTICE` + SPDX header + 要求 DCO sign-off(`git commit -s`)。zero-dependency 不受影響。

**Repo 信任檔案**:`LICENSE`(Apache-2.0,Copyright 2026 kai012N)、`NOTICE`、雙語 README(`README.md` + `README.zh-TW.md`)、`CONTRIBUTING.md`(含 DCO)、`CODE_OF_CONDUCT.md`(Contributor Covenant 2.1,聯絡 jason96350@gmail.com)、`SECURITY.md`(明說 proxy 會注入 `<script>`,XSS/manifest-as-untrusted-input 在範圍內,僅供本機 dev)、`GOVERNANCE.md`、`MAINTAINERS.md`、issue **forms**(.yml)、PR template、`CODEOWNERS`(`* @kai012N`)、`dependabot.yml`(只管 github-actions,守住 zero-dep)。

**分支與合併權限(你問的那一塊)**:**trunk-based,不是 git-flow**。單一受保護的 `main`(用 GitHub Ruleset)永遠可發佈。短命 `feat/`、`fix/`、`docs/` 分支,squash-merge 保持線性歷史。**修改權控制**:no direct push to main(連 admin 都被擋);內部成員(目前只有 kai012N)有 write、走 reviewed PR;**外部人一律 fork-and-PR——他們連 push branch 到 origin 都不行,只能 PR,能提案、不能合併**。Ruleset:require PR、require 1 approving review、require Code Owners review、dismiss stale approvals、require status checks pass + up-to-date、linear history、block force-push/deletion、require conversation resolution。Solo 例外的 emergency bypass 程序寫進 GOVERNANCE.md。

**CI(GitHub Actions,兩層)**:`ci.yml` 跑在 push main + 每個 PR(用 `pull_request` 而非 `pull_request_target`)。jobs over Node 20+22、ubuntu+windows:lint(Biome)、typecheck、test(manifest validator + 注入邏輯 + 每個 docs 範例 manifest 都驗過 schema)、build(**CI guard:`package.json` 有任何 runtime dependency 就 fail**——把 zero-dep 從口號變成強制不變量)、changeset check。第三方 action pin 到 commit SHA。

**Release:Changesets,不是 semantic-release。** `release.yml` 用 **npm trusted publishing(OIDC)**——無長壽 token 可外洩,public repo 自動產生 provenance attestation。**pre-1.0(0.x)** 標示 API 可能 break;**1.0 = 正式承諾 MANIFEST_SCHEMA 與 AGENT_PROTOCOL 穩定**。`pages.yml` 每次 merge 部署 live demo → `https://kai012n.github.io/diffsight/`(符合工作區「每專案必上線」約定)。

---

## 7. 0→1 路線圖

**Phase 0 — 抽核心(pre-launch,真正的產品化工)**
把硬編碼 manifest 從 proxy 拆出;定義並文件化 versioned manifest schema(keystone);重構 overlay 吃任意 manifest;保持 zero runtime deps;**現在就立治理**(Apache-2.0 LICENSE/NOTICE、CONTRIBUTING、CoC、trunk-based、SemVer、docs 站、DEVLOG/DECISIONS)。

**Phase 1 — 出英雄:zero-config `npx` proxy(可發佈的 v1)**
`npx diffsight proxy --target <devURL>` 注入通用 overlay;穩健 HMR/websocket pass-through + SPA-route 存活。此階段手寫 manifest 可接受。**在你自己的 01/02/03 三站 dogfood**,證明「靜態站也通用」,把它寫成上市故事。

**Phase 2 — 用 AI 層閉環(最強行銷節點)**
出 Claude Code skill+plugin(post-edit hook 自動生 manifest),上官方 + 社群 marketplace。**同時**發佈 agent-agnostic 協定(schema + AGENTS.md snippet),讓 Cline/Cursor/Aider/Codex 也能讓 agent 產同一份 manifest。

**Phase 3 — 用薄 adapter 擴張(需求驅動)**
有 Vite 使用者拉力後出 Vite plugin;出 bookmarklet 純當 try-it/demo 與審 deployed/staging URL。完整 browser extension 無限期延後。每個 adapter 都薄薄蓋在 Phase 0 核心上,都不碰引擎。

---

## 8. 行銷上市計畫

**核心素材(最重要的一個):~15s 英雄 GIF**,放 README 摺線以上。一鏡到底拍完整 loop:agent 改完 → 一行指令 → sidebar 蓋上 live 站 → 自動跳頁 + 就地高亮那句改動 → reviewer 按 ✗ needs-fix → 點 export → 把 fix-list 貼回 Claude Code 終端機。**「貼回 agent」那一格是 money shot——沒人展示過。** 配 60–90s 旁白 screencast + GitHub Pages live demo。

**上市時序:**
- **Pre-launch(T-3~T-1 週)**:repo hygiene、`npx` 一行可跑 + `/examples`、Claude Code skill+hook + 一頁協定 doc、錄 GIF/screencast、soft-seed(開 3–5 個 good-first-issue、找 2–3 人先 star)、預寫所有 launch copy。
- **Launch Day(週二~週四)**:09–11am ET(≈台灣晚上)發 **Show HN**,前 2–3 小時親自守留言;同日發 dev.to 文、X thread、進 Claude/Cline/Cursor Discord。Reddit 錯開:**先 r/ClaudeAI**,隔天 r/webdev,技術文留給 r/programming。同日對 awesome-claude-code / awesome-claude-plugins / awesome-claude-skills 送 PR。**Product Hunt 不要同日**。
- **Week 1**:PH(週二/三 12:01am PT);幾小時內回每個 issue/PR;發二波文;切 v0.1.0 tag。
- **Ongoing**:每 1–2 週小 release;依序加 Cline→Cursor→Aider 整合(各一則貼文);把 manifest schema 當「標準」推;Taiwan 場(COSCUP/SITCON/JSDC/Modern Web)→ 英文 CFP。

**最高槓桿管道 + 草稿:**
- **Show HN(主戰場)**,標題:`Show HN: Review your AI agent's code changes in the live UI, then send fixes back`。首則留言用你 DS26 真實故事開場(36 頁、90+ 改動、驗收撞牆),結尾請大家對 **manifest 格式**給回饋。
- **r/ClaudeAI(最暖,先發)**,標題:`I built a tool that lets you visually review every change Claude Code makes to your frontend — and paste the fixes back in one click`。
- **dev.to/Medium 技術長文**,標題:`I let an AI make 90 changes to my site. Then I built a way to actually review them.`
- **X thread**:第一則就放 GIF;agent 廠商 handle 放在回覆不放主推。

**真實性是護城河**:DS26 的「400+ 問題、90+ 修好、橫跨 36 頁」是你親身經歷的起源故事,別人抄不走。既有的「Claude Code 實戰——DS 優化案例」簡報加幾頁,把 DiffSight 當那個故事的「驗收章節」,一份素材兼做 conference talk。

**衡量指標**:GitHub stars(week1 100/強 500/breakout 1k+);HN 首小時 upvote + 留言是否討論 manifest 格式;referrer 拆分;**activation**(npx 執行數、demo 點擊深度);**round-trip 採用**(幾個 agent 有整合、有沒有外部工具產出我們的 schema)= 標準 play 的領先指標。

---

## 9. 待你決定的關鍵抉擇

1. **License:Apache-2.0 vs MIT。** 強烈建議 Apache-2.0(專利授權 = 跨廠商標準的關鍵);若你只想最快被 awesome-list 收 + 極簡,MIT 也站得住。這定調整個專案的野心高度。
2. **Manifest 路徑與多 agent 衝突策略:** 固定 `./review-manifest.json` vs 可設定;兩 agent 同時跑時按 `task.id` namespace 還是 last-write-wins。影響 schema 與協定。
3. **code-marker 是否允許 agent 注入 `// [diffsight:id]` 標記到原始碼**(換取可靠 anchor),approve 後是否自動清掉?可靠度 vs 原始碼污染的取捨。
4. **launch 第一個整合除了 Claude Code,要不要附第二個 agent(Cline/Cursor)?** 建議 launch 只出 Claude Code(turnkey)+ 協定 doc,Cline 留 Week-2。

---

*落地路徑:在 `/Users/jason/Documents/claude/最酷的專案/04-diffsight/`(新獨立 repo,符合工作區 `NN-英文名` 約定)起 Phase 0,並把第 6、9 兩節的決策寫進 `docs/DECISIONS.md`,過程記進 `docs/DEVLOG.md`。*
