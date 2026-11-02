// 結算流程只呼叫明確傳入的動作；發獎前先取得本場的一次性領取權。
// 評級只量「相對於該門速度滿分線的快慢」：傷害已經進總分了，再用它抬評級就是同一件事算兩遍。
const ratingOf = (ms, parMs) => {
    const ratio = ms / parMs;
    if (ratio <= 0.6) return "SS";
    if (ratio <= 0.85) return "S";
    if (ratio <= 1.15) return "A";
    if (ratio <= 1.6) return "B";
    return "C";
};
window.BattleSettlement = Object.freeze({
    create({ getState, lifecycle, splitExperience, actions }) {
        return Object.freeze({
            resolveWave() {
                const s = getState();
                if (s.enemy.hp > 0 || !lifecycle.claimOnce('wave-reward')) return false;
                actions.playVictory();
                if (s.training) {
                    actions.trainingNotice();
                    const seq = s.seq;
                    lifecycle.schedule(500, actions.resetTraining, () => {
                        const next = getState(); return next.training && next.seq === seq;
                    });
                    return true;
                }
                // 戰鬥經驗只供主帳號 RANK 使用；彈射角色改由培養道具取得角色經驗。
                const exp = Math.max(0, s.enemy.expReward);
                actions.gainRankExp(exp);
                if (s.gate) {
                    const seq = s.seq, gate = s.gate;
                    lifecycle.schedule(500, actions.gateVictory, () => {
                        const next = getState(); return next.gate === gate && next.seq === seq && next.enemy.hp <= 0;
                    });
                    return true;
                }
                actions.settleTower();
                return true;
            },
            resolveGate() {
                const s = getState(), gate = s.gateDefinition;
                if (!gate || s.training || s.enemy.hp > 0 || !lifecycle.claimOnce('gate-reward')) return false;
                const win = (s.bossWin[gate.id] || 0) + 1, first = win === 1;
                const ms = Math.max(1, Math.round(s.now - s.startedAt));
                const dmg = Math.max(0, Math.round(s.damage - s.damageStart));
                const shards = first ? gate.shards : gate.replay;
                // 結算的「分」是把實打傷害、時間剩下的額度、結晶與首通疊起來；
                // par（速度滿分線）由關卡表給，評級也照它算，才不會每道門都拿同一把尺量。
                const parMs = Math.max(1, (gate.par || 60) * 1000);
                const timeBonus = Math.round(Math.max(0, parMs - ms) * 1.5);
                const score = dmg + timeBonus + shards * 400 + (first ? 20000 : 0);
                const record = (s.gateRecord || {})[gate.id] || {};
                const result = {
                    gate: gate.gate, boss: s.enemy.name, el: gate.el, first,
                    shards, win, ms, parMs, timeBonus, score, rating: ratingOf(ms, parMs),
                    // 「打敗自己」要有前一筆可比：第一次破關只是立紀錄，不標 NEW RECORD
                    prevMs: record.ms || 0, prevScore: record.score || 0,
                    recordTime: (record.ms || 0) > 0 && ms < record.ms,
                    recordScore: (record.score || 0) > 0 && score > record.score,
                    sec: Math.max(1, Math.round(ms / 1000)),
                    dmg, hp: s.enemy.maxHp
                };
                actions.applyGateReward(gate, result);
                actions.recordGate(gate.id, ms, score);
                actions.showGateResult(result);
                actions.save();
                actions.publishGateResult(gate, result);
                return true;
            }
        });
    },
    // 母頁每次開窗都建立新收據表；同一場結果訊息只入帳一次。
    acceptGateReceipt(receipts, data) {
        const win = Math.max(0, Math.floor(+data.win) || 0), previous = receipts.get(data.gate) || 0;
        if (!win || win <= previous) return false;
        receipts.set(data.gate, win);
        return true;
    },
    // 用時與分數各比各的：慢但打得狠的一場可以只刷新最高分，不會把最快時間一起蓋掉。
    mergeRecord(record, id, ms, score) {
        if (!record || !id) return { time: false, score: false };
        const current = record[id] || { ms: 0, score: 0 };
        const next = { ms: current.ms || 0, score: current.score || 0 };
        const time = ms > 0 && (!next.ms || ms < next.ms);
        const better = score > 0 && score > next.score;
        if (time) next.ms = ms;
        if (better) next.score = score;
        if (time || better) record[id] = next;
        return { time, score: better };
    }
});
