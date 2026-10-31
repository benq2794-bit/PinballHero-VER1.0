const BOSS_ENTRANCE = { seq: -1, pending: false, elapsed: 0, duration: 2000, data: null };
function bossAppearanceName() {
    const names = { 'angeling.png': '天使波利', 'ghostring.png': '幽靈波利', 'deviling.png': '惡魔波利' };
    const file = (enemy.battleSkinUrl || '').split('/').pop();
    return names[file] || enemy.name;
}
function hideBossEntrance() {
    const data = BOSS_ENTRANCE.data;
    if (data && data.gate && data.freezeAt !== null && BOSS_ENTRANCE.seq === PF.foeSeq) {
        const stopped = Math.max(0, performance.now() - data.freezeAt);
        // Absolute clocks must also resume from where the entrance stopped them.
        for (const key of ['nextCastAt', 'stunUntil', 'slowUntil', 'paralyzeReady', 'gustReady']) {
            if (PF[key]) PF[key] += stopped;
        }
        if (PF.lastContact) PF.lastContact += stopped;
        if (PF.buff && PF.buff.until) PF.buff.until += stopped;
        (PF.members || []).forEach(m => { if (m.respawnAt) m.respawnAt += stopped; });
        (PF.burns || []).forEach(b => { b.at += stopped; });
        if (GATE.id) GATE.t0 += stopped;
    }
    BOSS_ENTRANCE.pending = false; BOSS_ENTRANCE.data = null;
    if (PF.el) PF.el.classList.remove('boss-entry-stop');
    const panel = $('boss-entrance');
    if (panel) { panel.classList.remove('on', 'leaving', 'gate-enter'); panel.setAttribute('aria-hidden', 'true'); }
}
function bossEntranceFreezesBattle() {
    return !!(BOSS_ENTRANCE.data && BOSS_ENTRANCE.data.gate && BOSS_ENTRANCE.seq === PF.foeSeq && enemy.boss && enemy.hp > 0);
}
function queueBossEntrance() {
    hideBossEntrance();
    if (!enemy.boss) return;
    BOSS_ENTRANCE.seq = PF.foeSeq; BOSS_ENTRANCE.pending = true; BOSS_ENTRANCE.elapsed = 0;
    const gate = gateOn();
    BOSS_ENTRANCE.duration = gate ? 2600 : 2000;
    BOSS_ENTRANCE.data = { name: bossAppearanceName(), image: enemy.battleSkinUrl, gate, freezeAt: gate ? performance.now() : null,
        floor: gate ? gateOf().gate : `無限波利塔 · 第 ${stage} 層`, element: enemy.element };
    if (gate) {
        if (PF.el) PF.el.classList.add('boss-entry-stop');
        const panel = $('boss-entrance'); if (panel) panel.classList.add('gate-enter');
    }
}
function updateBossEntrance(dtMs) {
    const data = BOSS_ENTRANCE.data;
    if (!data) return;
    if (BOSS_ENTRANCE.seq !== PF.foeSeq || !enemy.boss || enemy.hp <= 0) { hideBossEntrance(); return; }
    const frame = $('pf-frame');
    if (PF.paused || !PF.ready || !PF.running || (frame && frame.style.display === 'none')) return;
    const panel = $('boss-entrance');
    if (!panel) return;
    if (BOSS_ENTRANCE.pending) {
        $('boss-entrance-floor').textContent = data.floor;
        $('boss-entrance-name').textContent = data.name;
        const element = ELEMENTS[data.element];
        const badge = $('boss-entrance-element'); badge.textContent = element.label + '屬性'; badge.style.color = element.color;
        const image = $('boss-entrance-image');
        image.hidden = !data.image; image.alt = data.name;
        image.onerror = () => { image.hidden = true; };
        if (data.image) image.src = data.image;
        panel.classList.remove('leaving'); void panel.offsetWidth;
        panel.classList.add('on'); panel.setAttribute('aria-hidden', 'false');
        BOSS_ENTRANCE.pending = false;
        SFX.tone(130, 70, .18, 'sine', .12, 0, .002);
        SFX.tone(390, 260, .12, 'triangle', .05, .06, .002);
    }
    BOSS_ENTRANCE.elapsed += dtMs;
    if (BOSS_ENTRANCE.elapsed >= BOSS_ENTRANCE.duration) hideBossEntrance();
    else if (BOSS_ENTRANCE.elapsed >= BOSS_ENTRANCE.duration - (data.gate ? 420 : 260)) panel.classList.add('leaving');
}
