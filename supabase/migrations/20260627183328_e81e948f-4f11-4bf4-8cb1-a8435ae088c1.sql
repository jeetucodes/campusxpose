
CREATE POLICY "evidence public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'evidence');
CREATE POLICY "evidence anon upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'evidence');
