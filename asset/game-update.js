/* 更新控制器不接觸遊戲存檔格式，存檔與安全時機由主程式提供。 */
// 版本檢查間隔：5 分鐘（原為 10 秒）。切回分頁時仍會立即檢查一次，發現新版後的 30 秒倒數不受影響。
const GAME_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
window.GameUpdate = Object.freeze({
    create({ release, storage, fetchVersion, safeReason, save, hold, navigate, render,
        showNotes, now = Date.now, timers = window, pollMs = GAME_UPDATE_CHECK_INTERVAL_MS }) {
        const seenKey = 'pinball-update-seen';
        const attemptKey = 'pinball-update-attempt';
        let target = null, deadline = 0, error = '', saving = false, reloading = false;
        let checking = false, pendingNotes = false, pollTimer = null, tickTimer = null, inflight = null;
        // 同一時間最多只有一個 version.json 請求：進行中時，其他呼叫端直接共用它的結果。
        const latestVersion = () => inflight || (inflight = (async () => fetchVersion())().finally(() => { inflight = null; }));
        const read = key => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
        const write = (key, value) => storage.setItem(key, JSON.stringify(value));
        const valid = value => value && typeof value.id === 'string' && value.id.length > 0 &&
            typeof value.version === 'string' && value.channel === 'production' &&
            value.app === release.app && Number.isFinite(Date.parse(value.builtAt));
        function state() {
            return { target, seconds:Math.max(0, Math.ceil((deadline - now()) / 1000)),
                reason:target ? safeReason() : '', error, saving, reloading };
        }
        function display() { render(state()); }
        function notes() {
            if (!pendingNotes || safeReason()) return;
            if (showNotes()) {
                write(seenKey, { id:release.id, version:release.version });
                pendingNotes = false;
            }
        }
        async function check() {
            if (checking || saving || reloading) return;
            checking = true;
            try {
                const next = await latestVersion();
                if (!valid(next) || next.id === release.id ||
                    Date.parse(next.builtAt) < Date.parse(release.builtAt)) return;
                if (target && Date.parse(next.builtAt) < Date.parse(target.builtAt)) return;
                if (!target) deadline = now() + 30000;
                target = next;
                const attempted = read(attemptKey);
                if (attempted?.from === release.id && attempted.to === next.id)
                    error = '尚未取得新版頁面，已停止自動重試。請確認網路後按「重試更新」。';
                display();
            } catch { /* 暫時離線時保留目前遊戲與倒數，不把網路失敗當成新版。 */ }
            finally { checking = false; }
        }
        async function update(manual = false) {
            if (!target || saving || reloading || error && !manual) return false;
            if (manual) { error = ''; deadline = now(); }
            if (safeReason()) { display(); return false; }
            saving = true;
            display();
            let releaseHold;
            try {
                const latest = await latestVersion();
                if (!valid(latest) || Date.parse(latest.builtAt) < Date.parse(release.builtAt)) throw new Error('無法確認正式版本，請稍後重試。');
                if (latest.id === release.id) {
                    target = null; error = ''; return false;
                }
                target = latest;
                if (safeReason()) return false;
                releaseHold = hold();
                await save();
                if (safeReason()) throw new Error('遊戲狀態已改變，請在安全時機重試更新。');
                write(attemptKey, { from:release.id, to:target.id });
                reloading = true;
                display();
                navigate(target.id);
                return true;
            } catch (failure) {
                error = failure?.message || '存檔未完成，已停止自動更新。';
                reloading = false;
                return false;
            } finally {
                saving = false;
                if (!reloading) releaseHold?.();
                display();
            }
        }
        function tick() {
            try { notes(); } catch { /* 無法記錄已讀狀態時不反覆開啟日誌。 */ pendingNotes = false; }
            if (target && !error && !saving && !reloading && now() >= deadline) void update();
            display();
        }
        function start() {
            if (release.channel !== 'production' || pollTimer !== null) return;
            const seen = read(seenKey), attempted = read(attemptKey);
            if (seen && seen.version !== release.version || attempted && attempted.from !== release.id) {
                pendingNotes = seen?.version !== release.version;
                if (attempted) storage.removeItem(attemptKey);
            } else if (!seen) {
                try { write(seenKey, { id:release.id, version:release.version }); } catch { /* 首次進入不強制顯示日誌。 */ }
            }
            pollTimer = timers.setInterval(check, pollMs);
            tickTimer = timers.setInterval(tick, 1000);
            void check();
            tick();
        }
        function stop() {
            if (pollTimer !== null) timers.clearInterval(pollTimer);
            if (tickTimer !== null) timers.clearInterval(tickTimer);
            pollTimer = tickTimer = null;
        }
        return Object.freeze({ start, stop, check, tick, update, state });
    }
});

