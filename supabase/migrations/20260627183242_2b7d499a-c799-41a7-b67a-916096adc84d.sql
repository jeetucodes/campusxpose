
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

INSERT INTO public.colleges (name, city, state, type, established, total_rating, total_reviews, incident_count, description) VALUES
('Technocrats Institute of Technology','Bhopal','MP','Engineering',2001,3.2,245,89,'Private engineering college in Bhopal.'),
('LNCT Bhopal','Bhopal','MP','Engineering',1994,3.5,412,67,'Lakshmi Narain College of Technology, Bhopal.'),
('MANIT Bhopal','Bhopal','MP','Engineering',1960,4.1,867,12,'Maulana Azad National Institute of Technology.'),
('Sagar Institute of Research','Bhopal','MP','Engineering',1999,3.0,198,54,'Private engineering institute.'),
('Rabindranath Tagore University','Bhopal','MP','University',1995,3.3,334,43,'Private university in Bhopal.'),
('Oriental College of Technology','Bhopal','MP','Engineering',2000,2.8,156,78,'Private engineering college.'),
('Barkatullah University','Bhopal','MP','University',1970,3.7,523,23,'State public university in Bhopal.'),
('IES College of Technology','Bhopal','MP','Engineering',1996,3.1,267,61,'Private engineering college.'),
('Peoples University','Bhopal','MP','University',2009,2.9,189,45,'Private university in Bhopal.'),
('IISER Bhopal','Bhopal','MP','Research',2008,4.6,234,3,'Indian Institute of Science Education and Research.');

INSERT INTO public.incidents (college_id, category, title, description, affected_count, total_amount, severity, status, ai_summary, ai_verdict, trend, proof_count)
SELECT id, 'fake_fine', 'Arbitrary library fines collected without receipts', 'Multiple students charged late fines with no written notice.', 34, 51000, 4, 'active', 'A recurring pattern of arbitrary library and lab fines collected in cash without official receipts, affecting many students.', 'Collecting fees without receipts may violate consumer protection and university financial norms.', 'rising', 3 FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.incidents (college_id, category, title, description, affected_count, severity, status, ai_summary, ai_verdict, trend)
SELECT id, 'faculty', 'Faculty taking attendance bribes', 'Reports of faculty marking attendance in exchange for money.', 18, 5, 'investigating', 'Several reports indicate faculty members allegedly accepting money to mark attendance.', 'Bribery for academic records is a serious ethical and legal violation.', 'stable' FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.incidents (college_id, category, title, description, affected_count, severity, status, ai_summary, ai_verdict, trend)
SELECT id, 'placement', 'Fake placement statistics advertised', 'College advertised 100% placement which students dispute.', 56, 5, 'active', 'Widespread complaints that advertised placement numbers do not match reality.', 'Misleading placement advertising can amount to deceptive trade practice.', 'rising' FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.incidents (college_id, category, title, description, affected_count, severity, status, ai_summary, ai_verdict, trend)
SELECT id, 'hostel', 'Poor hostel mess hygiene', 'Students report unhygienic food and water in hostel mess.', 27, 3, 'active', 'Repeated complaints about hostel mess hygiene and water quality.', 'May breach hostel safety and food safety standards.', 'stable' FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.incidents (college_id, category, title, description, affected_count, severity, status, ai_summary, ai_verdict, trend)
SELECT id, 'exam', 'Internal marks manipulation', 'Allegations of internal assessment marks being altered.', 12, 4, 'investigating', 'Some students allege manipulation of internal assessment marks.', 'Tampering with academic records is a serious integrity violation.', 'declining' FROM public.colleges WHERE name='Technocrats Institute of Technology';

INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_1','ghost_tiger_4821','Bhai mujhse library me 500 ka fine liya bina kisi receipt ke. Notice bhi nahi diya tha.', 'fake_fine', 42, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_2','shadow_wolf_2341','Faculty attendance ke paise maang raha hai. Pay karo toh present, warna absent.', 'faculty', 38, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_3','silent_fox_9012','Placement 100% bola tha, reality me sirf 20% ko job mili. Pure fraud hai.', 'placement', 67, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_4','dark_eagle_5566','Hostel ka khana itna ganda hai, do baar food poisoning ho chuki hai.', 'hostel', 29, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_5','hidden_hawk_1188','Internal marks me bina reason ke number kaat diye. Koi explanation nahi.', 'exam', 15, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_6','brave_storm_7733','Exam form ke naam pe extra 1200 charge kiya. Kya legal hai ye?', 'fake_fine', 21, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_7','wild_blade_4400','Lab me equipment nahi hai par lab fees full le rahe hain.', 'fake_fine', 18, false, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_8','mystic_arrow_2299','Ek professor bahut rude hai, students ko insult karta hai class me.', 'faculty', 24, false, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_9','rebel_flame_8800','Campus me wifi kabhi kaam nahi karta, fir bhi IT fees lete hain.', 'general', 12, false, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
INSERT INTO public.posts (college_id, anonymous_user_hash, username, content, category, upvotes, is_incident, ai_analyzed)
SELECT id, 'seed_hash_10','swift_night_3311','Ragging ho rahi hai seniors se, admin kuch nahi kar raha.', 'harassment', 51, true, true FROM public.colleges WHERE name='Technocrats Institute of Technology';
