-- ═══════════════════════════════════════════════
-- Stack Tac Toe — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════

-- ─── PROFILES ───────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  username     text unique not null,
  display_name text,
  avatar_color text default '#38bdf8',
  total_points bigint default 0,
  wins         int default 0,
  losses       int default 0,
  draws        int default 0,
  games_played int default 0,
  win_streak   int default 0,
  best_streak  int default 0,
  -- Mode-specific ranking (für separate Ranglisten)
  pvp_points        bigint default 0,
  pvp_wins          int default 0,
  pvp_games         int default 0,
  pvp_best_streak   int default 0,
  ai_easy_points    bigint default 0,
  ai_easy_wins      int default 0,
  ai_easy_games     int default 0,
  ai_mid_points     bigint default 0,
  ai_mid_wins       int default 0,
  ai_mid_games      int default 0,
  ai_hard_points    bigint default 0,
  ai_hard_wins      int default 0,
  ai_hard_games     int default 0,
  ranked_elo        int default 1000,   -- Elo für Ranked-Matchmaking
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Falls profiles schon existiert (z. B. von Auth): alle fehlenden Spalten nachziehen (vor den Funktionen!)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_points bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wins int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS losses int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS draws int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_played int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS win_streak int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS best_streak int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pvp_points bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pvp_wins int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pvp_games int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pvp_best_streak int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_easy_points bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_easy_wins int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_easy_games int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_mid_points bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_mid_wins int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_mid_games int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_hard_points bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_hard_wins int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_hard_games int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ranked_elo int DEFAULT 1000;

-- ─── GAMES ──────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_status') then
    create type game_status as enum ('waiting', 'active', 'finished', 'abandoned');
  end if;
end
$$;

create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  player1_id   uuid references public.profiles(id) on delete set null,
  player2_id   uuid references public.profiles(id) on delete set null,
  player1_role text default 'human',  -- which side they play
  player2_role text default 'ai',
  mode         text default 'ai',     -- 'ai' | 'pvp'
  difficulty   text default 'easy',   -- for ai mode
  status       game_status default 'waiting',
  state_json   jsonb not null default '{}',  -- full game state (inkl. round, round_results für 10-Runden)
  winner_id    uuid references public.profiles(id) on delete set null,
  points_p1    int default 0,
  points_p2    int default 0,
  moves_count  int default 0,
  round        int default 1,         -- aktuelle Runde (1-10)
  round_results jsonb default '[]',  -- [{winner, pts_p1, pts_p2}, ...] pro Runde
  invite_code  text unique,           -- short code for sharing link
  is_ranked    boolean default false, -- true = Elo wird bei finish_game aktualisiert
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  finished_at  timestamptz
);

-- ─── MOVES ──────────────────────────────────────
create table if not exists public.moves (
  id         bigserial primary key,
  game_id    uuid references public.games(id) on delete cascade,
  player_id  uuid references public.profiles(id) on delete set null,
  role       text not null,           -- 'player1' | 'player2'
  move_data  jsonb not null,          -- {type, size, index} or {type, fromIndex, toIndex}
  points     int default 0,
  move_num   int not null,
  created_at timestamptz default now()
);

-- ─── INDEXES ────────────────────────────────────
create index if not exists idx_games_player1    on public.games(player1_id);
create index if not exists idx_games_player2    on public.games(player2_id);
create index if not exists idx_games_status     on public.games(status);
create index if not exists idx_games_invite     on public.games(invite_code);
create index if not exists idx_moves_game       on public.moves(game_id);
create index if not exists idx_profiles_points  on public.profiles(total_points desc);
create index if not exists idx_profiles_wins    on public.profiles(wins desc);
create index if not exists idx_profiles_pvp_pts on public.profiles(pvp_points desc);
create index if not exists idx_profiles_ai_easy on public.profiles(ai_easy_points desc);
create index if not exists idx_profiles_ai_mid  on public.profiles(ai_mid_points desc);
create index if not exists idx_profiles_ai_hard on public.profiles(ai_hard_points desc);
create index if not exists idx_profiles_ranked_elo on public.profiles(ranked_elo desc);

