# 程式分工

這份清單記錄目前已接入遊戲的模組，修改功能時先從對應檔案開始。

## 資料與純公式

- `asset/game-data.js`：角色名冊、技能目錄與動作數值、五型天賦節點、職業／屬性規則、戰鬥平衡、關卡／Boss、轉蛋、養成、UI 標籤及素材路徑。
- `asset/damage-formulas.js`：技能傷害、暴擊率、BREAK 增傷與受到傷害的數值計算。
- `asset/progression-formulas.js`：主帳號 Rank 經驗門檻、屬性配點成本與全隊加成。
- `asset/reward-formulas.js`：存活隊員經驗分配、結晶與碎片數量。
- `asset/save-system.js`：存檔欄位、儲存讀寫、舊資料轉換及載入前的資料整理。

純公式只回傳結果；呼叫它們不應播放動畫、改存檔或寫日誌。

## 戰鬥與角色功能

- `asset/skill-system.js`：五種職業技能的施放邏輯、角色技能覆寫與技能目錄建構。
- `asset/battle-lifecycle.js`：暫停／恢復、戰鬥計時、換場取消與一次性結算權。
- `asset/battle-settlement.js`：波利塔、異界和訓練場的發獎分流及異界訊息收據。
- `asset/type-effects.js`：五種攻擊型態的被動啟用條件，以及 PF、直擊、弱點、FEVER 共用的被動效果數值。
- `asset/ui-router.js`：頁面切換、共用返回主頁與彈窗關閉路由。
- `asset/combat-rules.js`：取得目前戰鬥增益，再交給傷害公式計算。
- `asset/enemy-wave.js`：場上敵人、獨立血量與範圍／射線目標查詢。
- `asset/fx/power-flip.js`：PF 觸發、型態被動效果與碰撞判定。
- `asset/character-growth.js`：夥伴升級、上限解放、角色天賦與培養介面。
- `asset/type-talents.js`：依攻擊型態分組的五條天賦車道與自動生效的被動。
- `asset/party-formation.js`：隊伍編成與場上角色的組織。
- `asset/gate-browser.js`：異界關卡列表。

技能模組建立時，由主程式傳入命中、位移、治療、充能、時間與狀態讀取介面。
新增角色例外技能放在 `byUnit`，共用職業技能放在 `byRole`。
技能動畫、能量消耗與施放佇列仍由主程式控制。

## 主程式仍負責的工作

`index.html` 仍有初始化、共享戰鬥狀態、物理主循環、HTML 樣板與技能演出。
頁面、結算與職業效果由模組管理，主程式提供 DOM 操作、當前狀態與存檔等介面。
存檔流程由主程式收集狀態，再交給存檔模組；讀取時先整理完整資料，再一次套用至遊戲。
目前已分離資料、主要公式、技能機制、存檔格式、戰鬥生命週期、路由、結算與型態效果。
其餘舊模組仍會讀取共享變數；後續拆分時應逐步改成明確傳入依賴。

`game-data.js` 必須在讀取 `GAME_DATA` 的功能模組之前載入。調整數值或素材時，先改資料表；流程模組保留判定、狀態轉換與畫面更新，不再另外複製一份設定。

## 戰鬥生命週期與結算

`battleLifecycle` 統一更新 `PF.paused` 和 `PF.running`，保留這兩個欄位供現有物理模組讀取。
多段技能和死亡後的 500ms 延遲使用戰鬥計時器；暫停、開場與技能演出期間不倒數。
`spawnFoe()` 會使上一場的待執行動作失效，不能把傷害或獎勵帶到下一場。
完整重開、退出關卡與樓層重試共用 `resetBattleTransient()`，清除技能演出、佇列、
增益、DOT、弱點／BREAK、PF、FEVER 和職業暫態，再由各入口恢復隊員與關卡。
一般暫停會補回絕對時間的讀條與狀態期限，避免恢復時一次觸發堆積傷害。

每場敵人擊倒和異界獎勵各有一次性領取權；重複呼叫不能重複發獎。
母頁只接受當前 iframe 與當前關卡的訊息，同一擊破次數只入帳一次。
訓練場只排程重置，不走經驗、掉落或戰績發放。
ESC 和返回主頁走同一條路由；結算與超時畫面不能被 P 鍵解除暫停。

## 存檔相容

保留儲存鍵 `wf_local_save_v5` 和內容版本 `v: 6`，不更換玩家原本的存檔位置。
角色的暫時生命與技能能量不寫入存檔，讀取時沿用原有恢復規則。
天賦點依 Rank 里程碑減去已學點數重算；天賦樹改以攻擊型態為 key，舊存檔以職業為 key 的等級讀入即歸零、點數全額返還。角色養成版本仍走相容轉換。
獨立異界關卡的寫入限制保留在主程式，讀取失敗不會自動刪除原始存檔。

## 載入與驗證

本專案使用一般 script，模組必須在主程式初始化前載入，新增檔案需同步加入 `index.html`。
技能改動可執行 `node tests/skill-system.test.cjs`；養成和傷害整合分別使用
`node tests/character-growth.test.cjs` 與 `node tests/enemy-wave.test.cjs`。
存檔改動使用 `node tests/save-system.test.cjs`，涵蓋正常往返、舊資料轉換、
儲存錯誤、讀取中途失敗與獨立關卡禁止寫入的整合流程。
`node tests/battle-flow.test.cjs` 驗證暫停計時、換場取消、重複發獎、路由與職業被動門檻。
`node tests/run-all.cjs` 一次執行全部 15 份程式測試。
`node tests/browser-smoke.cjs` 使用獨立暫存 Chrome 資料夾檢查真實頁面啟動、分頁、
ESC、技能重開清理、結算及 iframe 訊息收據；可用 `CHROME_PATH` 指定 Chrome。
瀏覽器檢查封鎖外部素材連線，驗證本機程式互動，不代表素材站連線或視覺外觀驗收。
部署需另外執行，不會由測試自動發布。
