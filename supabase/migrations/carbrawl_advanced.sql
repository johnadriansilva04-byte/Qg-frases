-- ═══════════════════════════════════════════════════════════════
-- CAR BRAWL — Complete Database Schema (from battle-carts-engine-main)
-- Execute in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ============ TABELAS PRINCIPAIS ============

CREATE TABLE IF NOT EXISTS game_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Piloto',
  sov bigint NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  matches integer NOT NULL DEFAULT 0,
  tournaments_won integer NOT NULL DEFAULT 0,
  career_stage integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sov_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sov_ledger_user_idx ON sov_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  arena text NOT NULL DEFAULT 'classic',
  max_participants integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'lobby',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_rooms_status_chk CHECK (status IN ('lobby','running','finished')),
  CONSTRAINT game_rooms_size_chk CHECK (max_participants IN (2,4,8,12,16,32))
);
CREATE INDEX game_rooms_status_idx ON game_rooms (status, created_at DESC);

CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES game_rooms ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  is_bot boolean NOT NULL DEFAULT false,
  is_ready boolean NOT NULL DEFAULT false,
  slot integer NOT NULL DEFAULT 0,
  build jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX room_participants_user_uidx ON room_participants (room_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX room_participants_room_idx ON room_participants (room_id);

CREATE TABLE IF NOT EXISTS game_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  room_id uuid REFERENCES game_rooms ON DELETE SET NULL,
  mode text NOT NULL,
  arena text NOT NULL,
  participants integer NOT NULL DEFAULT 1,
  placement integer NOT NULL DEFAULT 1,
  won boolean NOT NULL DEFAULT false,
  eliminations integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_matches_user_idx ON game_matches (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  size integer NOT NULL,
  arena text NOT NULL DEFAULT 'classic',
  status text NOT NULL DEFAULT 'running',
  current_round integer NOT NULL DEFAULT 0,
  bracket jsonb NOT NULL DEFAULT '[]'::jsonb,
  champion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_size_chk CHECK (size IN (8,12,16,32)),
  CONSTRAINT tournaments_status_chk CHECK (status IN ('running','finished','abandoned'))
);
CREATE INDEX tournaments_user_idx ON tournaments (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS career_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  stage integer NOT NULL DEFAULT 1,
  completed_stages integer[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE TABLE IF NOT EXISTS game_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

-- ============ GRANTS ============
GRANT SELECT ON game_profiles TO authenticated;
GRANT INSERT ON game_profiles TO authenticated;
GRANT ALL ON game_profiles TO service_role;

GRANT SELECT ON sov_ledger TO authenticated;
GRANT ALL ON sov_ledger TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON game_rooms TO authenticated;
GRANT ALL ON game_rooms TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON room_participants TO authenticated;
GRANT ALL ON room_participants TO service_role;

GRANT SELECT, INSERT ON game_matches TO authenticated;
GRANT ALL ON game_matches TO service_role;

GRANT SELECT, INSERT, UPDATE ON tournaments TO authenticated;
GRANT ALL ON tournaments TO service_role;

GRANT SELECT, INSERT, UPDATE ON career_progress TO authenticated;
GRANT ALL ON career_progress TO service_role;

GRANT SELECT, INSERT ON game_achievements TO authenticated;
GRANT ALL ON game_achievements TO service_role;

GRANT SELECT, INSERT ON game_unlocks TO authenticated;
GRANT ALL ON game_unlocks TO service_role;

-- ============ RLS ============
ALTER TABLE game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sov_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by authenticated" ON game_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON game_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ledger select own" ON sov_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rooms readable by authenticated" ON game_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms insert own" ON game_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "rooms update host" ON game_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "rooms delete host" ON game_rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "participants readable by authenticated" ON room_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "participants insert self or host" ON room_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM game_rooms r WHERE r.id = room_id AND r.host_user_id = auth.uid())
  );
CREATE POLICY "participants update self or host" ON room_participants
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM game_rooms r WHERE r.id = room_id AND r.host_user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM game_rooms r WHERE r.id = room_id AND r.host_user_id = auth.uid())
  );
CREATE POLICY "participants delete self or host" ON room_participants
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM game_rooms r WHERE r.id = room_id AND r.host_user_id = auth.uid())
  );