-- ─── MATCHMAKING QUEUE (Phase 3) ─────────────────
create table if not exists public.matchmaking_queue (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  queue_type text not null default 'casual',  -- 'casual' | 'ranked'
  elo        int default 1000,                -- für ranked: Elo des Spielers
  joined_at  timestamptz default now(),
  unique(user_id)
);
create index if not exists idx_matchmaking_queue_type on public.matchmaking_queue(queue_type);
create index if not exists idx_matchmaking_queue_joined on public.matchmaking_queue(joined_at);

alter table public.matchmaking_queue enable row level security;
drop policy if exists "matchmaking_own_insert" on public.matchmaking_queue;
drop policy if exists "matchmaking_own_delete" on public.matchmaking_queue;
drop policy if exists "matchmaking_select"    on public.matchmaking_queue;
create policy "matchmaking_own_insert" on public.matchmaking_queue for insert with check (auth.uid() = user_id);
create policy "matchmaking_own_delete" on public.matchmaking_queue for delete using (auth.uid() = user_id);
create policy "matchmaking_select"    on public.matchmaking_queue for select using (true);

-- ─── ROW LEVEL SECURITY ─────────────────────────
alter table public.profiles enable row level security;
alter table public.games    enable row level security;
alter table public.moves    enable row level security;

-- profiles: public read, own write
drop policy if exists "profiles_public_read"  on public.profiles;
drop policy if exists "profiles_own_insert"   on public.profiles;
drop policy if exists "profiles_own_update"   on public.profiles;
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_own_insert"   on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_own_update"   on public.profiles for update using (auth.uid() = id);

-- games: public read, authenticated insert; update nur für Spieler oder Beitritt als Player2
drop policy if exists "games_public_read"     on public.games;
drop policy if exists "games_auth_insert"     on public.games;
drop policy if exists "games_player_update"   on public.games;
drop policy if exists "games_join_as_player2" on public.games;
create policy "games_public_read"     on public.games for select using (true);
create policy "games_auth_insert"     on public.games for insert with check (auth.uid() is not null);
create policy "games_player_update"   on public.games for update using (
  auth.uid() = player1_id or auth.uid() = player2_id
);
create policy "games_join_as_player2" on public.games for update using (
  status = 'waiting' and player2_id is null and auth.uid() is not null and auth.uid() != player1_id
);

-- moves: public read, authenticated insert
drop policy if exists "moves_public_read"     on public.moves;
drop policy if exists "moves_auth_insert"     on public.moves;
create policy "moves_public_read"     on public.moves for select using (true);
create policy "moves_auth_insert"     on public.moves for insert with check (auth.uid() is not null);

-- ─── FUNCTIONS ──────────────────────────────────

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  adj text[] := array['Swift','Bold','Clever','Dark','Bright','Sharp','Iron','Silver','Golden','Storm'];
  noun text[] := array['Pawn','Queen','King','Knight','Rook','Bishop','Tower','Dragon','Eagle','Wolf'];
  generated_name text;
  attempt int := 0;
begin
  loop
    generated_name := adj[1 + floor(random() * array_length(adj,1))]
                   || noun[1 + floor(random() * array_length(noun,1))]
                   || floor(random() * 9000 + 1000)::text;
    begin
      insert into public.profiles (id, username, display_name)
      values (new.id, generated_name, generated_name);
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 10 then
        insert into public.profiles (id, username, display_name)
        values (new.id, 'Player' || extract(epoch from now())::bigint::text,
                        'Player' || extract(epoch from now())::bigint::text);
        exit;
      end if;
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at before update on public.games
  for each row execute function public.set_updated_at();

