// 集中管理角色名冊與技能展示資料；欄位順序沿用既有 DEX 格式。
window.GAME_DATA = window.GAME_DATA || {};
window.GAME_DATA.characters = [["fire_dragon",5,"fire","瓦格納","煉獄龍王","Bow",1,1],["pirates_girl",5,"fire","瑪麗娜","跨星海海賊船長","Sword",1,1],["clarisse",5,"fire","克拉莉絲","未完成鍊金術師","Special",1,1],["battle_maid_xm19",5,"fire","瑪麗安","華麗女僕","Bow",1,1],["heavenly_one",5,"fire","諾埃妮(新年)","鼠王國的偶像","Support",1,1],["compliment_oiran",5,"fire","菊乃","流浪花魁","Fist",1,1],["black_wolf_knight",5,"fire","羅爾夫","黑狼騎士","Sword",1,1],["tiger_treasure_hunter_smr20",5,"fire","咪亞(夏日)","夏日熱血尋寶虎女","Fist",1,1],["kunoichi_1anv",5,"fire","花火(一周年)","星空煙火忍者","Fist",1,1],["lady_summoner_xm20",5,"fire","碧安卡(耶誕)","魅惑聖誕老人","Support",1,1],["halberd_princess",5,"fire","托莉亞","怪力公主","Sword",1,1],["doctor_pirate",5,"fire","燎","獸耳船醫","Bow",1,1],["onmyoji_boy_wt21",5,"fire","水前(白色情人節)","滿懷思念陰陽師","Support",1,1],["magical_bayonetter",5,"fire","夸磊","微笑隱士","Sword",1,1],["zeta",5,"fire","瑟塔","緋紅貫光","Sword",1,0],["tsundere_bountyhunter",5,"fire","蕾蒂希雅","費德爾家之彈","Bow",1,0],["bodysuit_trooper_smr21",5,"fire","艾可莉兒","熾熱白金","Sword",1,0],["suzumiya_haruhi",5,"fire","涼宮春日","傲慢英雄","Sword",1,0],["shadow_redhood",5,"fire","琉儂","魔槍復仇者","Bow",1,0],["pirates_girl_2anv",5,"fire","瑪麗娜(2周年)","星辰船長","Sword",1,0],["misogi",5,"fire","褉","惡作劇專家","Special",1,0],["tsundere_bountyhunter_vt22",5,"fire","蕾蒂希雅","情人節之彈","Bow",1,0],["brown_fighter",5,"water","索妮雅","水舞艷華","Sword",1,1],["onmyoji_boy",5,"water","水前","無雙陰陽師","Support",1,1],["lightbullet_wiz_ny20",5,"water","艾黎雅(新年)","豐水羽子板少女","Bow",1,1],["ice_witch",5,"water","瑟琺","冰雪魔女","Bow",1,1],["commander",5,"water","希麗奴","鐵之狼","Bow",1,1],["lakeside_guardian",5,"water","利姆尼斯","護龍者","Sword",1,1],["drawing_witch",5,"water","菈琪夏","邊境嚮導","Support",1,1],["prince_zero_smr20",5,"water","拉傑爾特(夏日)","乘浪王子","Sword",1,1],["minamoto_sakura",5,"water","源櫻","殭屍一號","Fist",1,1],["freeze_eye",5,"water","磊拉斯","冰結之瞳","Sword",1,0],["emilia",5,"water","愛蜜莉雅","溫柔半精靈","Bow",1,0],["rem",5,"water","雷姆","全能女僕妹妹","Fist",1,0],["waterdragon_kunfu",5,"water","雪蓉","怪物武術天才","Fist",1,0],["desert_commander",5,"water","哈里達爾","王國大將軍","Sword",1,0],["mermaid_1halfanv",5,"water","亞美莉亞(1.5周年)","迷人魚海賊","Bow",1,0],["holy_mother",5,"water","瑪姆納莉雅","慈母救世主","Support",1,0],["nagato_yuki",5,"water","長門有希","沉默外星人","Special",1,0],["waterdragon_kunfu_proud",5,"water","雪蓉(獸國)","兇獸武者","Fist",1,0],["psychic_yuki",5,"water","見嶋勇希","境界靈能者","Special",1,0],["navy_officer",5,"water","芙拉克希絲","不屈戰艦","Bow",1,0],["ice_witch_2anv",5,"water","瑟琺","冰霜大魔女","Support",1,0],["freeze_eye_xm21",5,"water","磊拉斯","雪之聖者","Sword",1,0],["heavenly_three",5,"water","翠緹","CIPO調查員","Special",1,0],["kyouka",5,"water","鏡華","精靈優等生","Bow",1,0],["ice_dragon",5,"water","安瓦哈","自由霜牙龍歌姬","Special",1,0],["justice_lady",5,"water","潔絲媞","願望執行者","Sword",1,0],["fox_oracle",5,"thunder","稻穗","九尾繼承人","Special",1,1],["cagliostro",5,"thunder","卡利歐斯托羅","奠基鍊金術師","Support",1,1],["samurai_xm19",5,"thunder","宗士郎(耶誕)","聖夜武士","Sword",1,1],["thunder_archer",5,"thunder","梅緹斯","狂歡雷弓手","Bow",1,1],["mighty_striker",5,"thunder","巴拉克","霹靂拳王","Fist",1,1],["machine_police_girl",5,"thunder","賽拉","忠誠鐵拳","Bow",1,1],["big_gunner",5,"thunder","牡丹","高效煙火師","Bow",1,1],["illusionist_smr20",5,"thunder","伊路米(夏日)","仲夏魔法師","Special",1,1],["dimension_witch_smr20",5,"thunder","貝爾賽蒂亞(夏日)","深淵女主人","Bow",1,1],["rec_android_1anv",5,"thunder","雷吉斯(一周年)","白花機甲","Bow",1,1],["heavenly_two",5,"thunder","彪西(新年)","牛王國的偶像","Support",1,0],["girl_and_mecha",5,"thunder","蘿黛","怪物與少女","Fist",1,0],["general_toyakiren",5,"thunder","茨茵庫","扶搖直上經理","Sword",1,0],["samurai_robot",5,"thunder","斬鐵","忍者武士參上","Sword",1,0],["elder_guild_fighter",5,"thunder","瑪奇斯","刺激愛好者","Sword",1,0],["machine_police_girl_smr21",5,"thunder","瑟拉(夏日)","夏日救援者","Bow",1,0],["horn_leader",5,"thunder","梅姆拉姆","共感角之王","Sword",1,0],["cyber_battergirl",5,"thunder","斯特萊娜","毀滅強打手","Bow",1,0],["dog_slasher_proud",5,"thunder","黑爾加(獸國)","白色守護者","Fist",1,0],["psychic_tohru",5,"thunder","千岳十織","霹靂靈能者","Fist",1,0],["white_tiger_2anv",5,"thunder","希洛","覺醒之牙","Fist",0,0],["super_robot",5,"thunder","泰克特","停滯兵器","Bow",0,0],["wind_spgirl",5,"wind","希露媞","可愛劍魔","Sword",1,1],["wind_oracle",5,"wind","菲莉亞","宿命戰巫女","Support",1,1],["katana_ghost",5,"wind","叢雲","靈刀宿靈","Sword",1,1],["mercenary",5,"wind","列恩","亂世倖存者","Sword",1,1],["bigwing_shaman",5,"wind","希薇","廣翼靈使","Support",1,1],["gentle_barten",5,"wind","米格爾","翱翔大使","Special",1,1],["kokkoro",5,"wind","可可蘿","小小嚮導","Support",1,1],["wind_dragon",5,"wind","休爾特","毀滅漩渦龍","Fist",1,1],["nikaido_saki",5,"wind","二階堂咲","殭屍二號","Fist",1,1],["elf_princess",5,"wind","艾斯忒利耶爾","希望之子","Special",1,1],["wind_spgirl_1anv",5,"wind","希露提(一周年)","星辰少女騎士","Sword",1,0],["timid_kunoichi_ny21",5,"wind","涼風(新年)","新年盛裝女忍者","Sword",1,0],["combat_animal",5,"wind","芙拉菲","沉默討伐者","Fist",1,0],["brown_fighter_dst21",5,"wind","索妮雅(沙漠)","晴空風舞艷華","Sword",1,0],["beast_shaman",5,"wind","涅薇婭","時間先知","Support",1,0],["elf_princess_1halfanv",5,"wind","艾斯忒利耶爾(1.5周年)","永恆毀滅者","Support",1,0],["bigwing_shaman_smr21",5,"wind","希薇(夏日)","戀愛精靈巫女","Special",1,0],["tengu_master",5,"wind","豪嵐","暴風邪天狗","Fist",1,0],["mercenary_smr21",5,"wind","列恩(浴衣)","夏夜納涼冒險者","Sword",1,0],["combat_animal_xm21",5,"wind","芙拉菲","平安夜討伐者","Fist",0,0],["mimi",5,"wind","咪咪","善良兔少女","Sword",0,0],["marching_conductor",5,"wind","瑪奇亞","行進之星","Special",0,0],["wind_dragon_wt22",5,"wind","舒爾特","護衛之龍","Special",0,0],["ruin_girl",5,"light","奈芙提姆","甦醒遠古兵器","Special",1,1],["prince_zero",5,"light","拉傑爾特","流浪王子","Sword",1,1],["bodysuit_trooper",5,"light","艾可莉兒","七彩斬劍者","Sword",1,1],["fox_oracle_xm19",5,"light","稻穗(耶誕)","可愛九尾","Special",1,1],["starbreak_hunter",5,"light","塔傑斯","神速射手","Sword",1,1],["combat_soldier",5,"light","巴蕾塔","自由子彈","Bow",1,1],["blade_dancer",5,"light","利普拉姆","傲慢談判者","Sword",1,1],["ruin_girl_halfanv",5,"light","尼芙緹姆(半周年)","盛典靚麗古武姬","Special",1,1],["pecorine",5,"light","貪吃佩可","雲遊饕劍士","Sword",1,1],["neoviolin_musician",5,"light","莉拉","新派提琴手","Special",1,1],["high_priestess",5,"light","奧薇兒","法拓瑪聖女","Bow",1,1],["lamp_guide",5,"light","菲拉梅莉亞","光之引路者","Support",1,1],["hoshikawa_ririi",5,"light","星川莉莉","殭屍六號","Special",1,1],["wind_oracle_1anv",5,"light","菲莉亞(一周年)","希望之光繼承者","Support",1,0],["lightbullet_wiz_vt21",5,"light","艾黎雅(情人節)","戀愛笨拙女","Bow",1,0],["crystal_swordman",5,"light","賽利歐爾","水晶流浪劍士","Sword",1,0],["yokai_exterminator",5,"light","蓮華","退魔獵人","Sword",1,0],["resistance_princess_smr21",5,"light","莉莉絲(夏日)","赤裸公主","Sword",1,0],["fox_oracle_smr21",5,"light","稻穗(夏日)","夏裝絨毛九尾","Bow",1,0],["asahina_mikuru",5,"light","朝比奈實玖留","團內吉祥物","Support",1,0],["ruin_girl_smr21",5,"light","尼芙緹姆(浴衣)","夏日靚麗武姬","Support",1,0],["guildknight_leader",5,"light","澤黑爾","綠蔭騎士","Sword",1,0],["neoviolin_musician_hw21",5,"light","莉菈(萬聖)","愛樂魔女","Bow",1,0],["high_priestess_ny22",5,"light","奧爾薇爾","新年慶典聖女","Bow",0,0],["hero_girl_vt22",5,"light","奈特","迷途之心","Fist",0,0],["still_obstinator",5,"light","絲蒂涅爾","偽裝邪惡暴君","Special",0,0],["dimension_witch",5,"dark","貝爾賽蒂亞","次元魔女","Bow",1,1],["veteran_hunter",5,"dark","威隆","老練獵人","Sword",1,1],["blade_witch",5,"dark","莫爾米雅","流浪魔劍士","Sword",1,1],["cursed_girl",5,"dark","凱菈","蛇影嫣然少女","Fist",1,1],["olivia",5,"dark","奧莉薇","墮落天使","Sword",1,1],["kyaru",5,"dark","凱留","貓耳魔女","Special",1,1],["alice_smr20",5,"dark","愛麗絲(夏日)","海洋夢魘","Fist",1,1],["konno_junko",5,"dark","紺野純子","殭屍四號","Special",1,1],["sing_android_hw20",5,"dark","蒂亞(萬聖)","鋼鐵小惡魔歌后","Support",1,1],["dark_psygirl",5,"dark","蒂涅","闇黑少女","Sword",1,1],["devil_leader",5,"dark","埃德修斯","長夜希望","Sword",1,1],["silent_ninja",5,"dark","八雲","斬蛇忍者","Sword",1,0],["devil_princess_xm20",5,"dark","阿露姆(耶誕)","小惡魔聖誕","Fist",1,0],["summoner_little",5,"dark","庫艾特","開門者","Special",1,0],["noble_sorceress",5,"dark","梅維奧拉","深海夫人","Support",1,0],["dark_psygirl_dst21",5,"dark","蒂涅(沙漠)","闇黑少女零","Sword",1,0],["beatrix",5,"dark","貝雅特麗絲","不朽群青","Sword",1,0],["blindness_gunner_1halfanv",5,"dark","賽吉爾(1.5周年)","鬆襟槍手","Bow",1,0],["blackflower_wiz",5,"dark","莉姆普菈","巧克力百合魔女","Bow",1,0],["touyakiren_ceo_hw21",5,"dark","拉芙(萬聖)","萬聖夜之女","Sword",1,0],["psychic_shouta",5,"dark","伊野里翔太","重力超能者","Special",1,0],["summoner_little_2anv",5,"dark","庫艾特(2周年)","陰陽道見習","Special",1,0],["dimension_witch_ny22",5,"dark","貝爾賽蒂亞","新年黃昏魔女","Bow",0,0],["katana_ghost_wt22",5,"dark","叢雲","僕人與王子","Sword",0,0],["estateguild_leader",5,"dark","希爾德加德","領地事務公會會長","Special",0,0],["alk",4,"fire","埃爾克","巡星少年","Sword",1,1],["dragon_slayer",4,"fire","阿傑爾","獵龍者","Sword",1,1],["lady_summoner",4,"fire","碧安卡","魅惑召喚師","Support",1,1],["kunoichi",4,"fire","花火","隱匿忍者","Fist",1,1],["half_oni_boy",4,"fire","明日切丸","凶神血脈","Fist",1,1],["master_knight",4,"fire","格萊德","堅盾劍士","Sword",1,1],["red_gunner",4,"fire","卡農","赤髮雙槍手","Bow",1,1],["reporter_ny20",4,"fire","瑠瑠卡(新年)","初次傳教記者","Sword",1,1],["shapely_soldier",4,"fire","萊薇","過分豔麗冒險者","Sword",1,1],["crybaby_shooter",4,"fire","琪莉","愛哭槍擊少女","Bow",1,1],["pirates_gunner",4,"fire","海茲","魯莽子彈","Bow",1,1],["sanctuary_guard",4,"fire","米露米娜","害羞武術宗師","Sword",1,1],["magic_sword_girl",4,"fire","納席兒","魔劍魅惑少女","Sword",1,1],["vigilante_boy",4,"fire","藏丸","正義之火","Sword",1,1],["yugiri",4,"fire","夕霧","殭屍五號","Fist",1,1],["sorceress_teacher",4,"fire","妮可拉","傳聞完美教師","Special",1,1],["alk_1anv",4,"fire","埃爾克(周年)","善良引路人","Support",1,0],["cool_woman_soldier_xm20",4,"fire","特蕾涅","聖夜紅衣劍士","Sword",1,0],["naginata_girl",4,"fire","舞姬","古流巫女","Sword",1,0],["dragon_slayer_smr21",4,"fire","阿傑爾(夏日)","龍之摯友","Sword",1,0],["kyon",4,"fire","阿虛","平凡人代表","Sword",1,0],["psychic_tomboygirl",4,"fire","緋河琳奈","詛咒超能者","Special",0,0],["psychic_nao",4,"fire","凪原奈緒","星海超能者","Support",0,0],["nurse_pirate",4,"fire","琵希卡","獸耳護理師","Bow",0,0],["shapely_soldier_ny22",4,"fire","蕾薇","和服絕豔劍士","Sword",0,0],["swallow_knight",4,"water","尤維爾","飛燕自由騎士","Sword",1,1],["bishop_girl",4,"water","莉潔兒","迷宮天使","Support",1,1],["mermaid",4,"water","艾梅麗雅","深海人魚","Bow",1,1],["alice",4,"water","愛麗絲","漂流魔法少女","Fist",1,1],["battle_guild_staff",4,"water","莎隆","戰鬥公會成員","Fist",1,1],["spry_sailor",4,"water","拉納","揚帆軍官","Sword",1,1],["deepsea_mage",4,"water","薩爾","深海人形生物","Special",1,1],["desert_wizard",4,"water","莫爾迪亞嘉","沙暴魔導具使","Fist",1,1],["onmyo_attendant",4,"water","蛟蛇","白蛇陰陽師","Special",1,1],["psycho_reaper",4,"water","索薇","碎靈醫師","Sword",1,1],["unicorn_lancer_smr20",4,"water","傑拉爾(夏日)","海濱蒙面騎士","Sword",1,1],["pirates_girl_smr20",4,"water","瑪麗娜(夏日)","永夏女海賊","Sword",1,1],["shy_assassin",4,"water","薇薇","迷戀後背的冒險者","Sword",1,1],["urban_soldier_ny21",4,"water","翠絲塔(新年)","和服少女劍士","Sword",1,0],["ruin_lady",4,"water","索提艾絲","黎明古武","Bow",1,0],["hero_girl",4,"water","涅特","閃電藍","Sword",1,0],["stylish_witch",4,"water","琺松","新進魔術師","Special",1,0],["dress_gunner",4,"water","伊芙琳","官方認證狙擊手","Bow",1,0],["fox_companion_smr21",4,"water","白野(夏日)","妖豔助手","Special",1,0],["spry_sailor_hw21",4,"water","拉納(萬聖)","魅惑反串女僕","Sword",1,0],["psychic_seiji",4,"water","鷹森誠司","治癒靈能士","Support",1,0],["thunder_dragon",4,"thunder","拉姆斯","玄雷神龍","Special",1,1],["fox_scientist",4,"thunder","露娜露","微笑科學家","Special",1,1],["rec_android",4,"thunder","雷吉斯","仿生紳士","Bow",1,1],["elf_soldier",4,"thunder","艾蓮諾爾","星辰之焰","Sword",1,1],["cat_shaman",4,"thunder","傑伊","慧眼老貓","Support",1,1],["minotaur_girl",4,"thunder","米諾","超群女鬥牛士","Fist",1,1],["docking_beast_xm19",4,"thunder","奧利歐(耶誕)","聖夜快遞員","Fist",1,1],["black_hair_swordman",4,"thunder","亞德尼","秘劍軍師","Sword",1,1],["lady_android",4,"thunder","露蒂","沉睡仿生淑女","Special",1,1],["fake_princess",4,"thunder","普莉卡","人造人偶公主","Fist",1,1],["casino_dealer_smr20",4,"thunder","奈絲卡(夏日)","烈日賭徒","Sword",1,1],["hidden_blader",4,"thunder","羅賽莉亞","剎那舞娘","Sword",1,1],["mizuno_ai",4,"thunder","水野愛","殭屍三號","Fist",1,1],["fox_scientist_hw20",4,"thunder","露娜露(萬聖)","黃昏微笑科學家","Bow",1,1],["black_hair_swordman_xm20",4,"thunder","亞德尼","彌撒軍師","Sword",1,1],["little_wizard",4,"thunder","托・蕾蕾妮","迷你魔導教師","Support",0,0],["punk_warrior",4,"thunder","愛蒂塔","大膽人氣冒險者","Sword",1,0],["electro_girl",4,"thunder","特娜","無瑕電擊少女","Special",1,0],["secret_observer",4,"thunder","吉賽兒","天真魔具收藏家","Sword",1,0],["warashi",4,"thunder","福","招福少女","Special",1,0],["lion_boy",4,"thunder","堤奧","獅子後裔","Fist",1,0],["outlaw_panther_ny22",4,"thunder","庫洛","賀年黑豹","Fist",0,0],["spanner_girl",4,"thunder","艾蕾吉亞","機械維修師","Special",0,0],["white_tiger",4,"wind","白","白虎獸人","Fist",1,1],["tiger_treasure_hunter",4,"wind","咪亞","努力虎娘","Fist",1,1],["birdman",4,"wind","奧羅爾","碧空獵人","Sword",1,1],["samurai",4,"wind","宗士郎","破雲武士","Sword",1,1],["elf_archer",4,"wind","梅莉蘇爾","與風為伴少女","Bow",1,1],["dog_slasher",4,"wind","黑爾加","白狼杖術大師","Fist",1,1],["arisa",4,"wind","亞里莎","森林守護者","Bow",1,1],["bearish_darkwitch_ny20",4,"wind","蕾貝卡(新年)","慌張占卜巫女","Support",1,1],["beast_adventurer",4,"wind","盧","熱血冒險少年","Sword",1,1],["timid_kunoichi",4,"wind","鈴香","不情願女忍","Sword",1,1],["tengu_girl",4,"wind","小羽","天狗愛徒","Bow",1,1],["ekaki_onmyoji",4,"wind","鵠","陰陽畫師","Support",1,1],["wild_boy",4,"wind","豪","乘風少年","Fist",1,1],["white_tiger_xm20",4,"wind","白(聖誕節)","聖誕馴鹿白虎","Fist",1,0],["ram",4,"wind","拉姆","毒舌女僕姐姐","Bow",1,0],["wind_striker",4,"wind","里卡德","武道純血","Fist",1,0],["steel_lacrosse",4,"wind","米蒂","鋼鐵旋風選手","Bow",1,0],["cool_witch_girl",4,"wind","皮亞莫","認命小魔女","Special",1,0],["bird_master",4,"wind","路馬爾克","周遊馴鷹人","Sword",1,0],["pilgrim_monk",4,"wind","瑪卡妮","熱衷修行武僧","Sword",1,0],["sanctuary_guard_hw21",4,"wind","米露米娜(萬聖)","惡作劇武術家","Sword",1,0],["sheep_girl",4,"wind","梅莉艾娜","戀愛羊女","Support",0,0],["sing_android",4,"light","蒂亞","仿生歌姬","Support",1,1],["unicorn_lancer",4,"light","傑拉爾","白面騎士","Sword",1,1],["lightbullet_wiz",4,"light","艾黎雅","光彈魔術師","Bow",1,1],["palpebra_knight",4,"light","芬恩","秩序守護者","Sword",1,1],["palpebra_knight_lady",4,"light","綺拉","笑容守護者","Sword",1,1],["monster_cook",4,"light","帕爾菲","魔物廚師","Sword",1,1],["illusionist",4,"light","伊兒彌","夢幻光魔術師","Special",1,1],["unleash_hunter",4,"light","霍普洛","花式射手","Bow",1,1],["unyielding_adventurer",4,"light","芮兒","生態調查獵人","Fist",1,1],["whitedog_beast",4,"light","芙蘿蕾塔","魯莽傭兵劍士","Sword",1,1],["bishop_girl_smr20",4,"light","莉潔兒(夏日)","仲夏救世主","Support",1,1],["keylock_girl",4,"light","琪亞娜","萬能解鎖少女","Special",1,1],["resistance_princess",4,"light","莉莉絲","光之繼承者","Sword",1,1],["doctor_machine",4,"light","梅克","無差別治癒者","Support",1,1],["woman_knight_1anv",4,"light","賽希莉亞(周年)","守護希望騎士","Sword",1,0],["sea_violent",4,"light","狄蕾特","漁家女鬥士","Fist",1,0],["whitedog_beast_vt21",4,"light","芙洛麗塔","融雪羞澀少女","Sword",1,0],["sleep_puppy",4,"light","菲妮","使人入眠少女","Support",1,0],["desert_priest",4,"light","薩莉哈","沙漠之光","Support",1,0],["psycho_reaper_smr21",4,"light","索薇","夏日靈魂鍊金醫","Sword",1,0],["stella_2anv",4,"light","史黛拉","破碎女神","Support",1,0],["devil_clown_xm21",4,"light","佛爾斯","午夜聖誕老人","Special",0,0],["advanced_soldier",4,"light","卡拉比納","治安指揮官","Bow",0,0],["pbc_operator",4,"light","克拉爾特","光耀青藍","Support",0,0],["devil_princess",4,"dark","阿露姆","純真邪影","Fist",1,1],["battle_maid",4,"dark","瑪莉安妮","戰鬥女僕","Bow",1,1],["undead_boy",4,"dark","安狄","棺材喚靈師","Special",1,1],["warlock",4,"dark","里昂","深淵探求者","Bow",1,1],["swallow_knight_ny20",4,"dark","尤維爾(新年)","祭典餐飲統籌","Sword",1,1],["sword_beauty",4,"dark","葵澤","黑髮佳人","Sword",1,1],["touyakiren_ceo",4,"dark","拉芙","永夜之母","Special",1,1],["blindness_gunner",4,"dark","塞爾吉魯","眼罩槍手","Bow",1,1],["luna",4,"dark","露娜","年幼死靈術師","Special",1,1],["lady_gunner_smr20",4,"dark","瑪格麗特","黃昏玫瑰","Bow",1,1],["dinosaur_hunter",4,"dark","古里格","志在世界第一","Sword",1,1],["crazy_doctor",4,"dark","布萊茲","無賴鍊金術師","Special",1,1],["yamada_tae",4,"dark","山田妙","殭屍零號","Fist",1,1],["reaper_girl_hw20",4,"dark","伐露切(萬聖)","貓耳貓尾看守","Sword",1,1],["illegal_herbalist",4,"dark","澤爾瑪","紫煙叛徒","Support",1,1],["devil_woman_soldier_1anv",4,"dark","艾禮(周年)","白色魔族戰士","Fist",1,0],["subaru",4,"dark","菜月昴","對抗命運少年","Special",1,0],["mystery_agent",4,"dark","愛德華","揭破闇影者","Special",1,0],["walking_armor",4,"dark","隆達爾","哲學鎧甲","Sword",1,0],["desert_caravans",4,"dark","特威爾","商隊年輕首領","Fist",1,0],["koizumi_ituki",4,"dark","古泉一樹","微笑吟遊詩人","Support",1,0],["formercorrupt_detective",4,"dark","薇爾吉雅","詭譎女偵探","Bow",1,0],["psychic_projection",4,"dark","影丘龍一","操影異能者","Special",1,0],["informant_2anv",4,"dark","錫安(2周年)","詛咒密探","Sword",1,0],["alchemist",3,"fire","莉莉露","爆破煉金術師","Special",1,1],["pretty_witch",3,"fire","莓咪","見習女巫","Support",1,1],["gunslinger",3,"fire","伊利絲","沙漠槍手","Bow",1,1],["monster_hunter",3,"fire","哈修","邊境獵人","Bow",1,1],["black_doctor",3,"fire","吉恩","博愛亡命徒","Support",1,1],["cool_woman_soldier",3,"fire","朵列涅","赤咒女劍士","Sword",1,1],["berserker",3,"fire","吉爾斯拉得","狂戰士","Sword",1,1],["fire_shaman",3,"fire","焰妮","火焰巫女","Special",1,1],["disciplined_swordman",3,"fire","傑克","嚴明監察官","Sword",1,1],["birdwoman",3,"fire","庫蘭","鳥族女戰士","Bow",1,1],["tradition_healer",3,"fire","哈莉夏","調和治療師","Support",1,1],["brave_mouse",3,"fire","斯文","追虎小鼠","Sword",1,1],["sewing_girl",3,"fire","莉莉安","幸福裁縫師","Support",1,1],["wolf_assassin_wt21",3,"fire","克勞斯(白色情人節)","甜蜜刺客","Fist",1,0],["sniper",3,"water","凱羅斯","森林獵人","Bow",1,1],["urban_soldier",3,"water","翠絲塔","藍衣少女劍士","Sword",1,1],["hard_face_soldier",3,"water","瓦魯達","膽小重戰士","Fist",1,1],["nurse",3,"water","艾爾莎","白袍亡命徒","Support",1,1],["wolf_assassin",3,"water","克勞斯","獠牙刺客","Fist",1,1],["fox_companion",3,"water","白野","九尾助手","Support",1,1],["depraved_monk",3,"water","快癒","幻酒大師","Support",1,1],["sailor_girl",3,"water","拉緹","尋真水手少女","Bow",1,1],["cute_fafnir",3,"water","華浮","傻氣幼龍","Support",1,1],["mens_attire_girl",3,"water","莉可","靈泉優雅助理","Sword",1,1],["dryad_xm19",3,"water","卓雅","神聖樹靈","Support",1,1],["junior_yearngirl",3,"water","克拉拉","憧憬女傭兵","Sword",1,1],["little_shaman",3,"water","薩瑪莎","狂熱薩滿","Support",1,1],["scout_girl",3,"water","麗塔","淘氣偵察少女","Bow",1,1],["twin_blader",3,"thunder","尤娜","夢想雙劍士","Sword",1,1],["bee_girl",3,"thunder","赫妮","麻痺蜂娘","Bow",1,1],["lightning_fighter",3,"thunder","泰格","迅雷拳手","Fist",1,1],["outlaw_panther",3,"thunder","黑","博學黑豹","Fist",1,1],["wolf_swordsman",3,"thunder","艾爾貝魯托","獠牙小爵爺","Sword",1,1],["oni_girl",3,"thunder","御雷","風雷舞娘","Fist",1,1],["sociable_mestizo",3,"thunder","塔季亞娜","以酒壯膽冒險者","Sword",1,1],["magic_boy",3,"thunder","柯爾特","沒落雷術師","Support",1,1],["student_gunsmith",3,"thunder","夏・蘇蘇","愛槍學生技師","Support",0,1],["fortuneteller",3,"thunder","芙拉","遠見占卜師","Support",1,1],["cat_fighter_ny20",3,"thunder","喵嗚","新年盛裝貓娘","Fist",1,1],["old_mercenary",3,"thunder","巴爾根","孤高鐵人","Sword",1,1],["floating_girl",3,"thunder","弗拉娜","低重力少女","Support",1,1],["conjurer_girl",3,"thunder","フィ・ノノア","雨日偷閒","Special",0,0],["highlander",3,"wind","艾凡","轟鳴冒險者","Sword",1,1],["dryad",3,"wind","卓雅","森之寵女","Support",1,1],["lich",3,"wind","雷希塔洛","溫厚亡靈王","Support",1,1],["casino_dealer",3,"wind","芮絲卡","靈魂賭徒","Sword",1,1],["cat_fighter",3,"wind","咪烏","貓耳鬥士","Fist",1,1],["devil_clown",3,"wind","佛露絲","歡笑小丑","Bow",1,1],["herbalist",3,"wind","花托莉芙","春風草藥師","Support",1,1],["spearman",3,"wind","柯納","巧技槍手","Sword",1,1],["trap_errand",3,"wind","賈斯塔","陷阱牧場主","Fist",1,1],["gang_girl",3,"wind","凱特","銜牙義賊","Sword",1,1],["lazy_genious",3,"wind","涅緹","魔法理論追尋者","Support",1,1],["rookie_adventurer",3,"wind","ミレット","新手冒險者","Sword",0,0],["priest",3,"light","柯莉娜","愛之祭司","Support",1,1],["lady_gunner",3,"light","瑪爾格莉特","靚麗槍手","Bow",1,1],["woman_knight",3,"light","瑟希利亞","守護女騎士","Sword",1,1],["docking_beast",3,"light","奧利歐","騎獸送貨人","Fist",1,1],["exorcist_oldman",3,"light","勞爾","無人島酒莊主","Sword",1,1],["half_knight",3,"light","米雷斯","青澀小騎士","Sword",1,1],["reporter",3,"light","瑠瑠卡","菜鳥女記者","Sword",1,1],["wild_wolfgirl",3,"light","加蘿","迷途狼女","Fist",1,1],["moth_girl",3,"light","茉拉","純真蛾娘","Support",1,1],["priest_hw20",3,"light","可莉娜(萬聖)","淘氣徒弟","Support",1,1],["junior_soldier",3,"light","克蘇哈","見習衛兵","Bow",1,0],["skateboard_boy",3,"light","阿克謝姆","飛板新手","Fist",1,0],["kids_gunner",3,"light","魯・路特","幻想後宮生活","Bow",0,0],["reaper_girl",3,"dark","法露琪","亡者守護者","Sword",1,1],["chakram_shooter",3,"dark","夏里爾","沉默求職者","Bow",1,1],["devil_woman_soldier",3,"dark","艾禮","魔族叛徒","Fist",1,1],["informant",3,"dark","錫安","厚望情報販","Sword",1,1],["arabic_swordman",3,"dark","阿迪爾","倖存鬥士","Sword",1,1],["dark_nursemaid",3,"dark","桃樂西亞","壞脾氣女僕","Support",1,1],["bearish_darkwitch",3,"dark","蕾貝卡","夢幻魔術師","Support",1,1],["monster_attract",3,"dark","諾塞爾","魔物鍾愛者","Sword",1,1],["delusion_girl",3,"dark","梅莉露","妄想冒險家","Support",1,1],["delusion_girl_xm20",3,"dark","梅利露(聖誕)","困惑妄想聖誕老人","Support",1,0],["mummy_boy",3,"dark","塔爾哈","古怪木乃伊少年","Special",1,0],["revenge_rabbit",3,"dark","柯蒂","兔族小戰士","Fist",1,0],["assistant_boy",3,"dark","魯希爾","見習小偵探","Bow",0,0],["guardian_golem",2,"fire","魔像","風塵守護者","Fist",1,1],["owl",2,"wind","波吉特","森林智者","Support",1,1],["fox",2,"wind","鎌鼬","風刃之靈","Bow",1,1],["towa_namakubi",2,"wind","Ｃ・Ｆ・奇蹟","魯莽應援之禮","Bow",0,1],["towa_vtuber",2,"wind","斗和奇蹟","超時空奇異歌姬","Fist",1,0],["kinoko",1,"fire","奇諾","孢子之靈","Fist",1,1],["slango_red",1,"fire","赤色噗露","火之彈彈","Fist",1,1],["spirit_fire",1,"fire","炎靈","火焰之靈","Support",1,1],["slango_blue",1,"water","青色噗露","水之彈彈","Fist",1,1],["slango_yellow",1,"thunder","黃色噗露","雷之彈彈","Fist",1,1],["paralysis_hedgehog",1,"thunder","帕拉鼠","雷針小鼠","Bow",1,1],["slango_green",1,"wind","綠色噗露","風之彈彈","Fist",1,1]];
window.GAME_DATA.skills = {
    word: { fire: "烈焰", water: "蒼流", thunder: "迅雷", wind: "疾風", light: "聖光", dark: "闇影" },
    move: { knight: "斬", fighter: "拳", ranger: "弓", supporter: "祈", special: "爆" },
    art: { knight: "slash", fighter: "punch", ranger: "beam", supporter: "heal", special: "burst" },
    powerFlipNames: { knight: "旋刃", fighter: "連拳", ranger: "貫光", special: "爆裂", supporter: "應援" },
    tag: {
        knight: "突進・重擊", fighter: "貼身・連打", ranger: "光束・多段",
        supporter: "回復・全隊攻UP", special: "範圍・重擊"
    },
    desc: {
        knight: "衝向敵人揮出重斬，突進後追加範圍傷害。",
        fighter: "貼身連續出拳，蓄能最快、段數最多。",
        ranger: "沿彈射方向射出一道光束，命中後追加連段。",
        supporter: "回復全隊生命並提升全隊攻擊，同時替隊友補一大格技能能量。",
        special: "在目標身上引爆範圍衝擊，並替全隊補一小格技能能量。"
    },
    traitProfile: {
        knight: { key: "dash-cleave", label: "突進斬擊", effect: "突進命中後追加範圍斬擊" },
        fighter: { key: "combo-strike", label: "連段重擊", effect: "近身多段連擊，逐段判定傷害" },
        ranger: { key: "piercing-beam", label: "貫穿光束", effect: "直線貫穿目標並追加追擊" },
        supporter: { key: "team-support", label: "全隊支援", effect: "治療隊伍、提升攻擊並補充隊友技能能量" },
        special: { key: "area-burst", label: "範圍爆發", effect: "範圍重擊並補充隊友技能能量" }
    },
    unitDesc: {
        alchemist: "朝目標投出炸彈引爆，衝擊後再拖一次延遲爆炸；兩段都吃屬性克制，並替全隊補一小格技能能量。"
    }
};

