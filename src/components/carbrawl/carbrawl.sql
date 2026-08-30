-- ═══════════════════════════════════════════════════════════════
-- CAR BRAWL — Complete Database Schema
-- Execute in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Player Profile ───
CREATE TABLE IF NOT EXISTS carbrawl_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- SOV balance (source of truth)
  sov_balance INTEGER NOT NULL DEFAULT 0,
  -- Stats
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_eliminations INTEGER NOT NULL DEFAULT 0,
  -- Career
  career_current_phase INTEGER NOT NULL DEFAULT 1,
  career_phases_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_stars INTEGER NOT NULL DEFAULT 0,
  -- Build preferences (last used)
  last_build JSONB NOT NULL DEFAULT '{"peso":20,"potencia":20,"aderencia":20,"velocidade":20,"resistencia":20,"estabilidade":20}'::jsonb,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE carbrawl_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbrawl_profiles_own" ON carbrawl_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 2. Match History ───
CREATE TABLE IF NOT EXISTS carbrawl_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'career', 'online', 'championship')),
  arena TEXT NOT NULL,
  result_position INTEGER,
  survived BOOLEAN NOT NULL DEFAULT false,
  eliminations INTEGER NOT NULL DEFAULT 0,
  sov_earned INTEGER NOT NULL DEFAULT 0,
  -- Vehicle build used
  vehicle_build JSONB NOT NULL,
  -- Opponents info
  opponent_count INTEGER NOT NULL DEFAULT 0,
  opponent_difficulty TEXT,
  -- Career phase (if applicable)
  career_phase INTEGER,
  -- Duration
  duration_seconds INTEGER,
  -- Timestamp
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE carbrawl_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbrawl_matches_own" ON carbrawl_matches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_carbrawl_matches_user ON carbrawl_matches(user_id, played_at DESC);

-- ─── 3. SOV Ledger ───
CREATE TABLE IF NOT EXISTS carbrawl_sov_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('win', 'loss', 'phase_complete', 'championship', 'elimination', 'achievement')),
  description TEXT NOT NULL,
  -- Idempotency: prevent double-crediting
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE carbrawl_sov_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbrawl_sov_own" ON carbrawl_sov_ledger
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_carbrawl_sov_user ON carbrawl_sov_ledger(user_id, created_at DESC);

