# ABF Database Schema

## Overview
PostgreSQL database via Supabase with Row Level Security (RLS) enabled.

---

## Core Tables

### users
*Managed by Supabase Auth - don't modify directly*

```sql
-- Supabase Auth handles this table
-- Reference via auth.users()
```

---

### profiles
*Extended user information*

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT, -- Optional: different from legal name
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and their partner's
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view partner profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships
      WHERE (user_a_id = auth.uid() AND user_b_id = profiles.id)
         OR (user_b_id = auth.uid() AND user_a_id = profiles.id)
      AND status = 'active'
    )
  );

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### invites
*Partner connection invitations*

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX invites_code_idx ON invites(code);
CREATE INDEX invites_inviter_idx ON invites(inviter_id);

-- RLS Policies
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Inviters can see their own invites
CREATE POLICY "Users can view own invites"
  ON invites FOR SELECT
  USING (auth.uid() = inviter_id);

-- Anyone can view valid unused invites (to accept them)
CREATE POLICY "Anyone can view valid invites"
  ON invites FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());

-- Users can create invites
CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);
```

---

### relationships
*Connections between partners*

```sql
CREATE TYPE relationship_status AS ENUM ('pending', 'active', 'disconnected');

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status relationship_status DEFAULT 'pending',
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each user can only have one active relationship
  CONSTRAINT unique_active_relationship_user_a 
    EXCLUDE (user_a_id WITH =) 
    WHERE (status = 'active'),
  CONSTRAINT unique_active_relationship_user_b 
    EXCLUDE (user_b_id WITH =) 
    WHERE (status = 'active'),
  
  -- Ensure users aren't the same person
  CONSTRAINT different_users CHECK (user_a_id != user_b_id)
);

-- Indexes
CREATE INDEX relationships_user_a_idx ON relationships(user_a_id);
CREATE INDEX relationships_user_b_idx ON relationships(user_b_id);
CREATE INDEX relationships_status_idx ON relationships(status);

-- RLS Policies
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationships"
  ON relationships FOR SELECT
  USING (auth.uid() IN (user_a_id, user_b_id));

CREATE POLICY "Users can update own relationships"
  ON relationships FOR UPDATE
  USING (auth.uid() IN (user_a_id, user_b_id));
```

---

### themes
*Weekly check-in themes*

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial themes
INSERT INTO themes (name, description, emoji, sort_order) VALUES
  ('Gratitude', 'Express appreciation and thanks', '🙏', 1),
  ('Dreams', 'Share hopes and future plans', '✨', 2),
  ('Memories', 'Reflect on favorite moments', '💭', 3),
  ('Support', 'How to be there for each other', '🤝', 4),
  ('Fun', 'Light-hearted and playful', '🎉', 5),
  ('Deep', 'Vulnerable and meaningful', '💙', 6);

-- RLS: Public read-only
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view themes"
  ON themes FOR SELECT
  USING (is_active = TRUE);
```

---

### questions
*Check-in questions*

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX questions_theme_idx ON questions(theme_id);

-- Initial questions for Gratitude theme
INSERT INTO questions (theme_id, question_text, question_order)
SELECT id, 'What made you smile this week?', 1 FROM themes WHERE name = 'Gratitude'
UNION ALL
SELECT id, 'What are you looking forward to?', 2 FROM themes WHERE name = 'Gratitude'
UNION ALL
SELECT id, 'How can I support you better?', 3 FROM themes WHERE name = 'Gratitude'
UNION ALL
SELECT id, 'One thing I appreciate about you is...', 4 FROM themes WHERE name = 'Gratitude';

-- RLS: Public read-only
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  USING (is_active = TRUE);
```

---

### checkins
*Weekly check-in instances*

```sql
CREATE TYPE checkin_status AS ENUM ('draft', 'submitted', 'complete');

CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One check-in per relationship per week
  CONSTRAINT unique_checkin_per_week 
    UNIQUE (relationship_id, week_start_date)
);

-- Indexes
CREATE INDEX checkins_relationship_idx ON checkins(relationship_id);
CREATE INDEX checkins_week_idx ON checkins(week_start_date);

-- RLS Policies
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
  ON checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = checkins.relationship_id
      AND auth.uid() IN (user_a_id, user_b_id)
    )
  );

CREATE POLICY "Users can create checkins"
  ON checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = checkins.relationship_id
      AND auth.uid() IN (user_a_id, user_b_id)
      AND status = 'active'
    )
  );