// Static encounter catalogue. Keep names, elements, and asset paths here;
// combat code consumes these records without owning their content.
window.GAME_DATA.normalPoringSkins = [
    { name: "波利", file: "poring.png" },
    { name: "波波利", file: "poporing.png" },
    { name: "土波利", file: "drops.png" },
    { name: "冰波利", file: "marin.png" }
];
window.GAME_DATA.towerBosses = [
    { id: "tower_angeling", name: "天使波利", element: "light", icon: "👼", skin: "asset/monster/ro/angeling.png" },
    { id: "tower_ghostring", name: "幽靈波利", element: "dark", icon: "👻", skin: "asset/monster/ro/ghostring.png" },
    { id: "tower_deviling", name: "惡魔波利", element: "dark", icon: "😈", skin: "asset/monster/ro/deviling.png" },
    { id: "tower_chimney_brown", name: "褐方體惡魔", element: "light", icon: "🟫", roArt: true, skin: "asset/monster/ro/chimney_brown.png" },
    { id: "tower_chimney_black", name: "黑方體惡魔", element: "light", icon: "⬛", roArt: true, skin: "asset/monster/ro/chimney_black.png" }
];
window.GAME_DATA.enemies = [
    { id: "slime_red", name: "赤色噗露", icon: "👹", element: "fire" },
    { id: "slime_blue", name: "青色噗露", icon: "💧", element: "water" },
    { id: "kamaitachi", name: "鎌鼬", icon: "🦊", element: "wind" },
    { id: "pararat", name: "帕拉鼠", icon: "🦔", element: "thunder" },
    // 圖鑑中的 TOVA 聯動角色仍不列入可戰鬥的普通怪物。
    { id: "slime_yellow", name: "黃色噗露", icon: "⚡", element: "thunder" },
    { id: "slime_green", name: "綠色噗露", icon: "🍃", element: "wind" },
    { id: "kinoko", name: "奇諾", icon: "🍄", element: "fire" },
    { id: "spirit_fire", name: "炎靈", icon: "🔥", element: "fire" },
    { id: "golem", name: "魔像", icon: "🗿", element: "fire" },
    { id: "owl", name: "波吉特", icon: "🦉", element: "wind" },
    { id: "chimney_angel_blue", name: "天使藍方體惡魔", icon: "🟦", element: "light", roArt: true, skin: "asset/monster/ro/chimney_angel_blue.png" },
    { id: "chimney_angel_red", name: "天使紅方體惡魔", icon: "🟥", element: "light", roArt: true, skin: "asset/monster/ro/chimney_angel_red.png" },
    { id: "chimney_angel_ice", name: "冰河天使方體惡魔", icon: "🧊", element: "light", roArt: true, skin: "asset/monster/ro/chimney_angel_blue.png" }
];
window.GAME_DATA.bosses = [
    { id: "colossus_fire", name: "赤焰龍・焚原", element: "fire", icon: "🌋" },
    { id: "colossus_water", name: "滄溟貝・溺音", element: "water", icon: "💧" },
    { id: "colossus_wind", name: "金鬣鷲・掠雲", element: "wind", icon: "🌪️" },
    { id: "colossus_thunder", name: "玄雷機・軋空", element: "thunder", icon: "🌩️" },
    { id: "ancient_golem", name: "遠古石魔", element: "fire", icon: "🗿" }
];
window.GAME_DATA.gateBossAppearances = {
    fire: { name: "赤焰龍・焚原", skin: "asset/battle/gate-boss/nidhogg.webp", alpha: true, face: -100, lift: 88, zoom: 1.18 },
    water: { name: "滄溟貝・溺音", skin: "asset/battle/gate-boss/water.webp", alpha: true, face: -70, lift: 64, zoom: 1 },
    wind: { name: "金鬣鷲・掠雲", skin: "asset/battle/gate-boss/wind.webp", alpha: true, face: -129, lift: 91, zoom: 1.42 },
    thunder: { name: "玄雷機・軋空", skin: "asset/battle/gate-boss/thunder.webp", alpha: true, face: -83, lift: 77, zoom: 1 }
};

