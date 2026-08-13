-- 1. Create Tables
CREATE TABLE IF NOT EXISTS store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text,
  color_class text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  badge_text text,
  image_url text,
  bg_class text,
  text_class text,
  badge_bg_class text,
  badge_text_class text,
  badge_border_class text,
  button_text text,
  button_link text,
  target_product_id uuid REFERENCES store_products(id) ON DELETE SET NULL,
  title_size text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  qty text,
  price text NOT NULL,
  original_price text,
  time text,
  icon_url text,
  images text[],
  platform text,
  category text,
  description text,
  features text[],
  is_hot_deal boolean DEFAULT false,
  buy_url text,
  created_at timestamp DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (if you are re-running this script)
DROP POLICY IF EXISTS allow_all_read_categories ON store_categories;
DROP POLICY IF EXISTS allow_all_write_categories ON store_categories;
DROP POLICY IF EXISTS allow_all_read_banners ON store_banners;
DROP POLICY IF EXISTS allow_all_write_banners ON store_banners;
DROP POLICY IF EXISTS allow_all_read_products ON store_products;
DROP POLICY IF EXISTS allow_all_write_products ON store_products;

-- 4. Create Policies for Public Access (Since it's a prototype)
CREATE POLICY allow_all_read_categories ON store_categories FOR SELECT USING (true);
CREATE POLICY allow_all_write_categories ON store_categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY allow_all_read_banners ON store_banners FOR SELECT USING (true);
CREATE POLICY allow_all_write_banners ON store_banners FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY allow_all_read_products ON store_products FOR SELECT USING (true);
CREATE POLICY allow_all_write_products ON store_products FOR ALL USING (true) WITH CHECK (true);

-- 5. Insert Default Categories
INSERT INTO store_categories (name, icon_url, color_class) VALUES
('Snacks', '/shop/cat_snacks_1786624546251.png', 'bg-orange-50'),
('Electronics', '/shop/cat_electronics_1786624683132.png', 'bg-blue-50'),
('Study', '/shop/cat_study_1786624743210.png', 'bg-purple-50'),
('Stationery', '/shop/cat_stationery_1786624756922.png', 'bg-red-50'),
('Audio', '/shop/cat_audio_1786624820961.png', 'bg-green-50'),
('Gaming', '/shop/cat_gaming_1786625388222.png', 'bg-indigo-50'),
('Fitness', '/shop/cat_fitness_1786625416729.png', 'bg-slate-50'),
('Wearables', '/shop/cat_wearables_1786625466231.png', 'bg-pink-50');

-- 6. Insert Default Banners
INSERT INTO store_banners (title, category, badge_text, image_url, bg_class, text_class, badge_bg_class, badge_text_class, badge_border_class) VALUES
('Laptops & Tabs', 'Electronics', 'Up to 40% OFF', '/shop/shop_banner_1786623248806.png', 'bg-blue-50', 'text-blue-900', 'bg-blue-200', 'text-blue-700', 'border-blue-900'),
('Midnight Snacks', 'Snacks', 'Delivery in 10 mins', '/shop/cat_snacks_1786624546251.png', 'bg-orange-50', 'text-orange-900', 'bg-orange-200', 'text-orange-700', 'border-orange-900'),
('Study Books', 'Study', 'Semester Prep', '/shop/cat_study_1786624743210.png', 'bg-purple-50', 'text-purple-900', 'bg-purple-200', 'text-purple-700', 'border-purple-900'),
('Audio Gear', 'Audio', 'Noise Cancelling', '/shop/cat_audio_1786624820961.png', 'bg-green-50', 'text-green-900', 'bg-green-200', 'text-green-700', 'border-green-900');

-- Run these if upgrading existing tables:
-- ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS button_text text;
-- ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS button_link text;
-- ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS target_product_id uuid REFERENCES store_products(id) ON DELETE SET NULL;
-- ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS title_size text;
