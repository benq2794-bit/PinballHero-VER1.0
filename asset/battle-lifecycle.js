// 戰鬥生命週期：共用暫停入口、可取消的戰鬥計時與每場只執行一次的結算。
window.BattleLifecycle = Object.freeze({
    create({ getState, now, isIntro = () => false, isCinematic = () => false, onResume = () => {} }) {
        let generation = 0, pausedAt = null, tasks = [], claimed = new Set();
        function phase() {
            const state = getState();
            if (state.paused) return 'paused';
            if (!state.running) return 'defeated';
            if (isIntro()) return 'intro';
            if (isCinematic()) return 'skill';
            return 'play';
        }
        return Object.freeze({
            phase,
            setPaused(value) {
                const state = getState(), paused = !!value;
                if (state.paused === paused) return false;
                state.paused = paused;
                state.holdL = state.holdR = false;
                if (paused) pausedAt = now();
                else {
                    const duration = pausedAt === null ? 0 : Math.max(0, now() - pausedAt);
                    pausedAt = null;
                    state.last = now();
                    if (duration) onResume(duration);
                }
                return true;
            },
            setRunning(value) { getState().running = !!value; },
            invalidate() {
                generation++; tasks = []; claimed = new Set();
                // 暫停中建立新場景時，新計時只需補上建立後的暫停時間。
                if (pausedAt !== null) pausedAt = now();
            },
            claimOnce(key) {
                if (claimed.has(key)) return false;
                claimed.add(key);
                return true;
            },
            schedule(delay, callback, valid = () => true) {
                const task = { left: Math.max(0, delay), callback, valid, generation, canceled: false };
                tasks.push(task);
                return () => { task.canceled = true; };
            },
            advance(dtMs) {
                if (phase() !== 'play') return;
                const batch = tasks;
                tasks = [];
                for (const task of batch) {
                    if (task.canceled || task.generation !== generation || !task.valid()) continue;
                    task.left -= Math.max(0, dtMs);
                    if (task.left <= 0) task.callback();
                    else tasks.push(task);
                }
            }
        });
    },
    shiftDeadlines(state, ms) {
        for (const key of ['nextCastAt', 'stunUntil', 'specialSlowUntil',
            'lastContact', 'breakUntil']) if (state[key]) state[key] += ms;
        if (state.weak) state.weak.at += ms;
        if (state.buff?.until) state.buff.until += ms;
        if (state.aura) { state.aura.at += ms; state.aura.until += ms; }
        if (state.doomFX) { state.doomFX.until += ms; state.doomFX.nextShakeAt += ms; }
        for (const burn of state.burns || []) burn.at += ms;
        for (const unit of [...(state.enemyUnits || []), ...(state.summonedFoes || [])]) {
            for (const key of ['statusSlowUntil', 'statusStunUntil', 'statusGustFxUntil', 'statusParalyzeReady', 'statusGustReady']) {
                if (unit[key]) unit[key] += ms;
            }
        }
        for (const member of state.members || []) {
            if (member.ch?._fighterShockReadyAt) member.ch._fighterShockReadyAt += ms;
            for (const key of ['_knightFloatUntil', '_rangerPierceUntil']) {
                if (member.body?.[key]) member.body[key] += ms;
            }
        }
    }
});