// Tunable rules and presentation metadata. Keep behavior in modules and values here.
window.GAME_DATA.elements = {
    definitions: {
        fire: { label: "火", cls: "el-fire", color: "#ff4757" },
        water: { label: "水", cls: "el-water", color: "#3ea0ff" },
        thunder: { label: "雷", cls: "el-thunder", color: "#ffa500" },
        wind: { label: "風", cls: "el-wind", color: "#2ed573" },
        light: { label: "光", cls: "el-light", color: "#e8b923" },
        dark: { label: "闇", cls: "el-dark", color: "#b98bff" }
    },
    advantage: { water: "fire", fire: "wind", wind: "thunder", thunder: "water", light: "dark", dark: "light" },
    labels: { fire: "火", water: "水", thunder: "雷", wind: "風", light: "光", dark: "闇", all: "全" },
    colors: { fire: "#ff4757", water: "#3ea0ff", thunder: "#ffa500", wind: "#2ed573", light: "#e8b923", dark: "#b98bff", all: "#8fa0c0" }
};
window.GAME_DATA.characterRules = {
    limitedIds: [
        "battle_maid_xm19", "heavenly_one", "tiger_treasure_hunter_smr20", "kunoichi_1anv", "lady_summoner_xm20", "onmyoji_boy_wt21",
        "bodysuit_trooper_smr21", "suzumiya_haruhi", "pirates_girl_2anv", "tsundere_bountyhunter_vt22",
        "lightbullet_wiz_ny20", "prince_zero_smr20", "minamoto_sakura", "emilia", "rem", "mermaid_1halfanv", "freeze_eye_xm21",
        "nagato_yuki", "ice_witch_2anv", "kyouka", "samurai_xm19", "illusionist_smr20", "dimension_witch_smr20",
        "rec_android_1anv", "heavenly_two", "machine_police_girl_smr21", "white_tiger_2anv", "nikaido_saki",
        "kokkoro", "wind_spgirl_1anv", "timid_kunoichi_ny21", "elf_princess_1halfanv", "bigwing_shaman_smr21",
        "mercenary_smr21", "combat_animal_xm21", "wind_dragon_wt22", "pecorine", "arisa", "ram", "subaru"
    ],
    openElements: ["fire", "water", "thunder", "wind"],
    weaponTypes: { Sword: "knight", Fist: "fighter", Bow: "ranger", Support: "supporter", Special: "special" },
    typeStats: {
        knight: { atk: 12, hp: 150 }, fighter: { atk: 13, hp: 140 }, ranger: { atk: 11, hp: 135 },
        supporter: { atk: 9, hp: 150 }, special: { atk: 12, hp: 125 }
    },
    // 稀有度成長倍率：四星基準、常駐五星 +20%、限定五星 +50%；不改等級上限與突破成本。
    rarityPower: { fourStar: 1, permanentFiveStar: 1.20, limitedFiveStar: 1.50 },
    // 隊長基礎加成依稀有度區分；生命為固定 HP，不是百分比。
    leaderRarityBonus: {
        fourStar: { crit: .01, hp: 20 },
        permanentFiveStar: { crit: .05, hp: 40 },
        limitedFiveStar: { crit: .10, hp: 60 }
    },
    leaderTemplates: {
        knight: { atk: .12, pfComboDamage: .12, comboThreshold: 15, label: "連擊追擊", desc: "Combo 達 15 以上時，強力彈射傷害 +12%" },
        fighter: { atk: .12, collisionDamage: .15, label: "近身爆發", desc: "角色直接撞擊敵人時，碰撞傷害 +15%" },
        ranger: { atk: .10, weakSkillDamage: .18, label: "弱點狙擊", desc: "Boss 蓄力弱點出現時，技能傷害 +18%" },
        supporter: { atk: .10, gauge: .10, heal: .10, label: "隊伍充能", desc: "同屬性隊友技能蓄能 +10%、受到治療量 +10%" },
        special: { atk: .12, breakDamage: .15, label: "破防支援", desc: "Boss BREAK／DOWN 期間，全隊傷害 +15%" }
    },
    shardNeed: 10,
    starterIds: ["alk", "bishop_girl", "thunder_dragon", "white_tiger"]
};
window.GAME_DATA.combatRules = {
    typeInfo: {
        knight: { n: "劍士", img: "type_knight", d: "重斬後突進追擊，兼顧正面傷害與近身範圍" },
        fighter: { n: "格鬥", img: "type_fighter", d: "貼身連打，段數最多" },
        ranger: { n: "射擊", img: "type_ranged", d: "一道光束貫穿，打中就吃滿" },
        supporter: { n: "輔助", img: "type_supporter", d: "回復全隊並提升攻擊，本身不造成傷害" },
        special: { n: "特殊", img: "type_special", d: "範圍爆炸，單發最重" }
    },
    typePassives: {
        ranger: { name: "絕對貫穿", desc: "射擊型 PF 啟動時球體會穿過敵人，不受碰撞反彈且每隻敵人只計一次直擊；相關效果由天賦強化。" },
        knight: { name: "永續風刃", desc: "連擊達 15 後，下次 PF 短暫浮游且仍保留碰撞；生命回復與浮游能力可由天賦強化。" },
        fighter: { name: "爆裂定格", desc: "格鬥型 PF 首次命中追加範圍衝擊；衝擊範圍與暴擊率可由天賦強化。" },
        special: { name: "星爆時空", desc: "擊中 Boss 弱點時延長毀滅炮讀條，形成短暫時空緩速；控制效果可由天賦強化。" },
        supporter: { name: "狂熱共鳴", desc: "FEVER 期間全隊攻擊翻倍、碰撞蓄能翻倍；攻擊加成、護盾與技能蓄能可由天賦進一步強化。" }
    },
    skillCooldowns: { knight: 15, fighter: 12, ranger: 12, supporter: 18, special: 18 },
    skillChargeTime: 2.0, skillHitCharge: 2.4, skillCastGapMs: 400,
    skillChain: { requiredMembers: 3, windowMs: 6000, downMs: 1500 },
    skillActions: {
        knight: { openingDamage: 2.2, followups: 2, followupGapMs: 180, followupDamage: 1, areaRadius: 110 },
        fighter: { hits: 4, hitGapMs: 100, hitDamage: .8 },
        ranger: { beamLength: 640, beamWidth: 18, openingDamage: 1.9, followups: 3, followupGapMs: 90, followupDamage: .75 },
        supporter: { healBase: .10, healTalentPerRank: .02, attackBuff: .30, buffDurationMs: 6000, allyChargeSeconds: 3 },
        special: { damage: 2.8, areaRadius: 155, allyChargeSeconds: 2 },
        alchemist: { damage: 1.5, areaRadius: 155, followups: 2, followupGapMs: 260, followupDamage: 1.3, followupRadius: 170, popScale: 1.4, allyChargeSeconds: 2 }
    },
    critDamage: 1.5, critRate: .08, damageScale: 1.20,
    comboRush: .01, comboDamageCap: 50, comboHoldMs: 2100,
    flipAt: [9, 15, 39],
    tower: { bossEvery: 10, normalWaves: 3, normalSeconds: 60, bossSeconds: 90, weakDurationMs: 9000, breakMs: 7000, breakTaken: 1.8 },
    status: { burnTicks: 5, burnGapMs: 400, burnMultiplier: .3, slowMs: 3000, gustPush: 420, gustPushBoss: 320, gustGapMs: 600, paralyzeMs: 800, paralyzeGapMs: 3000 },
    gateBaseLevel: 30,
    fever: { base: 1000, step: 500, cap: 3000, addPerEnemy: 18, durationMs: 10000, launchVelocity: 1060,
        aim: { rollMs: 1300, chance: .18, durationMs: 580, turnRate: 1.25 },
        pads: { count: 3, r: 36, push: 1320, respawnMs: 900, top: 300, bottom: 560, gap: 112 } },
    physics: { width: 430, height: 760, gravity: 1180, air: .9995, maxVelocity: 1500, wallRestitution: .66 },
    flip: { up: -.785, off: -2, radius: 9, glow: ["", [6, .45], [9, .6], [13, .8]] },
    presentation: { stateMs: { attack: 320, hurt: 260, skill: 700, victory: 1200, enter: 900 }, artExtensions: ["webp", "png"] }
};
window.GAME_DATA.encounters = {
    gates: [
        { id: "thunder", el: "thunder", boss: "colossus_thunder", gate: "雷鳴禁域", zone: "ruin", mult: 9, amult: 1.2, shards: 50, replay: 5, par: 50, hint: "玄雷機・軋空盤踞在銳牙的戰場。風克雷——希薇在場上，撞擊和克制一起吃到。" },
        { id: "wind", el: "wind", boss: "colossus_wind", gate: "翠風裂谷", zone: "gale", mult: 12, amult: 1.3, shards: 50, replay: 5, par: 65, hint: "金鬣鷲・掠雲的風壓很硬。火克風——羅爾夫是這道門的正解。" },
        { id: "water", el: "water", boss: "colossus_water", gate: "蒼瀧深域", zone: "frost", mult: 16, amult: 1.5, shards: 50, replay: 5, par: 80, hint: "滄溟貝・溺音鎮守蒼瀧深域，是四道門裡最厚的一層。雷克水——讓斬鐵打頭陣。" },
        { id: "fire", el: "fire", boss: "colossus_fire", gate: "紅蓮熔境", zone: "lava", mult: 6, amult: 1.1, shards: 50, replay: 5, par: 40, hint: "赤焰龍・焚原是門口的新手王。水克火——莉潔兒或尤維爾上場，別用火對噴。" }
    ],
    zones: [
        { id: "star_see", name: "精靈的樂園", hue: 0, sat: .80, bright: .34, tint: "rgba(16,22,40,.34)" },
        { id: "lava", name: "砂塵的王國", hue: -22, sat: .85, bright: .32, tint: "rgba(72,16,10,.36)" },
        { id: "gale", name: "大海的盡頭", hue: 48, sat: .70, bright: .36, tint: "rgba(14,58,44,.32)" },
        { id: "ruin", name: "銳牙的戰場", hue: 186, sat: .75, bright: .30, tint: "rgba(52,44,10,.34)" },
        { id: "frost", name: "機人的行星", hue: 160, sat: .62, bright: .38, tint: "rgba(18,42,72,.34)" },
        { id: "void", name: "大和之都", hue: 262, sat: .72, bright: .28, tint: "rgba(44,14,64,.38)" }
    ],
    zoneStageCount: 5,
    towerFields: { normal: "polita-field-crystal-v2", boss: "polita-sky" }
};
// 特殊副本以波利塔戰鬥為基底。金幣／經驗副本維持「四波小怪＋一波 Boss」；
// 後面三條長副本改用 waves 逐波指定怪、強度與隻數，中途戰死不發獎，最後一波打完才結算。
const RO = "asset/monster/ro/";
window.GAME_DATA.specialDungeons = [
    { id: "gold-easy", kind: "gold", name: "金幣副本", difficulty: "簡單", level: 10, field: { normal: "special-gold-dungeon", boss: "special-gold-dungeon" }, mobId: 2479, mobName: "受詛咒寶箱", mobIcon: "🧰", mobSkin: "asset/monster/ro/cursed_box.png", bossId: 2747, bossName: "憤怒米洛斯", bossIcon: "🐂", bossSkin: "asset/monster/ro/wrath_minos.png", clearGold: 10000, bossRainbow: 5 },
    { id: "gold-normal", kind: "gold", name: "金幣副本", difficulty: "普通", level: 50, field: { normal: "special-gold-dungeon", boss: "special-gold-dungeon" }, mobId: 2479, mobName: "受詛咒寶箱", mobIcon: "🧰", mobSkin: "asset/monster/ro/cursed_box.png", bossId: 2747, bossName: "憤怒米洛斯", bossIcon: "🐂", bossSkin: "asset/monster/ro/wrath_minos.png", clearGold: 50000, bossRainbow: 10 },
    { id: "gold-hard", kind: "gold", name: "金幣副本", difficulty: "困難", level: 100, field: { normal: "special-gold-dungeon", boss: "special-gold-dungeon" }, mobId: 2479, mobName: "受詛咒寶箱", mobIcon: "🧰", mobSkin: "asset/monster/ro/cursed_box.png", bossId: 2747, bossName: "憤怒米洛斯", bossIcon: "🐂", bossSkin: "asset/monster/ro/wrath_minos.png", clearGold: 100000, bossRainbow: 20 },
    { id: "exp-easy", kind: "experience", name: "經驗副本", difficulty: "簡單", level: 10, field: { normal: "special-exp-dungeon", boss: "special-exp-dungeon" }, mobId: 2995, mobName: "被釋放的玩具熊", mobIcon: "🧸", mobSkin: "asset/monster/ro/released_toy_bear.png", bossId: 2622, bossName: "迅捷薇歐莉", bossIcon: "🎻", bossSkin: "asset/monster/ro/swift_viole.png", clearExperience: 10, clearHighExperience: 1, bossRainbow: 5 },
    { id: "exp-normal", kind: "experience", name: "經驗副本", difficulty: "普通", level: 50, field: { normal: "special-exp-dungeon", boss: "special-exp-dungeon" }, mobId: 2995, mobName: "被釋放的玩具熊", mobIcon: "🧸", mobSkin: "asset/monster/ro/released_toy_bear.png", bossId: 2622, bossName: "迅捷薇歐莉", bossIcon: "🎻", bossSkin: "asset/monster/ro/swift_viole.png", clearExperience: 50, clearHighExperience: 5, bossRainbow: 10 },
    { id: "exp-hard", kind: "experience", name: "經驗副本", difficulty: "困難", level: 100, field: { normal: "special-exp-dungeon", boss: "special-exp-dungeon" }, mobId: 2995, mobName: "被釋放的玩具熊", mobIcon: "🧸", mobSkin: "asset/monster/ro/released_toy_bear.png", bossId: 2622, bossName: "迅捷薇歐莉", bossIcon: "🎻", bossSkin: "asset/monster/ro/swift_viole.png", clearExperience: 100, clearHighExperience: 10, bossRainbow: 20 },
    // 三條長副本：逐波指定怪、強度與隻數，中途戰死不發獎，最後一波打完才結算。
    {
        id: "lab-madness", kind: "lab", group: "lab", name: "生體研究所：精神崩潰觀察迴廊", difficulty: "觀察迴廊",
        level: 100, icon: "🧪", element: "dark", field: { normal: "lab-corridor", boss: "lab-observation" },
        waves: [
            { mobs: [{ id: 1652, name: "暗●劍士", icon: "⚔️", skin: RO + "dark_swordsman.png", count: 3 }, { id: 1653, name: "暗●盜賊", icon: "🗡️", skin: RO + "dark_thief.png", count: 3 }] },
            { mobs: [{ id: 1654, name: "暗●商人", icon: "💰", skin: RO + "dark_merchant.png", count: 3 }, { id: 1655, name: "暗●服事", icon: "📿", skin: RO + "dark_acolyte.png", count: 3 }] },
            { mobs: [{ id: 1656, name: "暗●弓箭手", icon: "🏹", skin: RO + "dark_archer.png", count: 3 }, { id: 1657, name: "暗●魔法師", icon: "🔮", skin: RO + "dark_wizard.png", count: 3 }] },
            { boss: true, mobs: [{ id: 1658, name: "暗●劍士・賽尼亞", icon: "🎖️", skin: RO + "dark_swordsman.png", count: 2 }] }
        ],
        reward: { shard: 60, highExperience: 20, breakthrough: 2 }
    },
    {
        id: "lab-virus", kind: "lab", group: "lab", name: "生體研究所：零號原始病毒禁區", difficulty: "病毒禁區",
        level: 120, icon: "☣️", element: "dark", field: { normal: "lab-corridor", boss: "lab-virus" },
        waves: [
            { mobs: [{ id: 1634, name: "暗●騎士領主", icon: "🛡️", skin: RO + "dark_knight_lord.png", count: 3 }, { id: 1635, name: "暗●十字刺客", icon: "🔪", skin: RO + "dark_assassin.png", count: 3 }] },
            { mobs: [{ id: 1636, name: "暗●神工匠", icon: "🔧", skin: RO + "dark_artisan.png", count: 3 }, { id: 1637, name: "暗●神官", icon: "🕊️", skin: RO + "dark_priest.png", count: 3 }] },
            { mobs: [{ id: 1638, name: "暗●神射手", icon: "🎯", skin: RO + "dark_sniper.png", count: 3 }, { id: 1639, name: "暗●超魔導師", icon: "🌟", skin: RO + "dark_archmage.png", count: 3 }] },
            { mobs: [{ id: 2221, name: "暗●聖殿十字軍", icon: "⚜️", skin: RO + "dark_paladin.png", count: 3 }, { id: 2222, name: "暗●創造者", icon: "⚗️", skin: RO + "dark_creator.png", count: 3 }] },
            { mobs: [{ id: 2224, name: "暗●武術宗師", icon: "🥋", skin: RO + "dark_grandmaster.png", count: 3 }, { id: 2223, name: "暗●智者", icon: "📖", skin: RO + "dark_sage.png", count: 3 }] },
            { mobs: [{ id: 2226, name: "暗●搞笑藝人", icon: "🎪", skin: RO + "dark_clown.png", count: 3 }, { id: 2227, name: "暗●吉普賽", icon: "🃏", skin: RO + "dark_gypsy.png", count: 3 }] },
            { boss: true, mobs: [{ id: 20390, name: "零號原始病毒", icon: "🦠", skin: RO + "zero_virus.png", count: 2 }] }
        ],
        reward: { shard: 90, highExperience: 35, breakthrough: 3 }
    },
    {
        id: "rift-babylon", kind: "rift", group: "rift", name: "時空裂縫：巴比倫之獄", difficulty: "地獄",
        level: 80, icon: "🌌", element: "dark", field: { normal: "polita-sky-dark", boss: "polita-sky-dark" },
        waves: [
            { boss: true, mobs: [{ id: 1090, name: "波利之王", icon: "👑", skin: RO + "poring_lord.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1086, name: "黃金蟲", icon: "🪲", skin: RO + "golden_bug.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1150, name: "月夜貓", icon: "🌙", skin: RO + "moonlight.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1115, name: "虎王", icon: "🐅", skin: RO + "tiger_lord.png", count: 1 }] },
            { boss: true, mobs: [{ id: 21555, name: "草原蜂后", icon: "🐝", skin: RO + "grass_bee_queen.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1389, name: "德古拉男爵", icon: "🧛", skin: RO + "baron_dracula.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1046, name: "死靈", icon: "💀", skin: RO + "necromancer.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1190, name: "獸人酋長", icon: "🪓", skin: RO + "orc_lord.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1147, name: "蟻后", icon: "🐜", skin: RO + "ant_queen.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1272, name: "黑暗之王", icon: "🌑", skin: RO + "dark_lord.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1312, name: "烏龜將軍", icon: "🐢", skin: RO + "turtle_general.png", count: 1 }] },
            { boss: true, mobs: [{ id: 1157, name: "法老王", icon: "⚱️", skin: RO + "pharaoh.png", count: 1 }] },
            { boss: true, level: 160, mobs: [{ id: 22174, name: "巴比倫之主", icon: "🩸", skin: RO + "babylon_lord.png", count: 1, big: true }] }
        ],
        reward: { shard: 130, highExperience: 50, breakthrough: 5 }
    }
];
window.GAME_DATA.summon = {
    singleCost: 50, tenCost: 450, singleTicketExchangeCost: 50, tenTicketExchangeCost: 450, limitedPity: 120, softPityStart: 90, softPityStep: .005,
    limitedBaseRate: .001,
    fragmentMin: 1, fragmentMax: 3, duplicateFragments: 10,
    fourStarCharacterRate: .08, fourStarFragmentRate: .15, fourStarBreakthroughStoneRate: .04, highExperienceCrystalRate: .06,
    permanentExchangeCost: 4500
};
window.GAME_DATA.shop = { staminaRestoreAmount: 15, staminaCrystalCost: 100, limitedBreakthroughStoneCost: 450, highExperienceCrystalCost: 200 };
window.GAME_DATA.ui = {
    elementIconFiles: { fire: "element_red", water: "element_blue", thunder: "element_yellow", wind: "element_green", light: "element_white", dark: "element_black" },
    homeTabs: [
        { k: "home", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-home.png" alt="" draggable="false">', t: "主頁" },
        { k: "title", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-chars.png" alt="" draggable="false">', t: "稱號系統" },
        { k: "talents", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-talents.png" alt="" draggable="false">', t: "天賦" },
        { k: "team", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-team.png" alt="" draggable="false">', t: "出發冒險" },
        { k: "book", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-book.png" alt="" draggable="false">', t: "圖鑑" },
        { k: "menu", ic: '<img class="nav-art" src="asset/ui/nav-tabs/tab-menu.png" alt="" draggable="false">', t: "選單" }
    ],
    pages: { chars: "角色管理", boss: "BOSS戰", shop: "轉蛋商店", exchange: "交換所", leaderboard: "排行榜", book: "圖鑑", title: "稱號系統", talents: "天賦", menu: "選單", items: "道具資源", checkin: "每日簽到", offline: "離線收益", goldExchange: "金幣交易所", pass: "通行證" },
    dexRoles: { Sword: "劍士", Fist: "格鬥", Bow: "射擊", Support: "輔助", Special: "特殊" }
};
window.GAME_DATA.titles = [
    { id:"novice", name:"見習勇者", category:"冒險", tier:1, desc:"開始你的旅程", requirement:{type:"always"}, bonus:{hp:.0025} },
    { id:"hunter", name:"初戰告捷", category:"戰鬥", tier:1, desc:"累計擊殺 5 隻敵人", requirement:{type:"kills",value:5}, bonus:{atk:.0025} },
    { id:"slayer", name:"彈射狩獵者", category:"戰鬥", tier:1, desc:"累計擊殺 50 隻敵人", requirement:{type:"kills",value:50}, bonus:{powerFlipDamage:.005} },
    { id:"kills-200", name:"戰陣破風", category:"戰鬥", tier:2, desc:"累計擊殺 200 隻敵人", requirement:{type:"kills",value:200}, bonus:{atk:.0025} },
    { id:"combo-star", name:"連擊新星", category:"戰鬥", tier:2, desc:"累計擊殺 500 隻敵人", requirement:{type:"kills",value:500}, bonus:{gauge:.005} },
    { id:"kills-1000", name:"千擊如雷", category:"戰鬥", tier:3, desc:"累計擊殺 1,000 隻敵人", requirement:{type:"kills",value:1000}, bonus:{powerFlipDamage:.005} },
    { id:"monster-breaker", name:"魔物破壞者", category:"戰鬥", tier:3, desc:"累計擊殺 2,000 隻敵人", requirement:{type:"kills",value:2000}, bonus:{atk:.005} },
    { id:"kills-5000", name:"裂陣之星", category:"戰鬥", tier:4, desc:"累計擊殺 5,000 隻敵人", requirement:{type:"kills",value:5000}, bonus:{crit:.0015} },
    { id:"legend-hunter", name:"傳說獵人", category:"戰鬥", tier:5, desc:"累計擊殺 10,000 隻敵人", requirement:{type:"kills",value:10000}, bonus:{atk:.0075,hp:.0075} },
    { id:"deep", name:"踏塔者", category:"冒險", tier:1, desc:"抵達波利塔第 10 層", requirement:{type:"stage",value:10}, bonus:{hp:.005} },
    { id:"tower-20", name:"塔路開拓者", category:"冒險", tier:2, desc:"抵達波利塔第 20 層", requirement:{type:"stage",value:20}, bonus:{hp:.0025} },
    { id:"master", name:"高塔探索者", category:"冒險", tier:2, desc:"抵達波利塔第 30 層", requirement:{type:"stage",value:30}, bonus:{skillDamage:.005} },
    { id:"tower-45", name:"霧階旅人", category:"冒險", tier:3, desc:"抵達波利塔第 45 層", requirement:{type:"stage",value:45}, bonus:{gauge:.0025} },
    { id:"tower-60", name:"雲端行者", category:"冒險", tier:3, desc:"抵達波利塔第 60 層", requirement:{type:"stage",value:60}, bonus:{gauge:.0075} },
    { id:"tower-80", name:"星階守望者", category:"冒險", tier:4, desc:"抵達波利塔第 80 層", requirement:{type:"stage",value:80}, bonus:{skillDamage:.005} },
    { id:"tower-100", name:"塔頂征服者", category:"冒險", tier:5, desc:"抵達波利塔第 100 層", requirement:{type:"stage",value:100}, bonus:{atk:.01} },
    { id:"rank-10", name:"歷練之證", category:"成長", tier:1, desc:"主帳號 RANK 達到 10", requirement:{type:"rank",value:10}, bonus:{atk:.0025,hp:.0025} },
    { id:"rank-30", name:"熟練冒險者", category:"成長", tier:2, desc:"主帳號 RANK 達到 30", requirement:{type:"rank",value:30}, bonus:{skillDamage:.0075} },
    { id:"rank-60", name:"百戰旅人", category:"成長", tier:3, desc:"主帳號 RANK 達到 60", requirement:{type:"rank",value:60}, bonus:{powerFlipDamage:.01} },
    { id:"rank-80", name:"淬鍊先鋒", category:"成長", tier:3, desc:"主帳號 RANK 達到 80", requirement:{type:"rank",value:80}, bonus:{hp:.005} },
    { id:"rank-100", name:"不屈傳奇", category:"成長", tier:4, desc:"主帳號 RANK 達到 100", requirement:{type:"rank",value:100}, bonus:{atk:.01,hp:.01} },
    { id:"rank-150", name:"極境勇者", category:"成長", tier:5, desc:"主帳號 RANK 達到 150", requirement:{type:"rank",value:150}, bonus:{atk:.005,hp:.005} },
    { id:"team", name:"新銳召集人", category:"蒐集", tier:1, desc:"解鎖 3 位角色", requirement:{type:"unlockedCharacters",value:3}, bonus:{hp:.005} },
    { id:"roster-8", name:"八方集結", category:"蒐集", tier:1, desc:"解鎖 8 位角色", requirement:{type:"unlockedCharacters",value:8}, bonus:{gauge:.0025} },
    { id:"roster-15", name:"夥伴收藏家", category:"蒐集", tier:2, desc:"解鎖 15 位角色", requirement:{type:"unlockedCharacters",value:15}, bonus:{gauge:.0075} },
    { id:"roster-30", name:"星辰名冊", category:"蒐集", tier:3, desc:"解鎖 30 位角色", requirement:{type:"unlockedCharacters",value:30}, bonus:{skillDamage:.01} },
    { id:"roster-40", name:"群星策展人", category:"蒐集", tier:4, desc:"解鎖 40 位角色", requirement:{type:"unlockedCharacters",value:40}, bonus:{skillDamage:.005} },
    { id:"roster-50", name:"羈絆大師", category:"蒐集", tier:5, desc:"解鎖 50 位角色", requirement:{type:"unlockedCharacters",value:50}, bonus:{atk:.0075,hp:.0075} },
    { id:"hexa", name:"四象共鳴", category:"蒐集", tier:2, desc:"名冊收集火、水、雷、風四種屬性", requirement:{type:"unlockedElements",value:4}, bonus:{crit:.0025} },
    { id:"penta", name:"全能編隊", category:"蒐集", tier:3, desc:"名冊收集五種攻擊型態", requirement:{type:"unlockedTypes",value:5}, bonus:{powerFlipDamage:.01} },
    { id:"beta-founder", name:"創世見證者", category:"封測限定", tier:5, desc:"領取異界開拓祭全部四項封測任務獎勵；正式開服保留", requirement:{type:"betaSouvenir",value:"beta-founder"}, bonus:{} }
];
// 正式開服發布時才切換為 launch；同一 launchVersion 的清檔只會執行一次。
window.GAME_DATA.betaEvent = { phase:"beta", launchVersion:"launch-1" };
window.GAME_DATA.progression = {
    characterGrowth: {
        paths: {
            skill: { name: "技能", icon: "✦", desc: "每階技能傷害 +6%、技能治療量 +2%" },
            pf: { name: "強力彈射", icon: "⚡", desc: "每階 PF 傷害與應援攻擊加成效果 +8%" },
            survival: { name: "生存", icon: "🛡", desc: "每階最大生命 +4%、受到傷害 -1%" }
        },
        baseCap: 80, maxCap: 100, capStep: 5,
        breakthroughRanks: [40, 60, 80, 100], breakthroughCosts: [20, 30, 40, 50],
        fourStarRelease: [
            { shards: 10, jelly: 30, gold: 10000 },
            { shards: 20, blockScrap: 60, gold: 30000 },
            { shards: 30, monsterCrystal: 120, gold: 60000 },
            { shards: 40, expeditionMedal: 4, gold: 90000 }
        ],
        permanentFiveStarBreakthrough: [
            { breakthroughStone: 10, dragonWing: 1, shellfishTail: 1, garudaBeak: 1, thunderCore: 1, gold: 100000 },
            { breakthroughStone: 20, dragonWing: 2, shellfishTail: 2, garudaBeak: 2, thunderCore: 2, gold: 200000 },
            { breakthroughStone: 30, dragonWing: 3, shellfishTail: 3, garudaBeak: 3, thunderCore: 3, gold: 300000 },
            { breakthroughStone: 40, dragonWing: 4, shellfishTail: 4, garudaBeak: 4, thunderCore: 4, gold: 400000 }
        ],
        limitedFiveStarBreakthrough: [
            { breakthroughStone: 20, rainbow: 1000 },
            { breakthroughStone: 40, rainbow: 2000 },
            { breakthroughStone: 60, rainbow: 3000 },
            { breakthroughStone: 100, rainbow: 4000, baphometHorn: 1 }
        ],
        exp: { base: 100, linear: 45, quadratic: 15 },
        levelGains: { atk: 3, hp: 20 },
        talent: { basePoints: 2, pointsPerLevels: 5 }
    },
    account: { expBase: 400, expPerRank: 100, rankBonusCap: .10, rankBonusPerLevel: .001, critStartRank: 100, critBonusCap: .10, critBonusPerLevel: .001 },
    typeTalents: { maxRank: 5 }
};
window.GAME_DATA.rewards = {
    towerEnemyExperience: { base: [0, 3], after100: [1, 4], after200: [2, 5] },
    towerEnemyRainbowCrystal: { chance: 0.3, amount: 1 },
    towerEnemyCharacterFragment: { chance: 0.01, amount: 1 },
    towerEnemyGold: { base: [10, 20], after100: [20, 35], after200: [30, 50] },
    towerEnemyMaterials: {
        jelly: { chance: 0.2, amount: 1 }, blockScrap: { chance: 0.1, amount: 1 }, monsterCrystal: { chance: 0.05, amount: 1 }
    },
    towerBossDrop: {
        categories: ["rainbowCrystal", "characterFragment", "highGradeExperienceCrystal"],
        kindsBefore100: 1, kindsAfter100: 2, kindsAfter200: 3,
        rainbowCrystal: [1, 5], characterFragment: [1, 3], adventureMedalChance: 0.01,
        gold: { base: [100, 160], after100: [180, 280], after200: [300, 450] }
    }
};
window.GAME_DATA.assets = {
    cdnBase: "https://vivaldi6352.github.io/assets/", wdfpCharacterRoot: "asset/battle/character/",
    extractorCharacterRoot: "asset/character/", extractorBossRoot: "asset/battle/boss/", extractorMissLimit: 60,
    impactFx: {
        hit: { src: "asset/fx/vfx/impact_hit.png", frames: 5, ms: 190, scale: 1.9, gap: 55 },
        weak: { src: "asset/fx/vfx/impact_weak.png", frames: 4, ms: 150, scale: 2.2, gap: 45 },
        flip: { src: "asset/fx/vfx/impact_flip.png", frames: 5, ms: 160, scale: 1.5, gap: 90 },
        dash: { src: "asset/fx/dash-streak-transparent.png", frames: 1, ms: 220, scale: 1, gap: 110 }
    },
    flipArt: {
        l: { src: "asset/battle/flip-red-l.png", gold: "asset/battle/flip-gold-l.png", w: 123, h: 58, hx: 13.4, hy: 12.3, rest: .370 },
        r: { src: "asset/battle/flip-red-r.png", gold: "asset/battle/flip-gold-r.png", w: 122, h: 58, hx: 108.4, hy: 12.3, rest: Math.PI - .370 }
    },
    flipGlow: ["", [6, .45], [9, .6], [13, .8]],
    spriteDirs: { hero: "assets/hero", enemy: "assets/enemy", cut: "assets/hero" },
    extractorGroups: {
        idle: ["idle", "walk"], up: ["walk", "idle"], down: ["walk", "idle"], attack: ["attack", "hit"], hurt: ["hit", "damage"],
        skill: ["skill_ready"], victory: ["win", "idle"], enter: ["walk", "idle"]
    },
    unitStateFile: { idle: "walk_front", up: "walk_back", down: "walk_front", attack: "kachidoki", hurt: "neutral", skill: "skill_ready", victory: "kachidoki", enter: "walk_back" },
    unitStateFallback: "neutral",
    ballActionFile: { idle: "collision", up: "walk_back", down: "walk_front", attack: "launch", hurt: "collision", skill: "cast", victory: "focus", enter: "launch" },
    enemyUnits: {
        slime_red: { unit: "slango_red", rarity: 1 }, slime_blue: { unit: "slango_blue", rarity: 1 }, kamaitachi: { unit: "fox", rarity: 2 }, pararat: { unit: "paralysis_hedgehog", rarity: 1 },
        golem: { unit: "guardian_golem", rarity: 2 }, owl: { unit: "owl", rarity: 2 }, kinoko: { unit: "kinoko", rarity: 1 }, spirit_fire: { unit: "spirit_fire", rarity: 1 },
        slime_yellow: { unit: "slango_yellow", rarity: 1 }, slime_green: { unit: "slango_green", rarity: 1 },
        colossus_fire: { unit: "fire_dragon", rarity: 5 }, colossus_water: { unit: "waterdragon_kunfu", rarity: 5 },
        colossus_wind: { unit: "wind_dragon", rarity: 5 }, colossus_thunder: { unit: "thunder_dragon", rarity: 4 }, ancient_golem: { unit: "ancient_golem", rarity: 1 }
    },
    bossAnimations: { ancient_golem: { dir: "asset/battle/boss/ancient_golem/frames/golem_frame_", n: 16, ms: 90 } },
    smokeSheets: {
        puff: { file: "smoke-puff.png", frames: 11, dur: 620 }, ring: { file: "smoke-ring.png", frames: 11, dur: 640 }, swirl: { file: "smoke-swirl.png", frames: 11, dur: 700 },
        rise: { file: "smoke-rise.png", frames: 11, dur: 760 }, spike: { file: "smoke-spike.png", frames: 11, dur: 460 }
    },
    powerFlipFx: {
        knight: { src: "asset/fx/pixelfx/pf-knight.png", frames: 10, ms: 330, fw: 264, fh: 150, scale: .88 },
        fighter: { src: "asset/fx/pixelfx/pf-fighter.png", frames: 13, ms: 300, fw: 128, fh: 96, scale: 1.78 },
        ranger: { src: "asset/fx/pixelfx/pf-ranger.png", frames: 18, ms: 500, fw: 264, fh: 100, beam: 150 },
        special: { src: "asset/fx/pixelfx/pf-special.png", frames: 27, ms: 650, fw: 224, fh: 200, scale: .85 },
        supporter: { src: "asset/fx/pixelfx/pf-supporter.png", frames: 24, ms: 780, fw: 124, fh: 120, scale: 1.28 }
    },
    passiveFx: {
        wind: { src: "asset/fx/knight-permanent-wind.gif", gif: true, frames: 13, ms: 1170, fw: 175, fh: 98, scale: 1 },
        slow: { src: "asset/fx/special-starburst-time.gif", gif: true, frames: 12, ms: 1080, fw: 170, fh: 91, scale: 1 },
        shock: { src: "asset/fx/fighter-burst-lock.gif", gif: true, frames: 7, ms: 630, fw: 118, fh: 103, scale: 1 },
        pierce: { src: "asset/fx/ranger-absolute-pierce.gif", gif: true, frames: 5, ms: 1800, fw: 180, fh: 89, scale: 1 }
    },
    bossPhaseGif: { summon: "asset/fx/boss/summon-circle-transparent.webp", shockwave: "asset/fx/boss/summon-shockwave-transparent.webp", berserk: "asset/fx/boss/berserk-aura-transparent.webp" },
    buffIcons: {
        floating: "asset/ui/buff-icons/floating.png", pierce: "asset/ui/buff-icons/pierce.png", powerless: "asset/ui/buff-icons/powerless.png", slow: "asset/ui/buff-icons/slow.png",
        death: "asset/ui/buff-icons/death.png", regen: "asset/ui/buff-icons/regen.png", paralyze: "asset/ui/buff-icons/paralyze.png", silence: "asset/ui/buff-icons/silence.png",
        healDisabled: "asset/ui/buff-icons/heal-disabled.png", feverUpRed: "asset/ui/buff-icons/fever-up-red.png", feverUpBlue: "asset/ui/buff-icons/fever-up-blue.png",
        downEasier: "asset/ui/buff-icons/down-easier.png", speedUp: "asset/ui/buff-icons/speed-up.png", comboBoost: "asset/ui/buff-icons/combo-boost.png",
        perseverance: "asset/ui/buff-icons/perseverance.png", damageUp: "asset/ui/buff-icons/damage-up.png", reverse: "asset/ui/buff-icons/reverse.png"
    }
};

window.GAME_DATA.typeTalentTrees = {
    knight: { branches: [
        { name: "戰意回流", nodes: [
            { id: "knight_recovery", title: "旋刃回生", icon: "✦", desc: "劍士 PF 命中回復比例提高 1%。" },
            { id: "knight_recovery_cap", title: "生命掠取", icon: "✚", desc: "PF 單次回復上限再提高最大生命的 2%。" }
        ] },
        { name: "御風身法", nodes: [
            { id: "knight_float_time", title: "踏風浮游", icon: "⌁", desc: "連擊浮游時間延長 0.35 秒。" },
            { id: "knight_float_gravity", title: "凌空步法", icon: "➤", desc: "浮游期間重力再降低 0.08 倍，碰撞仍正常。" }
        ] },
        { name: "破陣劍勢", nodes: [
            { id: "knight_pf_damage", title: "破陣斬", icon: "⚔", desc: "PF 傷害提高 5%。" },
            { id: "knight_float_drag", title: "乘風追擊", icon: "✧", desc: "浮游期間空氣阻力再降低，移動更俐落。" }
        ] }
    ] },
    fighter: { branches: [
        { name: "爆裂連打", nodes: [
            { id: "fighter_shock_damage", title: "拳風爆發", icon: "✹", desc: "格鬥範圍衝擊傷害提高 12%。" },
            { id: "fighter_shock_radius", title: "震波擴散", icon: "◎", desc: "格鬥衝擊範圍增加 14px。" }
        ] },
        { name: "貼身連襲", nodes: [
            { id: "fighter_cooldown", title: "連環快打", icon: "➤", desc: "範圍衝擊冷卻縮短 100ms。" },
            { id: "fighter_combo", title: "追擊節奏", icon: "⌁", desc: "每次觸發衝擊額外增加 1 Combo。" }
        ] },
        { name: "致命判讀", nodes: [
            { id: "fighter_crit", title: "要害洞悉", icon: "✦", desc: "衝擊暴擊率提高 3%。" },
            { id: "fighter_crit_damage", title: "致命一擊", icon: "†", desc: "衝擊暴擊傷害額外提高 15%。" }
        ] }
    ] },
    ranger: { branches: [
        { name: "絕對貫穿", nodes: [
            { id: "ranger_direct", title: "貫穿箭矢", icon: "➤", desc: "射擊直擊與貫穿 PF 傷害提高 5%。" },
            { id: "ranger_pierce", title: "穿透強化", icon: "≫", desc: "射擊 PF 的貫穿傷害再提高 5%。" }
        ] },
        { name: "鷹眼鎖定", nodes: [
            { id: "ranger_beam", title: "拓寬光束", icon: "⌖", desc: "射擊 PF 光束寬度增加 10px。" },
            { id: "ranger_weak", title: "弱點追蹤", icon: "◇", desc: "光束弱點判定寬度增加 8px。" }
        ] },
        { name: "迅捷裝填", nodes: [
            { id: "ranger_crit", title: "精準狙擊", icon: "✦", desc: "射擊直擊暴擊率提高 2%。" },
            { id: "ranger_gauge", title: "疾速裝填", icon: "ϟ", desc: "射擊命中後額外回復技能能量。" }
        ] }
    ] },
    supporter: { branches: [
        { name: "狂熱共鳴", nodes: [
            { id: "supporter_fever_attack", title: "狂熱祝福", icon: "✚", desc: "FEVER 期間全隊攻擊加成再提高 10%。" },
            { id: "supporter_fever_shield", title: "聖域庇護", icon: "⬡", desc: "FEVER 期間額外減傷 4%。" }
        ] },
        { name: "靈能循環", nodes: [
            { id: "supporter_gauge", title: "靈泉回流", icon: "◌", desc: "非 FEVER 時技能蓄能再提高 5%。" },
            { id: "supporter_energy", title: "共鳴脈衝", icon: "ϟ", desc: "FEVER 發動時，全隊立即補充 3% 技能能量。" }
        ] },
        { name: "守護祈禱", nodes: [
            { id: "supporter_heal", title: "生命禱言", icon: "♡", desc: "通過關卡時額外回復全隊 3% 生命。" },
            { id: "supporter_resist", title: "堅韌聖印", icon: "▣", desc: "全隊最大生命提高 3%。" }
        ] }
    ] },
    special: { branches: [
        { name: "星爆術式", nodes: [
            { id: "special_skill_damage", title: "星能增幅", icon: "✧", desc: "全隊技能傷害提高 2%。" },
            { id: "special_burst_radius", title: "界域擴張", icon: "◉", desc: "特殊型 PF 的爆裂範圍增加 12%。" }
        ] },
        { name: "時空緩速", nodes: [
            { id: "special_slow_time", title: "凝滯刻印", icon: "◷", desc: "擊破弱點時，Boss 讀條額外延長 0.2 秒。" },
            { id: "special_slow_cap", title: "時域延展", icon: "⌛", desc: "星爆時空的總延長上限提高 0.4 秒。" }
        ] },
        { name: "咒式共鳴", nodes: [
            { id: "special_weak_width", title: "弱點洞察", icon: "◇", desc: "技能與 PF 的弱點判定範圍增加。" },
            { id: "special_crit", title: "秘術暴擊", icon: "✦", desc: "技能暴擊率提高 2%。" }
        ] }
    ] }
};

window.GAME_DATA.TYPE_TALENT_COLORS = {
    knight: "#c06a45",
    fighter: "#8a6bb8",
    ranger: "#3f9ec0",
    supporter: "#4f9e77",
    special: "#5b7fc4"
};

window.GAME_DATA.TYPE_TALENT_ICON_BY_ID = {
    knight_recovery: "heart", knight_recovery_cap: "heart", knight_float_time: "speed",
    knight_float_gravity: "arrow", knight_pf_damage: "sword", knight_float_drag: "slash",
    special_skill_damage: "burst", special_burst_radius: "target", special_slow_time: "moon",
    special_slow_cap: "moon", special_weak_width: "eye", special_crit: "burst",
    supporter_fever_attack: "heart", supporter_fever_shield: "shield", supporter_gauge: "speed",
    supporter_energy: "burst", supporter_heal: "heart", supporter_resist: "shield",
    fighter_shock_damage: "slash", fighter_shock_radius: "burst", fighter_cooldown: "speed",
    fighter_combo: "sword", fighter_crit: "target", fighter_crit_damage: "slash",
    ranger_direct: "arrow", ranger_pierce: "arrow", ranger_beam: "target",
    ranger_weak: "eye", ranger_crit: "target", ranger_gauge: "speed"
};

window.GAME_DATA.TYPE_TALENT_PASSIVE_ICON = { knight: "sword", fighter: "slash", ranger: "target", supporter: "shield", special: "burst" };
