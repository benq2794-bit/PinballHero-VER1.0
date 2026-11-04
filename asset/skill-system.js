// 技能機制與角色技能目錄。透過傳入的戰鬥介面運作，集中管理五職業與角色覆寫。
window.SkillSystem = Object.freeze({
    createRuntime({ skillHit, skillVfx, dashTo, repeat, talentRank, applyHeal, cutCd, aliveMembers,
        getEnemy, getPartyState, pop, now, actions }) {
        const tune = actions || {};
        const knight = tune.knight || {}, fighter = tune.fighter || {}, ranger = tune.ranger || {};
        const supporter = tune.supporter || {}, special = tune.special || {}, alchemist = tune.alchemist || {};
        const byRole = {
            knight(m, seq) {
                skillVfx(m, "knight");
                skillHit(m, knight.openingDamage ?? 2.2, { cls: "crit", combo: 2 });
                if (getEnemy().hp > 0) {
                    dashTo(m);
                    skillVfx(m, "knight", { caster: true, dash: true });
                    // 突進後追加一次確定的範圍斬擊，不再依賴球體是否剛好撞中敵人。
                    repeat(m, seq, knight.followups ?? 2, knight.followupGapMs ?? 180, () => {
                        const target = getPartyState().foe;
                        if (!target) return;
                        skillVfx(m, "knight", { target });
                        skillHit(m, knight.followupDamage ?? 1, { combo: 1, areaRadius: knight.areaRadius ?? 110 });
                    });
                }
            },
            fighter(m, seq) {
                skillVfx(m, "fighter");
                skillHit(m, fighter.hitDamage ?? .8, { combo: 1 });
                repeat(m, seq, fighter.hits ?? 4, fighter.hitGapMs ?? 100, () => {
                    skillVfx(m, "fighter");
                    skillHit(m, fighter.hitDamage ?? .8, { combo: 1 });
                });
            },
            ranger(m, seq) {
                const makeBeam = () => {
                    const b = m.body, e = getPartyState().foe;
                    return b && e ? { x: b.x, y: b.y, angle: Math.atan2(e.y - b.y, e.x - b.x), length: ranger.beamLength ?? 640, width: ranger.beamWidth ?? 18 } : null;
                };
                const beam = makeBeam();
                skillVfx(m, "ranger", { beam });
                skillHit(m, ranger.openingDamage ?? 1.9, { cls: "crit", combo: 2, beam });
                repeat(m, seq, ranger.followups ?? 3, ranger.followupGapMs ?? 90, () => {
                    skillVfx(m, "ranger", { beam: makeBeam() });
                    skillHit(m, ranger.followupDamage ?? .75, { combo: 1 });
                });
            },
            supporter(m) {
                const healPct = (supporter.healBase ?? .10) * (1 + (supporter.healTalentPerRank ?? .02) * talentRank(m.ch, 'skill'));
                getPartyState().buff = { atk: Math.round(m.ch.baseAtk * (supporter.attackBuff ?? .30)), until: now() + (supporter.buffDurationMs ?? 6000) };
                skillVfx(m, "supporter", { team: true });
                for (const x of getPartyState().members) {
                    if (x.down || !x.body || x.ch.hp <= 0) continue;
                    if (applyHeal(x, healPct)) pop(x.body.x, x.body.y - 30, `+${(healPct * 100).toFixed(1)}%`, "heal");
                    if (x !== m) cutCd(x, supporter.allyChargeSeconds ?? 3);
                }
            },
            special(m) {
                skillVfx(m, "special");
                skillHit(m, special.damage ?? 2.8, { cls: "crit", combo: 3, areaRadius: special.areaRadius ?? 155 });
                for (const x of aliveMembers()) if (x !== m) cutCd(x, special.allyChargeSeconds ?? 2);
            }
        };
        const byUnit = {
            alchemist(m, seq) {
                skillVfx(m, "special");
                skillHit(m, alchemist.damage ?? 1.5, { cls: "crit", combo: 2, areaRadius: alchemist.areaRadius ?? 155 });
                repeat(m, seq, alchemist.followups ?? 2, alchemist.followupGapMs ?? 260, () => {
                    skillVfx(m, "special");
                    skillHit(m, alchemist.followupDamage ?? 1.3, { combo: 1, areaRadius: alchemist.followupRadius ?? 170, popScale: alchemist.popScale ?? 1.4 });
                });
                for (const x of aliveMembers()) if (x !== m) cutCd(x, alchemist.allyChargeSeconds ?? 2);
            }
        };
        return { byRole, byUnit };
    },

    buildCatalog({ characters, signatures, config, elements, runtime }) {
        const SKILLS = {};
        Object.keys(characters).forEach(id => {
            const d = characters[id];
            const trait = config.traitProfile[d.type] || config.traitProfile.special;
            SKILLS[id] = {
                name: signatures[id]?.name || config.word[d.element] + config.move[d.type],
                tag: `${config.tag[d.type]}・${trait.label}`,
                desc: config.unitDesc[id] || `${trait.effect}；${config.desc[d.type]}命中會套用${elements[d.element].label}屬性效果。`,
                cast: runtime.byUnit[id] || runtime.byRole[d.type],
                art: config.art[d.type],
                trait: { ...trait, element: d.element, role: d.type }
            };
        });
        
        return SKILLS;
    }
});