-- ─── 4. Online Rooms ───
CREATE TABLE IF NOT EXISTS carbrawl_rooms (
  room_id TEXT PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing', 'finished')),
  arena TEXT NOT NULL DEFAULT 'lava',
  max_players INTEGER NOT NULL DEFAULT 8,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Result
  winner_id UUID,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE carbrawl_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbrawl_rooms_public" ON carbrawl_rooms FOR SELECT USING (true);
CREATE POLICY "carbrawl_rooms_host" ON carbrawl_rooms
  FOR ALL TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- ─── 5. Championships ───
CREATE TABLE IF NOT EXISTS carbrawl_championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  size INTEGER NOT NULL CHECK (size IN (8, 12, 16, 32)),
  arena TEXT NOT NULL DEFAULT 'lava',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  current_round INTEGER NOT NULL DEFAULT 1,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  champion_id UUID,
  -- Participants
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE carbrawl_championships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbrawl_champs_public" ON carbrawl_championships FOR SELECT USING (true);
CREATE POLICY "carbrawl_champs_host" ON carbrawl_championships
  FOR ALL TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- ═══════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- ─── Upsert profile on first login ───
CREATE OR REPLACE FUNCTION carbrawl_upsert_profile()
RETURNS carbrawl_profiles
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row carbrawl_profiles;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO carbrawl_profiles (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM carbrawl_profiles WHERE user_id = v_uid;
  RETURN v_row;
END;
$$;

-- ─── Record match result + SOV ───
CREATE OR REPLACE FUNCTION carbrawl_record_match(
  p_mode TEXT,
  p_arena TEXT,
  p_position INTEGER,
  p_survived BOOLEAN,
  p_eliminations INTEGER,
  p_sov_earned INTEGER,
  p_vehicle_build JSONB,
  p_opponent_count INTEGER,
  p_opponent_difficulty TEXT,
  p_career_phase INTEGER DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (sov_balance INTEGER, match_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_match_id UUID;
  v_new_balance INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Insert match record
  INSERT INTO carbrawl_matches (
    user_id, mode, arena, result_position, survived, eliminations,
    sov_earned, vehicle_build, opponent_count, opponent_difficulty,
    career_phase, duration_seconds
  ) VALUES (
    v_uid, p_mode, p_arena, p_position, p_survived, p_eliminations,
    p_sov_earned, p_vehicle_build, p_opponent_count, p_opponent_difficulty,
    p_career_phase, p_duration_seconds
  ) RETURNING id INTO v_match_id;

  -- Credit SOV (idempotent)
  IF p_sov_earned > 0 THEN
    INSERT INTO carbrawl_sov_ledger (user_id, amount, type, description, idempotency_key)
    VALUES (v_uid, p_sov_earned, 'win', p_mode || ' match reward', p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

    UPDATE carbrawl_profiles SET
      sov_balance = sov_balance + p_sov_earned,
      total_matches = total_matches + 1,
      total_wins = total_wins + CASE WHEN p_survived THEN 1 ELSE 0 END,
      total_eliminations = total_eliminations + p_eliminations,
      updated_at = now()
    WHERE user_id = v_uid;
  ELSE
    UPDATE carbrawl_profiles SET
      total_matches = total_matches + 1,
      total_wins = total_wins + CASE WHEN p_survived THEN 1 ELSE 0 END,
      total_eliminations = total_eliminations + p_eliminations,
      updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  SELECT sov_balance INTO v_new_balance FROM carbrawl_profiles WHERE user_id = v_uid;

  RETURN QUERY SELECT v_new_balance, v_match_id;
END;
$$;

-- ─── Update career progress ───
CREATE OR REPLACE FUNCTION carbrawl_update_career(
  p_phase INTEGER,
  p_stars INTEGER
)
RETURNS carbrawl_profiles
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row carbrawl_profiles;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE carbrawl_profiles SET
    career_current_phase = GREATEST(career_current_phase, p_phase + 1),
    career_stars = career_stars + p_stars,
    updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ─── Save build preference ───
CREATE OR REPLACE FUNCTION carbrawl_save_build(p_build JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE carbrawl_profiles SET last_build = p_build, updated_at = now() WHERE user_id = auth.uid();
END;
$$;

-- ─── Create online room ───
CREATE OR REPLACE FUNCTION carbrawl_create_room(p_arena TEXT, p_max_players INTEGER)
RETURNS carbrawl_rooms
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room_id TEXT;
  v_room carbrawl_rooms;
  v_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  v_room_id := 'CB-' || substr(md5(random()::text), 1, 6);

  SELECT COALESCE(nome, 'Jogador') INTO v_name FROM cidadela_perfis WHERE user_id = v_uid;

  INSERT INTO carbrawl_rooms (room_id, host_id, max_players, arena, players)
  VALUES (v_room_id, v_uid, p_max_players, p_arena,
    jsonb_build_array(jsonb_build_object('userId', v_uid, 'name', v_name, 'ready', false, 'isBot', false)))
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

-- ─── Join room ───
CREATE OR REPLACE FUNCTION carbrawl_join_room(p_room_id TEXT)
RETURNS carbrawl_rooms
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room carbrawl_rooms;
  v_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_room FROM carbrawl_rooms WHERE room_id = p_room_id AND status = 'waiting';
  IF NOT FOUND THEN RAISE EXCEPTION 'room not found or already started'; END IF;

  IF jsonb_array_length(v_room.players) >= v_room.max_players THEN
    RAISE EXCEPTION 'room is full';
  END IF;

  SELECT COALESCE(nome, 'Jogador') INTO v_name FROM cidadela_perfis WHERE user_id = v_uid;

  UPDATE carbrawl_rooms SET
    players = players || jsonb_build_array(jsonb_build_object('userId', v_uid, 'name', v_name, 'ready', false, 'isBot', false)),
    updated_at = now()
  WHERE room_id = p_room_id
  RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;
