// One physical pilot leads the party. Companions follow its recent path while
// retaining their own health, direct-hit sensors, skill energy and progression.
const PARTY_FORMATION = { pilot: null, body: null, points: [] };
function partyPilot() {
    const alive = PF.members.filter(m => !m.down && m.body);
    return alive.find(m => m.ch.id === teamIds[0]) || alive[0] || null;
}
function partyMovers() { const pilot = partyPilot(); return pilot ? [pilot] : []; }
function partyMotionBody(m) { const pilot = partyPilot(); return pilot ? pilot.body : (m && m.body); }

function partyTrailPoint(distance, head) {
    const points = PARTY_FORMATION.points;
    let left = distance;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        if (len < .001) continue;
        if (left <= len) return { x: a.x + dx * left / len, y: a.y + dy * left / len };
        left -= len;
    }
    const tail = points[points.length - 1] || head;
    const speed = Math.hypot(head.vx, head.vy);
    const ux = speed > 1 ? head.vx / speed : 0, uy = speed > 1 ? head.vy / speed : -1;
    return { x: tail.x - ux * left, y: tail.y - uy * left };
}

function syncPartyFormation(reset = false) {
    const pilot = partyPilot();
    if (!pilot) { PARTY_FORMATION.pilot = PARTY_FORMATION.body = null; PARTY_FORMATION.points = []; return; }
    const head = pilot.body, points = PARTY_FORMATION.points;
    const changed = PARTY_FORMATION.pilot !== pilot || PARTY_FORMATION.body !== head;
    if (reset || changed || (points[0] && Math.hypot(head.x - points[0].x, head.y - points[0].y) > 180)) {
        PARTY_FORMATION.points = [{ x: head.x, y: head.y }];
    } else if (!points[0] || Math.hypot(head.x - points[0].x, head.y - points[0].y) >= .8) {
        points.unshift({ x: head.x, y: head.y });
        if (points.length > 128) points.length = 128;
    }
    PARTY_FORMATION.pilot = pilot; PARTY_FORMATION.body = head;
    let index = 0;
    for (const m of PF.members) {
        const b = m.body;
        if (m.down || !b) continue;
        const follower = m !== pilot;
        if (b.partyFollower !== follower) {
            b.enemyContacts = new Map(); b.enemyContactSeq = PF.foeSeq;
        }
        b.partyFollower = follower;
        b.ball.classList.toggle('party-follower', follower);
        b.ball.classList.toggle('party-pilot', !follower);
        if (!follower) continue;
        // 間距 42 → 58：腳下的增益圖示列寬 46px，42 會讓下一隻的球體壓掉這一列。
        const p = partyTrailPoint(++index * 58, head);
        b.x = Math.max(b.r + 13, Math.min(W - b.r - 13, p.x));
        b.y = p.y;
        b.introDrop = !!(head.introDrop && b.y < BATTLE_BOUNDS.top + b.r);
        enforceHeroBattleCeiling(b);
        b.vx = head.vx; b.vy = head.vy; b.spin = head.spin;
        b.dashActiveMs = head.dashActiveMs || 0;
        // Only the physical pilot owns a charged Power Flip.
        if (b.powerFlip) clearPowerFlip(b);
    }
}

function checkPartyOutOfBounds() {
    const pilot = partyPilot();
    if (!pilot || pilot.body.y - pilot.body.r <= H + 26) return;
    for (const m of aliveMembers()) {
        const damage = Math.max(1, Math.round(hpMax(m.ch) * .06));
        memberStrike(m, damage, '隊伍掉出彈射場');
        if (!m.down) attachBall(m);
    }
    // 落球口就是陷洞：扣血之外還要吞掉連擊與強力彈射（規則寫在 index.html 的 outholeBite）
    outholeBite();
    syncPartyFormation(true);
}