-- Finalize game + update profile stats (10-Runden-Match, mode-spezifische Ranglisten)
create or replace function public.finish_game(
  p_game_id   uuid,
  p_winner_id uuid,  -- null = draw
  p_points_p1 int,
  p_points_p2 int
)
returns void language plpgsql security definer as $$
declare
  g public.games%rowtype;
  p1_won boolean;
  p2_won boolean;
  p1_pts_col text;
  p1_wins_col text;
  p1_games_col text;
  p1_streak_col text;
  p2_pts_col text;
  p2_wins_col text;
  p2_games_col text;
  p2_streak_col text;
  e1 float; e2 float; s1 float; s2 float; elo1 int; elo2 int; k int := 32;
begin
  select * into g from public.games where id = p_game_id;
  if g.status = 'finished' then return; end if;

  update public.games set
    status = 'finished', winner_id = p_winner_id,
    points_p1 = p_points_p1, points_p2 = p_points_p2,
    finished_at = now()
  where id = p_game_id;

  p1_won := (p_winner_id = g.player1_id);
  p2_won := (p_winner_id = g.player2_id);

  -- Mode-spezifische Spalten für Ranglisten
  if g.mode = 'pvp' then
    p1_pts_col := 'pvp_points'; p1_wins_col := 'pvp_wins'; p1_games_col := 'pvp_games'; p1_streak_col := 'pvp_best_streak';
    p2_pts_col := 'pvp_points'; p2_wins_col := 'pvp_wins'; p2_games_col := 'pvp_games'; p2_streak_col := 'pvp_best_streak';
  else
    case g.difficulty
      when 'easy' then p1_pts_col := 'ai_easy_points'; p1_wins_col := 'ai_easy_wins'; p1_games_col := 'ai_easy_games'; p1_streak_col := 'best_streak';
      when 'mid'  then p1_pts_col := 'ai_mid_points';  p1_wins_col := 'ai_mid_wins';  p1_games_col := 'ai_mid_games';  p1_streak_col := 'best_streak';
      when 'hard' then p1_pts_col := 'ai_hard_points'; p1_wins_col := 'ai_hard_wins'; p1_games_col := 'ai_hard_games'; p1_streak_col := 'best_streak';
      else p1_pts_col := 'total_points'; p1_wins_col := 'wins'; p1_games_col := 'games_played'; p1_streak_col := 'best_streak';
    end case;
    p2_pts_col := 'total_points'; p2_wins_col := 'wins'; p2_games_col := 'games_played'; p2_streak_col := 'best_streak';
  end if;

  -- Update player 1 stats (generisch + mode-spezifisch)
  if g.player1_id is not null then
    update public.profiles set
      games_played = games_played + 1,
      total_points = total_points + p_points_p1,
      wins    = wins    + case when p1_won then 1 else 0 end,
      losses  = losses  + case when p_winner_id is not null and not p1_won then 1 else 0 end,
      draws   = draws   + case when p_winner_id is null then 1 else 0 end,
      win_streak = case when p1_won then win_streak + 1 else 0 end,
      best_streak = greatest(best_streak, case when p1_won then win_streak + 1 else win_streak end),
      pvp_points    = case when g.mode = 'pvp' then pvp_points + p_points_p1 else pvp_points end,
      pvp_wins      = case when g.mode = 'pvp' and p1_won then pvp_wins + 1 else pvp_wins end,
      pvp_games     = case when g.mode = 'pvp' then pvp_games + 1 else pvp_games end,
      pvp_best_streak = case when g.mode = 'pvp' then greatest(coalesce(pvp_best_streak,0), case when p1_won then win_streak + 1 else 0 end) else pvp_best_streak end,
      ai_easy_points = case when g.mode = 'ai' and g.difficulty = 'easy' then ai_easy_points + p_points_p1 else ai_easy_points end,
      ai_easy_wins   = case when g.mode = 'ai' and g.difficulty = 'easy' and p1_won then ai_easy_wins + 1 else ai_easy_wins end,
      ai_easy_games  = case when g.mode = 'ai' and g.difficulty = 'easy' then ai_easy_games + 1 else ai_easy_games end,
      ai_mid_points  = case when g.mode = 'ai' and g.difficulty = 'mid' then ai_mid_points + p_points_p1 else ai_mid_points end,
      ai_mid_wins    = case when g.mode = 'ai' and g.difficulty = 'mid' and p1_won then ai_mid_wins + 1 else ai_mid_wins end,
      ai_mid_games   = case when g.mode = 'ai' and g.difficulty = 'mid' then ai_mid_games + 1 else ai_mid_games end,
      ai_hard_points = case when g.mode = 'ai' and g.difficulty = 'hard' then ai_hard_points + p_points_p1 else ai_hard_points end,
      ai_hard_wins   = case when g.mode = 'ai' and g.difficulty = 'hard' and p1_won then ai_hard_wins + 1 else ai_hard_wins end,
      ai_hard_games  = case when g.mode = 'ai' and g.difficulty = 'hard' then ai_hard_games + 1 else ai_hard_games end
    where id = g.player1_id;
  end if;

  -- Update player 2 stats (nur für pvp)
  if g.player2_id is not null and g.mode = 'pvp' then
    update public.profiles set
      games_played = games_played + 1,
      total_points = total_points + p_points_p2,
      wins    = wins    + case when p2_won then 1 else 0 end,
      losses  = losses  + case when p_winner_id is not null and not p2_won then 1 else 0 end,
      draws   = draws   + case when p_winner_id is null then 1 else 0 end,
      win_streak = case when p2_won then win_streak + 1 else 0 end,
      best_streak = greatest(best_streak, case when p2_won then win_streak + 1 else win_streak end),
      pvp_points = pvp_points + p_points_p2,
      pvp_wins   = pvp_wins + case when p2_won then 1 else 0 end,
      pvp_games  = pvp_games + 1,
      pvp_best_streak = greatest(coalesce(pvp_best_streak,0), case when p2_won then win_streak + 1 else 0 end)
    where id = g.player2_id;
  end if;

  -- Elo-Update für Ranked-Matches (K=32)
  if g.is_ranked and g.player1_id is not null and g.player2_id is not null then
    select ranked_elo into elo1 from public.profiles where id = g.player1_id;
    select ranked_elo into elo2 from public.profiles where id = g.player2_id;
    elo1 := coalesce(elo1, 1000); elo2 := coalesce(elo2, 1000);
    e1 := 1.0 / (1.0 + power(10, (elo2 - elo1) / 400.0));
    e2 := 1.0 - e1;
    s1 := case when p1_won then 1.0 when p_winner_id is null then 0.5 else 0.0 end;
    s2 := case when p2_won then 1.0 when p_winner_id is null then 0.5 else 0.0 end;
    update public.profiles set ranked_elo = greatest(100, ranked_elo + round(k * (s1 - e1))) where id = g.player1_id;
    update public.profiles set ranked_elo = greatest(100, ranked_elo + round(k * (s2 - e2))) where id = g.player2_id;
  end if;
