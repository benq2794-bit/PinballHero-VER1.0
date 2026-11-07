-- 彈射之境 cloud save table. Run once in Supabase > SQL Editor.
create table if not exists public.game_saves (
    user_id uuid primary key references auth.users (id) on delete cascade,
    save_data jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

drop policy if exists "Players can read their own save" on public.game_saves;
create policy "Players can read their own save"
    on public.game_saves for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own save" on public.game_saves;
create policy "Players can create their own save"
    on public.game_saves for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own save" on public.game_saves;
create policy "Players can update their own save"
    on public.game_saves for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

revoke all on public.game_saves from anon;
grant select, insert, update on public.game_saves to authenticated;

-- 全服排行榜：波利塔本週／波利塔生涯／巴風特無限連擊本週，每個登入玩家每個榜只留一列。
-- 任何人都看得到整張榜，但只能改自己那列；訪客沒有 user_id，不會進這張表。
create table if not exists public.leaderboard_entries (
    user_id uuid not null references auth.users (id) on delete cascade,
    scope text not null check (scope in ('tower_week', 'tower_life', 'hell_week')),
    account_name text not null default '',
    best_floor integer not null default 0,
    clear_seconds integer not null default 0,
    kill_count integer not null default 0,
    cleared boolean not null default false,
    week_start bigint not null default 0,
    reached_at text not null default '',
    updated_at timestamptz not null default now(),
    primary key (user_id, scope)
);

create index if not exists leaderboard_ranking_idx
    on public.leaderboard_entries (scope, week_start, best_floor desc, clear_seconds desc);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "Anyone can read the leaderboard" on public.leaderboard_entries;
create policy "Anyone can read the leaderboard"
    on public.leaderboard_entries for select to public
    using (true);

drop policy if exists "Players can submit their own leaderboard row" on public.leaderboard_entries;
create policy "Players can submit their own leaderboard row"
    on public.leaderboard_entries for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Players can improve their own leaderboard row" on public.leaderboard_entries;
create policy "Players can improve their own leaderboard row"
    on public.leaderboard_entries for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

grant select on public.leaderboard_entries to anon, authenticated;
grant insert, update on public.leaderboard_entries to authenticated;
revoke all on public.leaderboard_entries from public;
