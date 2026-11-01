// Reserve the entire top strip for HUD and combo, even while combo is hidden.
const BATTLE_BOUNDS = { top: 176 };
function refreshBattleBounds() {
    if (!PF.el) return;
    const field = PF.el.getBoundingClientRect();
    if (!field.width || !PF.el.offsetWidth) return;
    const scale = field.width / PF.el.offsetWidth;
    let bottom = 176;
    for (const node of [PF.el.querySelector('.pf-hud'), $('pf-combo-chip')]) {
        if (!node) continue;
        const box = node.getBoundingClientRect();
        if (box.height) bottom = Math.max(bottom, (box.bottom - field.top) / scale + 8);
    }
    BATTLE_BOUNDS.top = bottom;
}
function battleUnitTop(b) {
    const classes = b.ball && b.ball.classList;
    const frames = classes && classes.contains('frames');
    const boss = classes && classes.contains('boss');
    const alpha = classes && classes.contains('alpha-art');
    // Include the small health bar and any oversized boss artwork/outline.
    // alpha-art 的本體長到中心上方約 115～130px，血條再抬 64～91px，這截要一併留給它。
    const extent = Math.max(b.r + 12, frames ? b.r * 1.36 + 4 : 0, boss ? b.r + 16 : 0,
        frames ? b.r + 26 : 0, alpha ? b.r * 3.2 : 0);
    return BATTLE_BOUNDS.top + extent;
}
function enforceBattleCeiling(b) {
    if (!b) return;
    const ceiling = battleUnitTop(b);
    if (b.y >= ceiling) return;
    b.y = ceiling;
    if (b.vy < 0) b.vy = -b.vy * PHYS.wallRest;
    if (b.ky < 0) b.ky = 0;
}