end;
$$;

-- ─── MATCHMAKING RPCs (Phase 3) ──────────────────
-- join_matchmaking_queue: Eintragen + sofortiges Matching; gibt game_id oder null zurück
create or replace function public.join_matchmaking_queue(p_queue_type text default 'casual')
returns uuid language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_elo int;
  v_opp record;
  v_game_id uuid;
  v_state jsonb := '{"board":[[],[],[],[],[],[],[],[],[]],"res":{"human":{"small":3,"medium":3,"large":2},"ai":{"small":3,"medium":3,"large":2}},"cur":"human","phase":"placement","over":false,"winner":null,"wl":null,"round":1,"roundResults":[],"sc":{"human":{"total":0,"wins":0,"moves":0,"rnd":0},"ai":{"total":0,"wins":0,"moves":0,"rnd":0}}}';
  elo_range int := 150;  -- ±150 Elo für Ranked
begin
  if v_user_id is null then return null; end if;
  perform pg_advisory_xact_lock(773317);  -- Globaler Lock für Matchmaking (Race-Condition vermeiden)
  select coalesce(ranked_elo, 1000) into v_elo from public.profiles where id = v_user_id;

  insert into public.matchmaking_queue (user_id, queue_type, elo)
  values (v_user_id, p_queue_type, v_elo)
  on conflict (user_id) do update set queue_type = p_queue_type, elo = v_elo, joined_at = now();

  -- Suche Gegner: gleicher Typ, für ranked innerhalb Elo-Range, nicht sich selbst
  select mq.user_id, mq.elo into v_opp
  from public.matchmaking_queue mq
  where mq.queue_type = p_queue_type and mq.user_id != v_user_id
    and (p_queue_type != 'ranked' or abs(mq.elo - v_elo) <= elo_range)
  order by mq.joined_at asc
  limit 1
  for update skip locked;

  if v_opp is null then return null; end if;

  -- Match gefunden: Beide aus Queue entfernen, Spiel erstellen
  delete from public.matchmaking_queue where user_id in (v_user_id, v_opp.user_id);

  insert into public.games (player1_id, player2_id, player1_role, player2_role, mode, status, state_json, is_ranked)
  values (v_user_id, v_opp.user_id, 'human', 'human', 'pvp', 'active', v_state, (p_queue_type = 'ranked'))
  returning id into v_game_id;

  return v_game_id;