function renderGameUpdateNotice(state) {
    let card = document.getElementById('game-update-notice');
    if (!state.target) { if (card) card.hidden = true; return; }
    if (!card) {
        card = document.createElement('aside');
        card.id = 'game-update-notice';
        card.setAttribute('aria-label', '彈射之境版本更新');
        card.innerHTML = '<div class="release-notice-heading">🔔《彈射之境》版本更新</div><b>✨ 全新版本已發布！</b><p class="release-notice-copy">系統將於 30 秒後，在存檔完成且安全時自動更新。</p><div class="release-notice-countdown">⏳ 更新倒數 <strong aria-live="off"></strong></div><p class="release-notice-status" role="status"></p><button type="button" onclick="gameUpdater.update(true)">立即更新</button>';
        document.body.appendChild(card);
    }
    card.hidden = false;
    card.querySelector('strong').textContent = '00:' + String(state.seconds).padStart(2, '0');
    card.querySelector('.release-notice-status').textContent = state.error ||
        (state.saving ? '正在確認存檔，請稍候…' : state.reason ? state.reason : '可繼續操作，更新前會先保存資料。');
    const button = card.querySelector('button');
    button.disabled = state.saving || state.reloading;
    button.textContent = state.error ? '重試更新' : state.saving ? '儲存中…' : state.reason && !state.seconds ? '等待安全時機' : '立即更新';
}

let gameUpdater = null;
let gameUpdateQuiescing = false;

function gameUpdateSafeReason() {
    if (document.hidden) return '回到遊戲後，會在安全時機更新。';
    if (!document.getElementById('login-screen')?.hidden) return '登入與存檔初始化完成後再更新。';
    if (uiRouter.current() === 'battle' || gateBattleOpen || GATE_MODE) return '正在戰鬥，結束並返回主頁後才會更新。';
    if (growthOperationBusy || betaEventBusy || updateCompensationBusy || growthHoldRepeat || gachaAnimation ||
        pendingGoldSale || pendingSummonExchange || pendingBattleBoost ||
        document.querySelector('dialog[open],.gold-market-confirm-overlay,.ticket-confirm-overlay,#avatar-picker.on'))
        return '正在處理重要操作，完成後再更新。';
    if (cloudUser?.id && !cloudSaveReady) return '正在同步雲端存檔，完成後再更新。';
    return '';
}

async function saveForGameUpdate() {
    if (!saveGame()) throw new Error('本機存檔失敗，已停止自動更新。請確認儲存空間後重試。');
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved || !saveStore.read().ok) throw new Error('無法確認本機存檔，已停止自動更新。');
    const offlineRaw = localStorage.getItem(OfflineEarnings.KEY);
    if (offlineRaw) { try { JSON.parse(offlineRaw); } catch { throw new Error('離線收益存檔無法讀取，已停止更新並保留原資料。'); } }
    const offline = OfflineEarnings.touch(offlineStore.read(), Date.now());
    if (!offlineStore.write(offline)) throw new Error('離線收益存檔失敗，已停止自動更新。');
    const userId = cloudUser?.id;
    if (userId) {
        if (!cloudSaveReady) throw new Error('雲端存檔尚未就緒，已停止自動更新。');
        let timeout;
        try {
            await Promise.race([
                SupabaseCloud.flushSave(userId),
                new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('雲端存檔未確認完成，已停止更新。請稍後重試。')), 20000); })
            ]);
        } finally { clearTimeout(timeout); }
        if (cloudUser?.id !== userId) throw new Error('登入帳號已改變，請重新確認存檔後再更新。');
    }
    if (localStorage.getItem(SAVE_KEY) !== saved) throw new Error('存檔在更新期間改變，請重新確認後重試。');
}

function showLatestReleaseNotes() {
    let dialog = document.getElementById('release-notes-dialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'release-notes-dialog';
        dialog.setAttribute('aria-label', '最新版本更新日誌');
        document.getElementById('app-frame').appendChild(dialog);
    }
    dialog.innerHTML = renderUpdateLogEntry(UPDATE_LOG[0]) + '<form method="dialog"><button type="submit">關閉更新日誌</button></form>';
    dialog.showModal();
    return true;
}

function startGameUpdates() {
    if (gameUpdater) return;
    if (GATE_MODE || DEV_MODE || GAME_RELEASE.channel !== 'production' || (location.protocol !== 'https:' && !(location.protocol === 'http:' && ['localhost','127.0.0.1'].includes(location.hostname)))) return;
    gameUpdater = GameUpdate.create({
        release:GAME_RELEASE, storage:localStorage,
        async fetchVersion() {
            const url = new URL('version.json', location.href);
            url.search = '?check=' + Date.now();
            const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 8000);
            try {
                const response = await fetch(url, { cache:'no-store', signal:abort.signal });
                if (!response.ok) throw new Error('Version request failed');
                return await response.json();
            } finally { clearTimeout(timeout); }
        },
        safeReason:gameUpdateSafeReason, save:saveForGameUpdate,
        hold() {
            const paused = PF.paused;
            gameUpdateQuiescing = true;
            setPaused(true);
            return () => { gameUpdateQuiescing = false; setPaused(paused); };
        },
        navigate(id) {
            const url = new URL(location.href);
            url.searchParams.set('__release', id);
            location.replace(url.href);
        },
        render:renderGameUpdateNotice, showNotes:showLatestReleaseNotes
    });
    gameUpdater.start();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { void gameUpdater.check(); gameUpdater.tick(); }
    });
}
for (const name of ['click', 'pointerdown', 'keydown', 'submit']) {
    document.addEventListener(name, event => {
        if (!gameUpdateQuiescing) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
}