// Each character owns a visual recipe. These effects never modify combat state.
const SKILL_SIGNATURES = Object.fromEntries(`
alchemist|緋紅鍊成陣|flask|burst|6
pretty_witch|莓星魔法|star|spiral|7
gunslinger|沙漠六連星|bullet|volley|6
monster_hunter|獵人追蹤箭|arrow|volley|3
black_doctor|赤色救護|cross|rise|4
cool_woman_soldier|赤咒刃痕|slash|cross|3
berserker|狂戰崩裂|shard|burst|8
fire_shaman|焰羽祭儀|flame|orbit|7
disciplined_swordman|裁決一閃|slash|volley|1
birdwoman|紅羽穿雲|feather|volley|5
tradition_healer|暖陽調和|petal|rise|6
brave_mouse|小鼠追虎斬|slash|spiral|3
sewing_girl|幸福縫線|thread|orbit|5
wolf_assassin_wt21|甜蜜獠牙|heart|cross|4
sniper|林間狙擊|target|volley|2
urban_soldier|蒼藍劍舞|slash|cross|4
hard_face_soldier|重盾震波|shield|burst|3
nurse|白袍急救|cross|rise|7
wolf_assassin|霜牙連襲|claw|cross|3
fox_companion|狐火祈願|flame|spiral|5
depraved_monk|醉月流觴|drop|orbit|6
sailor_girl|航海流星|anchor|volley|3
cute_fafnir|幼龍泡泡|bubble|rise|8
mens_attire_girl|靈泉圓舞|drop|spiral|6
dryad_xm19|冬青祝禱|leaf|rise|7
junior_yearngirl|新星劍誓|star|cross|3
little_shaman|潮汐祭歌|rune|orbit|5
scout_girl|偵察水彈|bullet|volley|5
twin_blader|雙刃雷閃|slash|cross|2
bee_girl|蜂巢雷針|hex|volley|6
lightning_fighter|迅雷破拳|bolt|burst|5
outlaw_panther|黑豹奔雷|claw|volley|4
wolf_swordsman|狼牙雷刃|claw|cross|2
oni_girl|風雷鼓舞|bolt|orbit|6
sociable_mestizo|微醺雷舞|drop|cross|5
magic_boy|雷紋法陣|rune|spiral|6
student_gunsmith|超頻校準|gear|orbit|3
fortuneteller|命運星盤|star|orbit|8
cat_fighter_ny20|賀歲招福|coin|burst|7
old_mercenary|鐵人重斬|shield|cross|3
floating_girl|失重星環|bubble|orbit|5
conjurer_girl|雨日雷咒|drop|rise|8
highlander|高原裂風|slash|burst|4
dryad|森靈新芽|leaf|rise|8
lich|幽魂守望|rune|rise|4
casino_dealer|命運洗牌|card|spiral|6
cat_fighter|貓爪旋風|claw|spiral|4
devil_clown|彩戲飛刃|diamond|volley|7
herbalist|春風藥園|petal|rise|8
spearman|疾風穿刺|arrow|volley|1
trap_errand|牧場捕網|thread|burst|6
gang_girl|義賊掠影|slash|volley|3
lazy_genious|風之演算|hex|orbit|4
rookie_adventurer|啟程之刃|star|volley|2
priest|愛之聖禱|cross|orbit|6
lady_gunner|華麗禮炮|bullet|spiral|6
woman_knight|聖盾誓約|shield|orbit|4
docking_beast|騎獸踏光|shard|volley|5
exorcist_oldman|聖釀封印|rune|cross|4
half_knight|初光劍誓|slash|cross|2
reporter|獨家閃光|target|burst|5
wild_wolfgirl|狼女逐光|claw|burst|5
moth_girl|月蛾鱗光|feather|rise|8
priest_hw20|南瓜祈願|star|spiral|5
junior_soldier|衛兵光矢|arrow|volley|4
skateboard_boy|飛板光軌|thread|spiral|4
kids_gunner|幻想連射|bullet|cross|7
reaper_girl|送魂月鐮|slash|orbit|3
chakram_shooter|寂靜輪刃|gear|volley|3
devil_woman_soldier|叛逆魔爪|claw|cross|6
informant|暗巷密令|card|volley|4
arabic_swordman|沙影彎刀|slash|spiral|5
dark_nursemaid|闇夜侍奉|cross|rise|5
bearish_darkwitch|夢幻星咒|star|rise|7
monster_attract|魔物呼喚|rune|burst|6
delusion_girl|妄想心願|heart|spiral|6
delusion_girl_xm20|聖夜夢禮|diamond|rise|7
mummy_boy|古墓纏咒|thread|cross|8
revenge_rabbit|月兔復仇|claw|burst|4
assistant_boy|真相追跡|target|orbit|3
`.trim().split('\n').map((row, index) => {
    const [id, name, motif, motion, count] = row.split('|');
    return [id, { name, motif, motion, count: Number(count), phase: index * 0.61 }];
}));