end;
$$;

-- leave_matchmaking_queue: Aus Queue austragen
create or replace function public.leave_matchmaking_queue()
returns void language plpgsql security definer as $$
begin
  delete from public.matchmaking_queue where user_id = auth.uid();
end;
$$;

-- ─── DAILY CHALLENGE (Phase 4) ───────────────────
-- Ein Score pro User pro Tag; Rangliste nach Punkten, bei Gleichstand nach Zeit
create table if not exists public.daily_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  challenge_date date not null,
  points       int not null,
  time_ms      bigint default 0,
  rounds_won   int default 0,
  created_at   timestamptz default now(),
  unique(user_id, challenge_date)
);
create index if not exists idx_daily_scores_date on public.daily_scores(challenge_date);
create index if not exists idx_daily_scores_pts on public.daily_scores(challenge_date, points desc);

alter table public.daily_scores enable row level security;
drop policy if exists "daily_scores_read"  on public.daily_scores;
drop policy if exists "daily_scores_insert" on public.daily_scores;
drop policy if exists "daily_scores_update" on public.daily_scores;
create policy "daily_scores_read"  on public.daily_scores for select using (true);
create policy "daily_scores_insert" on public.daily_scores for insert with check (auth.uid() = user_id);
create policy "daily_scores_update" on public.daily_scores for update using (auth.uid() = user_id);

-- submit_daily_score: Einmal pro Tag; wenn bereits vorhanden, nur updaten wenn besser
create or replace function public.submit_daily_score(
  p_points int,
  p_time_ms bigint default 0,
  p_rounds_won int default 0
)
returns void language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_today date := current_date;
  existing record;
begin
  if v_user is null then return; end if;
  select * into existing from public.daily_scores where user_id = v_user and challenge_date = v_today;
  if existing is null then
    insert into public.daily_scores (user_id, challenge_date, points, time_ms, rounds_won)
    values (v_user, v_today, p_points, p_time_ms, p_rounds_won);
  elsif p_points > existing.points or (p_points = existing.points and p_time_ms < existing.time_ms) then
    update public.daily_scores set points = p_points, time_ms = p_time_ms, rounds_won = p_rounds_won
    where user_id = v_user and challenge_date = v_today;
  end if;
end;
$$;

-- ─── PUZZLES (Phase 4) ───────────────────────────
-- Vorgegebene Stellung, Lösung = ein Zug (place oder move)
create table if not exists public.puzzles (
  id            uuid primary key default gen_random_uuid(),
  initial_state  jsonb not null,
  solution_type  text not null,
  solution_data  jsonb not null,
  difficulty    text default 'easy',
  created_at     timestamptz default now()
);
create index if not exists idx_puzzles_difficulty on public.puzzles(difficulty);

