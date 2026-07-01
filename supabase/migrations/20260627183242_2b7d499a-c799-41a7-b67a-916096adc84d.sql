
CREATE TYPE public.college_type AS ENUM ('Engineering','Medical','Arts','Commerce','University','Research');
CREATE TYPE public.incident_status AS ENUM ('active','investigating','resolved','dismissed');
CREATE TYPE public.incident_trend AS ENUM ('rising','stable','declining');

CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  type public.college_type NOT NULL,
  established integer,
  description text,
  total_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  incident_count integer DEFAULT 0,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.colleges TO anon, authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colleges public read" ON public.colleges FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  affected_count integer DEFAULT 1,
  total_amount numeric DEFAULT 0,
  severity integer DEFAULT 1,
  status public.incident_status DEFAULT 'active',
  ai_summary text,
  ai_verdict text,
  admin_notes text,
  trend public.incident_trend DEFAULT 'stable',
  proof_count integer DEFAULT 0,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.incidents TO anon, authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents public read" ON public.incidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "incidents anon insert" ON public.incidents FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  anonymous_user_hash text NOT NULL,
  faculty_rating integer,
  placement_rating integer,
  infrastructure_rating integer,
  campus_life_rating integer,
  value_rating integer,
  overall numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ratings TO anon, authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings public read" ON public.ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ratings anon insert" ON public.ratings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  anonymous_user_hash text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  is_incident boolean DEFAULT false,
  ai_analyzed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "posts anon insert" ON public.posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "posts anon update" ON public.posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  type text NOT NULL,
  file_url text NOT NULL,
  ai_extracted_data jsonb DEFAULT '{}'::jsonb,
  is_verified boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.evidence TO anon, authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence public read" ON public.evidence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "evidence anon insert" ON public.evidence FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  anonymous_user_hash text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  is_incident_signal boolean DEFAULT false,
  incident_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_messages TO anon, authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages public read" ON public.community_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "messages anon insert" ON public.community_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash text NOT NULL UNIQUE,
  username text,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.banned_users TO service_role;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;


