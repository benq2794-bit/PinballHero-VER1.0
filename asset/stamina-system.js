// 主帳號體力：離線回復、RANK 上限成長與入場消耗。
window.StaminaSystem = Object.freeze({
    INITIAL_MAX: 60,
    PER_RANK_STEP: 2,
    RANK_STEP: 5,
    MAX: 120,
    REGEN_INTERVAL_MS: 5 * 60 * 1000,
    GATE_COST: 8,
    maxAtRank(rank) {
        return Math.min(this.MAX, this.INITIAL_MAX + this.PER_RANK_STEP * Math.floor(Math.max(1, Number(rank) || 1) / this.RANK_STEP));
    },
    regenerate(value, tickAt, rank, now = Date.now()) {
        const max = this.maxAtRank(rank);
        let current = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
        let lastTick = Math.floor(Number(tickAt) || now);
        if (current >= max) return { value: max, tickAt: now, max, gained: 0 };
        const elapsed = Math.max(0, now - lastTick);
        const gained = Math.floor(elapsed / this.REGEN_INTERVAL_MS);
        if (gained > 0) {
            current = Math.min(max, current + gained);
            lastTick = current >= max ? now : lastTick + gained * this.REGEN_INTERVAL_MS;
        }
        return { value: current, tickAt: lastTick, max, gained: current - Math.max(0, Math.min(max, Math.floor(Number(value) || 0))) };
    }
});
