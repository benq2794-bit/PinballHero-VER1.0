// 技能機制與角色技能目錄。透過傳入的戰鬥介面運作，集中管理五職業與角色覆寫。
window.SkillSystem = Object.freeze({
    createRuntime({ skillHit, dashTo, repeat, talentRank, applyHeal, cutCd, aliveMembers,
        getEnemy, getPartyState, pop, now }) {
        const byRole = {
            knight(m, seq) {
                skillHit(m, 2.2, { cls: "crit", combo: 2 });
                if (getEnemy().hp > 0) {
                    dashTo(m);
                    // 突進後追加一次確定的範圍斬擊，不再依賴球體是否剛好撞中敵人。
                    repeat(m, seq, 2, 180, () => {
                        const target = getPartyState().foe;
                        if (!target) return;
                        skillHit(m, 1.0, { combo: 1, areaRadius: 110 });
                    });
                }
            },
            fighter(m, seq) {
                skillHit(m, 0.8, { combo: 1 });
                repeat(m, seq, 4, 100, () => {
                    skillHit(m, 0.8, { combo: 1 });
                });
            },
            ranger(m, seq) {
                const b = m.body, e = getPartyState().foe;
                const beam = b && e ? { x: b.x, y: b.y, angle: Math.atan2(e.y - b.y, e.x - b.x), length: 640, width: 18 } : null;
                skillHit(m, 1.9, { cls: "crit", combo: 2, beam });
                repeat(m, seq, 3, 90, () => skillHit(m, 0.75, { combo: 1 }));
            },
            supporter(m) {
                const healPct = .10 * (1 + .02 * talentRank(m.ch, 'skill'));
                getPartyState().buff = { atk: Math.round(m.ch.baseAtk * 0.3), until: now() + 6000 };
                for (const x of getPartyState().members) {
                    if (x.down || !x.body || x.ch.hp <= 0) continue;
                    if (applyHeal(x, healPct)) pop(x.body.x, x.body.y - 30, `+${(healPct * 100).toFixed(1)}%`, "heal");
                    if (x !== m) cutCd(x, 3);
                }
            },
            special(m) {
                skillHit(m, 2.8, { cls: "crit", combo: 3, areaRadius: 155 });
                for (const x of aliveMembers()) if (x !== m) cutCd(x, 2);
            }
        };
        const byUnit = {
            alchemist(m, seq) {
                skillHit(m, 1.5, { cls: "crit", combo: 2, areaRadius: 155 });
                repeat(m, seq, 2, 260, () => skillHit(m, 1.3, { combo: 1, areaRadius: 170, popScale: 1.4 }));
                for (const x of aliveMembers()) if (x !== m) cutCd(x, 2);
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