CREATE POLICY "matches select own" ON game_matches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "matches insert own" ON game_matches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tournaments select own" ON tournaments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tournaments insert own" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tournaments update own" ON tournaments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "career select own" ON career_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "career insert own" ON career_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career update own" ON career_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "achievements select own" ON game_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "achievements insert own" ON game_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "unlocks select own" ON game_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "unlocks insert own" ON game_unlocks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ TIMESTAMP TRIGGERS ============
CREATE OR REPLACE FUNCTION game_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER game_profiles_touch BEFORE UPDATE ON game_profiles
  FOR EACH ROW EXECUTE FUNCTION game_touch_updated_at();
CREATE TRIGGER game_rooms_touch BEFORE UPDATE ON game_rooms
  FOR EACH ROW EXECUTE FUNCTION game_touch_updated_at();
CREATE TRIGGER tournaments_touch BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION game_touch_updated_at();

-- ============ PERFIL AUTOMÁTICO ============
CREATE OR REPLACE FUNCTION game_ensure_profile()
RETURNS game_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  prof game_profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO prof FROM game_profiles WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO game_profiles (user_id, display_name)
    VALUES (uid, COALESCE(NULLIF(split_part((SELECT email FROM auth.users WHERE id = uid), '@', 1), ''), 'Piloto'))
    RETURNING * INTO prof;
    INSERT INTO career_progress (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  END IF;
  RETURN prof;
END; $$;

-- ============ CONCESSÃO SEGURA DE SOV ============
-- O valor NUNCA vem do frontend: é calculado a partir do motivo no servidor.
CREATE OR REPLACE FUNCTION game_sov_value(_reason text, _factor integer DEFAULT 1)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _reason
    WHEN 'match_win' THEN 50
    WHEN 'match_played' THEN 10
    WHEN 'match_podium' THEN 25
    WHEN 'elimination' THEN 5 * GREATEST(LEAST(_factor, 32), 0)
    WHEN 'career_stage' THEN 100
    WHEN 'tournament_round' THEN 40
    WHEN 'tournament_win' THEN 250
    WHEN 'achievement' THEN 100
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION game_award_sov(_reason text, _factor integer DEFAULT 1, _detail text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  amt integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM game_ensure_profile();
  amt := game_sov_value(_reason, COALESCE(_factor, 1));
  IF amt <= 0 THEN RETURN 0; END IF;
  INSERT INTO sov_ledger (user_id, amount, reason, detail) VALUES (uid, amt, _reason, _detail);
  UPDATE game_profiles SET sov = sov + amt WHERE user_id = uid;
  RETURN amt;
END; $$;

-- ============ REGISTRO DE PARTIDA + SOV ============
CREATE OR REPLACE FUNCTION game_record_match(
  _mode text,
  _arena text,
  _participants integer,
  _placement integer,
  _eliminations integer,
  _duration_ms integer,
  _room_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  parts integer := GREATEST(LEAST(COALESCE(_participants, 1), 32), 1);
  place integer := GREATEST(LEAST(COALESCE(_placement, parts), parts), 1);
  elims integer := GREATEST(LEAST(COALESCE(_eliminations, 0), parts), 0);
  dur integer := GREATEST(LEAST(COALESCE(_duration_ms, 0), 3600000), 0);
  won boolean := (place = 1);
  gained integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM game_ensure_profile();

  INSERT INTO game_matches (user_id, room_id, mode, arena, participants, placement, won, eliminations, duration_ms)
  VALUES (uid, _room_id, _mode, _arena, parts, place, won, elims, dur);

  UPDATE game_profiles
     SET matches = matches + 1,
         wins = wins + CASE WHEN won THEN 1 ELSE 0 END,
         losses = losses + CASE WHEN won THEN 0 ELSE 1 END
   WHERE user_id = uid;

  gained := gained + game_award_sov('match_played', 1, _mode);
  IF elims > 0 THEN gained := gained + game_award_sov('elimination', elims, _mode); END IF;
  IF won THEN
    gained := gained + game_award_sov('match_win', 1, _mode);
  ELSIF place <= 3 AND parts >= 4 THEN
    gained := gained + game_award_sov('match_podium', 1, _mode);
  END IF;

  RETURN jsonb_build_object('sov_gained', gained, 'won', won, 'placement', place);
END; $$;

-- ============ CARREIRA ============
CREATE OR REPLACE FUNCTION game_complete_career_stage(_stage integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  prog career_progress;
  gained integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM game_ensure_profile();
  INSERT INTO career_progress (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO prog FROM career_progress WHERE user_id = uid;

  IF _stage IS NULL OR _stage < 1 OR _stage > prog.stage THEN
    RAISE EXCEPTION 'invalid stage';
  END IF;

  IF NOT (_stage = ANY (prog.completed_stages)) THEN
    UPDATE career_progress
       SET completed_stages = array_append(completed_stages, _stage),
           stage = GREATEST(stage, _stage + 1),
           updated_at = now()
     WHERE user_id = uid
     RETURNING * INTO prog;
    UPDATE game_profiles SET career_stage = prog.stage WHERE user_id = uid;
    gained := game_award_sov('career_stage', 1, 'fase ' || _stage);
  END IF;

  RETURN jsonb_build_object('sov_gained', gained, 'stage', prog.stage, 'completed', prog.completed_stages);
END; $$;

-- ============ CONQUISTAS ============
CREATE OR REPLACE FUNCTION game_unlock_achievement(_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  gained integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM game_ensure_profile();
  INSERT INTO game_achievements (user_id, key) VALUES (uid, _key)
  ON CONFLICT (user_id, key) DO NOTHING;
  IF FOUND THEN gained := game_award_sov('achievement', 1, _key); END IF;
  RETURN gained;
END; $$;

-- ============ CAMPEONATO ============
CREATE OR REPLACE FUNCTION game_tournament_progress(_id uuid, _bracket jsonb, _round integer, _finished boolean, _champion text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  gained integer := 0;
  t tournaments;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO t FROM tournaments WHERE id = _id AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'tournament not found'; END IF;
  IF t.status = 'finished' THEN RETURN jsonb_build_object('sov_gained', 0); END IF;

  UPDATE tournaments
     SET bracket = _bracket,
         current_round = GREATEST(_round, current_round),
         status = CASE WHEN _finished THEN 'finished' ELSE 'running' END,
         champion = COALESCE(_champion, champion)
   WHERE id = _id;

  IF _round > t.current_round THEN
    gained := gained + game_award_sov('tournament_round', 1, 'rodada ' || _round);
  END IF;

  IF _finished AND _champion IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM game_profiles p WHERE p.user_id = uid AND p.display_name = _champion) THEN
      gained := gained + game_award_sov('tournament_win', 1, 'campeonato');
      UPDATE game_profiles SET tournaments_won = tournaments_won + 1 WHERE user_id = uid;
    END IF;
  END IF;

  RETURN jsonb_build_object('sov_gained', gained);
END; $$;

-- ============ SALAS: código e entrada ============
CREATE OR REPLACE FUNCTION game_create_room(_arena text, _max integer)
RETURNS game_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  new_code text;
  room game_rooms;
  prof game_profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  prof := game_ensure_profile();
  IF _max NOT IN (2,4,8,12,16,32) THEN RAISE EXCEPTION 'invalid size'; END IF;
  LOOP
    new_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM game_rooms WHERE code = new_code);
  END LOOP;
  INSERT INTO game_rooms (code, host_user_id, arena, max_participants)
  VALUES (new_code, uid, COALESCE(_arena, 'classic'), _max)
  RETURNING * INTO room;
  INSERT INTO room_participants (room_id, user_id, name, slot, is_ready)
  VALUES (room.id, uid, prof.display_name, 0, true);
  RETURN room;
END; $$;

CREATE OR REPLACE FUNCTION game_join_room(_code text)
RETURNS game_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  room game_rooms;
  prof game_profiles;
  used integer;
  next_slot integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  prof := game_ensure_profile();
  SELECT * INTO room FROM game_rooms WHERE code = upper(_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'room not found'; END IF;
  IF EXISTS (SELECT 1 FROM room_participants WHERE room_id = room.id AND user_id = uid) THEN
    RETURN room;
  END IF;
  SELECT count(*) INTO used FROM room_participants WHERE room_id = room.id;
  IF used >= room.max_participants THEN RAISE EXCEPTION 'room full'; END IF;
  SELECT COALESCE(max(slot), -1) + 1 INTO next_slot FROM room_participants WHERE room_id = room.id;
  INSERT INTO room_participants (room_id, user_id, name, slot)
  VALUES (room.id, uid, prof.display_name, next_slot);
  RETURN room;
END; $$;

-- ============ REALTIME ============
ALTER TABLE game_rooms REPLICA IDENTITY FULL;
ALTER TABLE room_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