const SIGNATURE_GLYPHS = {
    anchor: '<circle cy="-19" r="6"/><path d="M0-13V24M-13-5H13M-23 5Q-23 22 0 26Q23 22 23 5M-28 11L-23 3-16 9M16 9L23 3 28 11"/>',
    slash: '<path d="M-30 18 Q-4 -26 32 -18 Q5 -10 -30 18Z" fill="currentColor"/>',
    claw: '<path d="M-22 22L-10-25M-5 25L6-28M12 21L24-21"/>',
    arrow: '<path d="M-30 0H27M12-12L29 0 12 12M-23-8L-14 0-23 8"/>',
    bullet: '<path d="M-29-5H12Q29 0 12 5H-29Z" fill="currentColor"/>',
    star: '<path d="M0-27L6-7 26 0 6 7 0 27-6 7-26 0-6-7Z"/>',
    cross: '<path d="M-6-22H6V-6H22V6H6V22H-6V6H-22V-6H-6Z"/>',
    shield: '<path d="M0-25L22-16 18 9Q10 22 0 28Q-10 22-18 9L-22-16Z"/><path d="M0-15V16M-12-3H12"/>',
    bolt: '<path d="M6-29L-17 5H-2L-7 29 19-7H4Z" fill="currentColor"/>',
    feather: '<path d="M-24 20Q-18-30 24-22Q26 10-24 20ZM-24 20L18-17M-10 6L-12-8M1-3L15-1"/>',
    leaf: '<path d="M-24 20Q-29-21 24-24Q25 23-24 20ZM-24 20L15-15M-11 7L-13-6M0-3L13 0"/>',
    petal: '<path d="M0 0Q-29-38 0-22Q29-38 0 0Q38-29 22 0Q38 29 0 0Q29 38 0 22Q-29 38 0 0Q-38 29-22 0Q-38-29 0 0Z"/>',
    flame: '<path d="M0-29Q28-5 17 17Q0 35-18 14Q-25 2-10-12Q-12 9 0 8Q8-1 0-29Z"/>',
    drop: '<path d="M0-27Q-32 6-15 20Q0 33 15 20Q32 6 0-27Z"/>',
    bubble: '<circle r="22"/><path d="M-14-4Q-14-14-4-15"/>',
    rune: '<circle r="24"/><path d="M0-20L18 10H-18ZM-17-10H17L0 20Z"/>',
    hex: '<path d="M0-25L22-12V12L0 25-22 12V-12Z"/><circle r="10"/>',
    gear: '<path d="M-8-24H8L11-15 20-16 26-3 19 4 20 14 7 24-1 18-12 23-23 11-17 3-24-9-12-19Z"/><circle r="9"/>',
    heart: '<path d="M0 24Q-36 0-20-17Q-8-27 0-12Q8-27 20-17Q36 0 0 24Z"/>',
    coin: '<circle r="23"/><circle r="17"/><path d="M0-11V11M-8-6H6M-6 6H8"/>',
    card: '<rect x="-16" y="-24" width="32" height="48" rx="3"/><path d="M0-12L9 0 0 12-9 0Z"/>',
    diamond: '<path d="M0-27L19 0 0 27-19 0ZM-19 0H19M0-27V27"/>',
    target: '<circle r="20"/><circle r="9"/><path d="M-30 0H-13M13 0H30M0-30V-13M0 13V30"/>',
    thread: '<path d="M-30 12Q-15-29 0 0T30-12M-30 20Q-15-21 0 8T30-4"/>',
    shard: '<path d="M-8-27L14-13 7 26-14 9Z" fill="currentColor"/>',
    flask: '<path d="M-8-25H8M-5-25V-8L-20 14Q-24 24-12 25H12Q24 24 20 14L5-8V-25M-14 8H14"/>'
};

function playSkillSignature(m) {
    const profile = SKILL_SIGNATURES[m.ch.id];
    if (!profile || !m.body || !PF.vfx) return;
    // Keep simultaneous casts bounded on mobile; one SVG per cast, no image requests.
    const active = PF.vfx.querySelectorAll('.skill-signature');
    if (active.length >= 6) active[0].remove();
    const d = CHAR_TABLE[m.ch.id];
    const healing = d.type === 'supporter';
    const target = healing ? m.body : (PF.foe || m.body);
    const node = document.createElement('div');
    node.className = 'skill-signature sig-' + profile.motion;
    node.setAttribute('aria-hidden', 'true');
    node.dataset.character = m.ch.id;
    node.style.left = target.x + 'px'; node.style.top = target.y + 'px';
    node.style.setProperty('--sig-color', ELEMENTS[d.element].color);
    const angle = Math.atan2(target.y - m.body.y, target.x - m.body.x);
    const glyph = SIGNATURE_GLYPHS[profile.motif];
    let figures = '';
    for (let i = 0; i < profile.count; i++) {
        const theta = profile.phase + i * Math.PI * 2 / profile.count;
        const radial = 34 + (i % 3) * 16;
        let x = Math.cos(theta) * radial, y = Math.sin(theta) * radial;
        let dx = x * 1.3, dy = y * 1.3, rot = theta * 180 / Math.PI;
        if (profile.motion === 'volley') {
            x = -Math.cos(angle) * (100 + i * 12) + Math.sin(angle) * (i - (profile.count - 1) / 2) * 17;
            y = -Math.sin(angle) * (100 + i * 12) - Math.cos(angle) * (i - (profile.count - 1) / 2) * 17;
            dx = -x; dy = -y; rot = angle * 180 / Math.PI;
        } else if (profile.motion === 'rise') {
            x = (i - (profile.count - 1) / 2) * 19; y = 30 + (i % 2) * 16;
            dx = Math.sin(theta) * 17; dy = -95;
        } else if (profile.motion === 'cross') {
            x *= .5; y *= .5; dx = Math.cos(theta) * 70; dy = Math.sin(theta) * 70; rot += 45;
        }
        const scale = (0.38 + (i % 3) * .07).toFixed(2);
        figures += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="sig-glyph" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--spin:${profile.motion === 'spiral' ? 130 : profile.motion === 'orbit' ? 65 : 0}deg;animation-delay:${i * 28}ms"><g transform="rotate(${rot.toFixed(1)}) scale(${scale})">${glyph}</g></g></g>`;
    }
    node.innerHTML = `<svg viewBox="-170 -170 340 340" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle class="sig-wave" r="35"/><g>${figures}</g></svg>`;
    PF.vfx.appendChild(node);
    setTimeout(() => node.remove(), 1100);
}
