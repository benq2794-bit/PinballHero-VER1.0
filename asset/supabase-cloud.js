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
        if (!queuedSnapshot || !client) return flushPromise;
        const snapshot = queuedSnapshot;
        queuedSnapshot = null;
        flushPromise = flushPromise.catch(() => {}).then(async () => {
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            const id = userId || session?.user?.id;
            if (!id) return;
            const { error } = await client.from('game_saves').upsert({
                user_id: id, save_data: snapshot, updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (error) { queuedSnapshot = snapshot; throw error; }
        });
        return flushPromise;
    }
    return Object.freeze({
        available: !!client,
        async getSession() {
            const { data, error } = await requireClient().auth.getSession();
            if (error) throw error;
            return data.session;
        },
        async signUp(email, password, accountName) {
            const { data, error } = await requireClient().auth.signUp({
                email, password, options: { data: { account_name: accountName }, emailRedirectTo: location.origin + location.pathname }
            });
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
        flushSave
    });
})();
