-- Storage bucket for public chat media files (images, videos, documents sent via WhatsApp)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the chat-media bucket
CREATE POLICY "Public read chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- Allow authenticated users to upload files to the chat-media bucket
CREATE POLICY "Staff upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow authenticated users to delete files from the chat-media bucket if needed
CREATE POLICY "Staff delete chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media');