alter table public.puzzles enable row level security;
drop policy if exists "puzzles_read" on public.puzzles;
create policy "puzzles_read" on public.puzzles for select using (true);

-- Beispiel-Puzzle (einmalig ausführen): Human setzt Medium auf 4 = drei in einer Reihe
insert into public.puzzles (initial_state, solution_type, solution_data, difficulty)
select
  '{"board":[[],[],[],[{"player":"human","size":"small"}],[],[{"player":"human","size":"small"}],[],[],[]],"res":{"human":{"small":1,"medium":3,"large":2},"ai":{"small":3,"medium":3,"large":2}},"cur":"human","phase":"placement","over":false,"winner":null,"wl":null}'::jsonb,
  'place',
  '{"size":"medium","index":4}'::jsonb,
  'easy'
where not exists (select 1 from public.puzzles limit 1);

-- Realtime: Live-Updates für PvP (Gegner sieht Züge sofort). Idempotent.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games') then
    alter publication supabase_realtime add table public.games;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moves') then
    alter publication supabase_realtime add table public.moves;
  end if;
end $$;

-- ─── ROOMS (Phase 5) ─────────────────────────────
create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  created_by   uuid references public.profiles(id) on delete set null,
  invite_code  text unique,
  max_members  int default 20,
  is_public    boolean default false,
  variant      text not null default 'classic',
  created_at   timestamptz default now()
);
alter table public.rooms add column if not exists variant text not null default 'classic';
create index if not exists idx_rooms_created_by on public.rooms(created_by);
create index if not exists idx_rooms_invite_code on public.rooms(invite_code);
create index if not exists idx_rooms_variant on public.rooms(variant);