```

---

### responses
*User responses to check-in questions*

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One response per user per question per checkin
  CONSTRAINT unique_response 
    UNIQUE (checkin_id, question_id, user_id)
);

-- Indexes
CREATE INDEX responses_checkin_idx ON responses(checkin_id);
CREATE INDEX responses_user_idx ON responses(user_id);
CREATE INDEX responses_question_idx ON responses(question_id);

-- RLS Policies
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Users can always see their own responses
CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see partner's responses only after both submitted
CREATE POLICY "Users can view partner responses after both submit"
  ON responses FOR SELECT
  USING (
    -- Is this response from my partner?
    EXISTS (
      SELECT 1 FROM relationships r
      JOIN checkins c ON c.relationship_id = r.id
      WHERE c.id = responses.checkin_id
      AND auth.uid() IN (r.user_a_id, r.user_b_id)
      AND responses.user_id != auth.uid()
    )
    AND
    -- Have both partners submitted?
    (
      SELECT COUNT(DISTINCT user_id) 
      FROM responses r2
      WHERE r2.checkin_id = responses.checkin_id
      AND r2.submitted_at IS NOT NULL
    ) >= 2
  );

-- Users can create/update their own responses
CREATE POLICY "Users can manage own responses"
  ON responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### media
*Photos and music shared in check-ins*

```sql
CREATE TYPE media_type AS ENUM ('photo', 'music');

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  
  -- For photos
  storage_path TEXT, -- Path in Supabase Storage
  thumbnail_path TEXT,
  
  -- For music
  music_service TEXT, -- 'spotify', 'apple', 'youtube'
  music_url TEXT,
  song_title TEXT,
  artist_name TEXT,
  
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX media_response_idx ON media(response_id);
CREATE INDEX media_user_idx ON media(user_id);

-- RLS Policies (inherit from responses)
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media from viewable responses"
  ON media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = media.response_id
      -- Reuse responses RLS logic
    )
  );

CREATE POLICY "Users can manage own media"
  ON media FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Helper Functions

### update_updated_at_column()
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### get_current_week_dates()
```sql
CREATE OR REPLACE FUNCTION get_current_week_dates()
RETURNS TABLE(week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', CURRENT_DATE)::DATE AS week_start,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE AS week_end;
END;
$$ LANGUAGE plpgsql;
```

### get_or_create_current_checkin(p_relationship_id UUID)
```sql
CREATE OR REPLACE FUNCTION get_or_create_current_checkin(p_relationship_id UUID)
RETURNS UUID AS $$
DECLARE
  v_checkin_id UUID;
  v_week_start DATE;
  v_week_end DATE;
  v_theme_id UUID;
BEGIN
  -- Get current week dates
  SELECT week_start, week_end INTO v_week_start, v_week_end
  FROM get_current_week_dates();
  
  -- Try to find existing checkin
  SELECT id INTO v_checkin_id
  FROM checkins
  WHERE relationship_id = p_relationship_id
  AND week_start_date = v_week_start;
  
  -- If doesn't exist, create it
  IF v_checkin_id IS NULL THEN
    -- Get next theme in rotation (simple approach)
    SELECT id INTO v_theme_id
    FROM themes
    WHERE is_active = TRUE
    ORDER BY sort_order
    LIMIT 1;
    
    INSERT INTO checkins (relationship_id, theme_id, week_start_date, week_end_date)
    VALUES (p_relationship_id, v_theme_id, v_week_start, v_week_end)
    RETURNING id INTO v_checkin_id;
  END IF;
  
  RETURN v_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Views

### v_current_checkins
*Easy access to this week's check-ins with completion status*

```sql
CREATE VIEW v_current_checkins AS
SELECT 
  c.*,
  t.name as theme_name,
  t.emoji as theme_emoji,
  COUNT(DISTINCT r.user_id) as responses_submitted,
  BOOL_AND(r.submitted_at IS NOT NULL) as both_submitted
FROM checkins c
JOIN themes t ON t.id = c.theme_id
LEFT JOIN responses r ON r.checkin_id = c.id AND r.submitted_at IS NOT NULL
WHERE c.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
GROUP BY c.id, t.name, t.emoji;
```

---

## Indexes Summary

**Performance Considerations:**
- User lookups (by ID): Primary keys handle this
- Relationship lookups: Indexed on both user IDs
- Check-in queries: Indexed on relationship_id and week_start_date
- Response queries: Indexed on checkin_id and user_id
- Media queries: Indexed on response_id

**Additional indexes to add as needed:**
- `responses.submitted_at` if we query incomplete responses often
- Composite index on `(relationship_id, week_start_date)` for checkins

---

## Migration Strategy

### Phase 1: Core Setup (Week 1)
1. Create profiles table
2. Create invites table
3. Create relationships table
4. Set up RLS policies

### Phase 2: Check-ins (Week 2)
1. Create themes table + seed data
2. Create questions table + seed data
3. Create checkins table
4. Create responses table
5. Create helper functions

### Phase 3: Media (Week 3)
1. Create media table
2. Set up Supabase Storage buckets
3. Create upload policies

### Phase 4: Optimization (Week 4+)
1. Create views
2. Add additional indexes based on query patterns
3. Set up database backups
4. Performance monitoring

---

## Security Considerations

**Row Level Security (RLS):**
- ✅ All tables have RLS enabled
- ✅ Users can only access their own and partner's data
- ✅ Responses only visible after both partners submit
- ✅ No way to see other couples' data

**Data Privacy:**
- All sensitive data encrypted at rest (Supabase default)
- Use HTTPS for all connections
- Store media in private Supabase Storage buckets
- Regular security audits of RLS policies

**Compliance:**
- GDPR: Users can export and delete all data
- Data retention: Keep data until user requests deletion
- Audit logs: Track all data access (Supabase logs)

---

## Backup & Recovery

**Automated Backups:**
- Daily full backups (Supabase handles this)
- Point-in-time recovery available
- Test restore process monthly

**Manual Exports:**
- Allow users to export their data as JSON
- Include all check-ins, responses, and media
- Provide in settings: "Download My Data"
