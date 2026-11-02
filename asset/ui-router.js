// 頁面與返回路由；DOM、頁面內容和戰鬥處理均由主程式傳入。
window.UIRouter = Object.freeze({
    create({ screens, getElement, getPages, setTab, paintHome, renderPage, renderTabs,
        onBattle, onHomeParty, onLeave, closeOverlays, closeEmbeddedGate, leaveGateContext, resume }) {
        let current = 'home';
        function show(which) {
            const route = Object.hasOwn(screens, which) ? which : 'home';
            if (route !== current) onLeave(current, route);
            current = route;
            for (const id of Object.values(screens)) {
                const node = getElement(id);
                if (node) node.style.display = id === screens[route] ? '' : 'none';
            }
            if (route === 'home') { setTab('home'); paintHome(); }
            else if (route === 'page') renderPage();
            else if (route === 'team') setTab('team');
            else if (route === 'battle') onBattle();
            onHomeParty(route === 'home');
            renderTabs();
        }
        return Object.freeze({
            show,
            select(tab) {
                if (tab === 'home' || tab === 'team') { show(tab); return; }
                if (Object.hasOwn(getPages(), tab)) { setTab(tab); show('page'); return; }
                show('home');
            },
            home() {
                closeOverlays();
                if (closeEmbeddedGate()) return;
                leaveGateContext();
                resume();
                show('home');
            },
            current: () => current
        });
    }
});
