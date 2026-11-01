// 傷害跳字改用 Riclmbr《Pixel Floating Text & Damage Numbers》的點陣字（CC0）
// 字表 368×75，字身 24px；一個字一個 <i> 疊上去，字表沒有的字（中文）就讓原本的 CSS 文字接手
const PIXEL_TEXT = (() => {
    const SHEET_W = 368, SHEET_H = 75;
    // id: [x, y, 寬, 高, xoffset, yoffset, 前進量]；八種顏色的字表共用同一份格位
    const G = {
        "0": [0,0,18,24,-3,-3,14], "1": [23,0,14,24,-3,-3,10], "2": [46,0,18,24,-3,-3,14],
        "3": [69,0,18,24,-3,-3,14], "4": [92,0,18,24,-3,-3,14], "5": [115,0,18,24,-3,-3,14],
        "6": [138,0,18,24,-3,-3,14], "7": [161,0,18,24,-3,-3,14], "8": [184,0,18,24,-3,-3,14],
        "9": [207,0,18,24,-3,-3,14], "+": [230,0,18,24,-3,-3,14], "-": [253,0,16,24,-3,-3,12],
        "x": [276,0,18,24,-3,-3,14], "%": [299,0,18,24,-3,-3,14], "!": [322,0,10,24,-3,-3,6],
        "?": [345,0,18,24,-3,-3,14], ".": [0,25,10,24,-3,-3,6], ",": [23,25,10,24,-3,-3,6],
        "&": [46,25,18,24,-3,-3,14], " ": [69,25,12,24,-3,-3,8], "A": [92,25,18,24,-3,-3,14],
        "B": [115,25,18,24,-3,-3,14], "C": [138,25,18,24,-3,-3,14], "D": [161,25,18,24,-3,-3,14],
        "E": [184,25,18,24,-3,-3,14], "F": [207,25,18,24,-3,-3,14], "G": [230,25,18,24,-3,-3,14],
        "H": [253,25,18,24,-3,-3,14], "I": [276,25,10,24,-3,-3,6], "J": [299,25,18,24,-3,-3,14],
        "K": [322,25,18,24,-3,-3,14], "L": [345,25,18,24,-3,-3,14], "M": [0,50,18,24,-3,-3,14],
        "N": [23,50,18,24,-3,-3,14], "O": [46,50,18,24,-3,-3,14], "P": [69,50,18,24,-3,-3,14],
        "Q": [92,50,18,24,-3,-3,14], "R": [115,50,18,24,-3,-3,14], "S": [138,50,18,24,-3,-3,14],
        "T": [161,50,18,24,-3,-3,14], "U": [184,50,18,24,-3,-3,14], "V": [207,50,18,24,-3,-3,14],
        "W": [230,50,18,24,-3,-3,14], "X": [253,50,18,24,-3,-3,14], "Y": [276,50,18,24,-3,-3,14],
        "Z": [299,50,18,24,-3,-3,14]
    };
    const SHEETS = {
        damage: "asset/fx/dmgfont/damage.png",
        critical: "asset/fx/dmgfont/critical.png",
        heal: "asset/fx/dmgfont/heal.png",
        burn: "asset/fx/dmgfont/burn.png",
        mana: "asset/fx/dmgfont/mana.png",
        poison: "asset/fx/dmgfont/poison.png",
        gold: "asset/fx/dmgfont/gold.png"
    };
    // 顏色沿用遊戲原本的語意：普通傷害金、暴擊橘紅、治療綠、灼燒橙、遲緩與能量藍、麻痺紫
    const STYLE_BY_CLASS = {
        damage: "damage",
        crit: "critical", critical: "critical", hurt: "critical",
        heal: "heal", gust: "heal",
        burn: "burn",
        chill: "mana", energy: "mana", "pf-damage": "mana",
        paralyze: "poison",
        weak: "gold", brk: "gold"
    };
    const BASE_SCALE = { critical: 1.5, crit: 1.3, weak: 1.15, brk: 1.15 };

    function styleFor(cls) {
        for (const key of String(cls || "").split(/\s+/)) {
            if (STYLE_BY_CLASS[key]) return STYLE_BY_CLASS[key];
        }
        return "gold";
    }

    // 字表只有大寫與符號；k（fmt 的千位）換成 K，x 保留小寫（COMBO x5 的乘號），其餘字表外的字直接放棄、交還給 CSS 文字
    // force = 純英文字（例如 FEVER）也要畫，不受「至少要有一個數字」的限制
    const ALIAS = { "×": "x" };
    function glyphText(text, force) {
        if (!force && !/[0-9]/.test(text)) return null;
        let out = "";
        for (const ch of text) {
            const key = ALIAS[ch] || (ch === "k" ? "K" : ch);
            if (!G[key]) return null;
            out += key;
        }
        return out;
    }

    // 把節點內容換成點陣字；回傳 false 表示這串字照舊用文字畫
    function paint(node, text, cls, extraScale, force) {
        const str = glyphText(text, force);
        if (!str) return false;
        const tokens = String(cls || "").split(/\s+/);
        const sheet = SHEETS[styleFor(cls)] || SHEETS.gold;
        let s = 1;
        for (const key of tokens) if (BASE_SCALE[key] > s) s = BASE_SCALE[key];
        if (extraScale) s *= extraScale;
        node.textContent = "";
        node.classList.add("px-num");
        node.style.display = "flex";
        let prev = null;
        for (const ch of str) {
            const [x, y, w, h, ox, , adv] = G[ch];
            const cell = document.createElement("i");
            cell.style.width = (w * s) + "px";
            cell.style.height = (h * s) + "px";
            // 每個字從自己的筆位畫起；字寬和前進量不同時用負邊距把字距壓回去
            cell.style.marginLeft = ((prev ? prev[6] - prev[2] : ox) * s) + "px";
            cell.style.backgroundImage = `url("${sheet}")`;
            cell.style.backgroundSize = `${SHEET_W * s}px ${SHEET_H * s}px`;
            cell.style.backgroundPosition = `${-x * s}px ${-y * s}px`;
            cell.style.backgroundRepeat = "no-repeat";
            node.appendChild(cell);
            prev = G[ch];
        }
        return true;
    }

    return { paint, styleFor };
})();
