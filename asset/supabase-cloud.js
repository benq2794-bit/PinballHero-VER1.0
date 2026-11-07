// Browser-side Supabase client. The publishable key is intended for public clients;
// all save access is constrained by the game_saves RLS policies in supabase-schema.sql.
window.SupabaseCloud = (() => {
    const PROJECT_URL = 'https://hofdzrwsiervdfawabym.supabase.co';
    const PUBLISHABLE_KEY = 'sb_publishable_c8TY_CnWhRJ62gx0D2MjNA_rIuM132J';
    const client = window.supabase?.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    let saveTimer = 0, queuedSnapshot = null, flushPromise = Promise.resolve();

    function unavailable() { return new Error('Supabase 用戶端尚未載入，請確認網路連線後重整。'); }
    function requireClient() { if (!client) throw unavailable(); return client; }
    function queueSave(snapshot) {
        if (!client) return;
        queuedSnapshot = snapshot;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { flushSave().catch(error => console.warn('[cloud save]', error)); }, 1200);
    }
    async function flushSave(userId) {
        clearTimeout(saveTimer);
        if (!client) {
            if (userId) throw unavailable();
            return flushPromise;
        }
        flushPromise = flushPromise.catch(() => {}).then(async () => {
            while (queuedSnapshot) {
            const snapshot = queuedSnapshot;
            queuedSnapshot = null;
            try {
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            const id = session?.user?.id;
            if (!id || userId && userId !== id) throw new Error('雲端存檔帳號尚未確認');
            const { error } = await client.from('game_saves').upsert({
                user_id: id, save_data: snapshot, updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (error) throw error;
            } catch (error) {
                if (!queuedSnapshot) queuedSnapshot = snapshot;
                throw error;
            }
            }
        });
        return flushPromise;
    }
    async function readLeaderboard(scope, weekStart) {
        let query = requireClient().from('leaderboard_entries')
            .select('user_id, account_name, best_floor, clear_seconds, kill_count, cleared, reached_at')
            .eq('scope', scope)
            .in('week_start', scope === 'tower_life' ? [0] : [Number(weekStart) || 0, (Number(weekStart) || 0) - 8 * 3600000]);
        query = scope === 'hell_week'
            ? query.order('cleared', { ascending:false }).order('clear_seconds', { ascending:false }).order('kill_count', { ascending:false })
            : query.order('best_floor', { ascending:false });
        const { data, error } = await query.order('updated_at', { ascending:true }).limit(50);
        if (error) throw error;
        return (data || []).map(row => ({
            userId: row.user_id,
            name: String(row.account_name || '').slice(0, 16),
            floor: Math.min(99999, Math.max(0, Math.floor(Number(row.best_floor) || 0))),
            seconds: Math.max(0, Math.floor(Number(row.clear_seconds) || 0)),
            count: Math.min(99999, Math.max(0, Math.floor(Number(row.kill_count) || 0))),
            clear: row.cleared === true,
            at: String(row.reached_at || '')
        }));
    }
    // 上報前先查自己那筆：換裝置或清過瀏覽器時，本機數字會比線上小，不能盲目覆寫。
    // 只按 user_id + scope 取，不帶週期條件，跨週那筆才看得見、也才比得了。
    async function readOwnLeaderboard(scope) {
        const { data: { session }, error: sessionError } = await requireClient().auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user?.id) return null;
        const { data, error } = await requireClient().from('leaderboard_entries')
            .select('best_floor, clear_seconds, kill_count, cleared, week_start')
            .eq('user_id', session.user.id).eq('scope', scope).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            floor: Math.max(0, Math.floor(Number(data.best_floor) || 0)),
            seconds: Math.max(0, Math.floor(Number(data.clear_seconds) || 0)),
            count: Math.max(0, Math.floor(Number(data.kill_count) || 0)),
            clear: data.cleared === true,
            weekStart: Math.floor(Number(data.week_start) || 0)
        };
    }
    async function writeLeaderboard(entry) {
        const { data: { session }, error: sessionError } = await requireClient().auth.getSession();
        if (sessionError) throw sessionError;
        const id = session?.user?.id;
        if (!id) return false; // 訪客沒有帳號，成績只留本機。
        if (entry.userId && entry.userId !== id) return false;
        const { error } = await requireClient().from('leaderboard_entries').upsert({
            user_id: id,
            scope: entry.scope,
            account_name: String(entry.name || '').slice(0, 16),
            best_floor: Math.max(0, Math.floor(Number(entry.floor) || 0)),
            clear_seconds: Math.max(0, Math.floor(Number(entry.seconds) || 0)),
            kill_count: Math.max(0, Math.floor(Number(entry.count) || 0)),
            cleared: entry.clear === true,
            week_start: Number(entry.weekStart) || 0,
            reached_at: String(entry.at || ''),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,scope' });
        if (error) throw error;
        return true;
    }
    return Object.freeze({
        available: !!client,
        async getSession() {
            const { data, error } = await requireClient().auth.getSession();
            if (error) throw error;
            return data.session;
        },
        async signUp(email, password) {
            const { data, error } = await requireClient().auth.signUp({
                email, password, options: { emailRedirectTo: location.origin + location.pathname }
            });
            if (error) throw error;
            return data;
        },
        async updateAccountName(accountName) {
            const { data, error } = await requireClient().auth.updateUser({ data: { account_name: accountName } });
            if (error) throw error;
            return data;
        },
        async signIn(email, password) {
            const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        },
        async signInWithGoogle() {
            const { error } = await requireClient().auth.signInWithOAuth({
                provider: 'google', options: { redirectTo: location.origin + location.pathname }
            });
            if (error) throw error;
        },
        async signOut() {
            if (!client) return;
            const { error } = await client.auth.signOut();
            if (error) throw error;
        },
        async readSave(userId) {
            const { data, error } = await requireClient().from('game_saves')
                .select('save_data, updated_at').eq('user_id', userId).maybeSingle();
            if (error) throw error;
            return data;
        },
        async writeSave(userId, snapshot) {
            const { error } = await requireClient().from('game_saves').upsert({
                user_id: userId, save_data: snapshot, updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (error) throw error;
        },
        queueSave,
        flushSave,
        readLeaderboard,
        readOwnLeaderboard,
        writeLeaderboard
    });
})();