create table if not exists public.room_members (
  room_id   uuid references public.rooms(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);
create index if not exists idx_room_members_user on public.room_members(user_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert" on public.rooms for insert with check (auth.uid() is not null);
create policy "rooms_update" on public.rooms for update using (auth.uid() = created_by);

drop policy if exists "room_members_select" on public.room_members;
drop policy if exists "room_members_insert" on public.room_members;
drop policy if exists "room_members_delete" on public.room_members;
create policy "room_members_select" on public.room_members for select using (true);
create policy "room_members_insert" on public.room_members for insert with check (auth.uid() = user_id);
create policy "room_members_delete" on public.room_members for delete using (auth.uid() = user_id or exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid()));

-- games.room_id: optionaler Kontext für Räume
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS room_id uuid references public.rooms(id) on delete set null;
create index if not exists idx_games_room on public.games(room_id);

-- ─── TOURNAMENTS (Phase 6) ──────────────────────
create table if not exists public.tournaments (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  created_by        uuid references public.profiles(id) on delete set null,
  status           text default 'draft',   -- draft | registration | running | finished
  max_participants int default 8,
  format           text default 'single_elimination',
  created_at       timestamptz default now(),
  started_at       timestamptz,
  finished_at      timestamptz
);
create index if not exists idx_tournaments_status on public.tournaments(status);
create index if not exists idx_tournaments_created_by on public.tournaments(created_by);

create table if not exists public.tournament_participants (
  tournament_id  uuid references public.tournaments(id) on delete cascade not null,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  seed           int,                    -- optional für Setzliste
  eliminated_at  timestamptz,            -- null = noch im Turnier
  primary key (tournament_id, user_id)
);
create index if not exists idx_tournament_participants_tournament on public.tournament_participants(tournament_id);

create table if not exists public.tournament_matches (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid references public.tournaments(id) on delete cascade not null,
  round              int not null,       -- 1 = Achtel, 2 = Viertel, 3 = Halb, 4 = Finale
  match_index_in_round int not null,
  game_id            uuid references public.games(id) on delete set null,
  player1_id         uuid references public.profiles(id) on delete set null,
  player2_id         uuid references public.profiles(id) on delete set null,
  winner_id          uuid references public.profiles(id) on delete set null,
  status             text default 'pending',  -- pending | active | finished
  created_at         timestamptz default now()
);
create index if not exists idx_tournament_matches_tournament on public.tournament_matches(tournament_id);
create index if not exists idx_tournament_matches_round on public.tournament_matches(tournament_id, round);

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists "tournaments_select" on public.tournaments;
drop policy if exists "tournaments_insert" on public.tournaments;
drop policy if exists "tournaments_update" on public.tournaments;
create policy "tournaments_select" on public.tournaments for select using (true);
create policy "tournaments_insert" on public.tournaments for insert with check (auth.uid() is not null);
create policy "tournaments_update" on public.tournaments for update using (auth.uid() = created_by);

drop policy if exists "tournament_participants_select" on public.tournament_participants;
drop policy if exists "tournament_participants_insert" on public.tournament_participants;
drop policy if exists "tournament_participants_delete" on public.tournament_participants;
create policy "tournament_participants_select" on public.tournament_participants for select using (true);
create policy "tournament_participants_insert" on public.tournament_participants for insert with check (auth.uid() = user_id);
create policy "tournament_participants_delete" on public.tournament_participants for delete using (auth.uid() = user_id or exists (select 1 from public.tournaments t where t.id = tournament_id and t.created_by = auth.uid()));

drop policy if exists "tournament_matches_select" on public.tournament_matches;
drop policy if exists "tournament_matches_all" on public.tournament_matches;
create policy "tournament_matches_select" on public.tournament_matches for select using (true);
create policy "tournament_matches_all" on public.tournament_matches for all using (exists (select 1 from public.tournaments t where t.id = tournament_id and (t.created_by = auth.uid() or auth.uid() in (select user_id from public.tournament_participants where tournament_id = t.id))));

-- Start tournament: set status to registration, then when starting generate round-1 matches (single elimination)
create or replace function public.start_tournament(p_tournament_id uuid)
returns void language plpgsql security definer as $$
declare
  v_created_by uuid;
  v_status text;
  v_max int;
  v_participants uuid[];
  v_i int;
  v_n int;
  v_round1_matches int;
begin
  select created_by, status, max_participants into v_created_by, v_status, v_max
  from public.tournaments where id = p_tournament_id;
  if v_created_by is null or v_created_by != auth.uid() then return; end if;
  if v_status != 'registration' then return; end if;

  select array_agg(user_id order by seed nulls last, user_id) into v_participants
  from public.tournament_participants where tournament_id = p_tournament_id;
  v_n := coalesce(array_length(v_participants, 1), 0);
  if v_n < 2 then return; end if;

  -- Round 1: ceil(n/2) matches (e.g. 8 -> 4 matches)
  v_round1_matches := (v_n + 1) / 2;
  for v_i in 0 .. v_round1_matches - 1 loop
    insert into public.tournament_matches (tournament_id, round, match_index_in_round, player1_id, player2_id, status)
    values (
      p_tournament_id,
      1,
      v_i,
      v_participants[v_i * 2 + 1],
      case when v_i * 2 + 2 <= v_n then v_participants[v_i * 2 + 2] else null end,
      'pending'
    );
  end loop;

  update public.tournaments set status = 'running', started_at = now() where id = p_tournament_id;
end;
$$;

-- Wenn ein Spiel (das einem Turnier-Match zugeordnet ist) beendet wird: Match als finished markieren und Sieger setzen
create or replace function public.sync_tournament_match_on_game_finished()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    update public.tournament_matches
    set winner_id = new.winner_id, status = 'finished'
    where game_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_game_finished_sync_tournament on public.games;
create trigger on_game_finished_sync_tournament
  after update on public.games
  for each row execute function public.sync_tournament_match_on_game_finished();

-- ─── MIGRATION: Spalten für games (falls Tabelle schon existierte) ─────
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS round int DEFAULT 1;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS round_results jsonb DEFAULT '[]';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT false;

-- Phase 4: daily_scores + puzzles werden oben mit create table if not exists angelegt
