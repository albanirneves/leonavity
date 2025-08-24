-- Create RLS policies for the candidates storage bucket

-- Policy to allow admins to upload photos to candidates bucket
CREATE POLICY "Admins can upload candidate photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'candidates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy to allow admins to update/replace candidate photos
CREATE POLICY "Admins can update candidate photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'candidates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy to allow admins to delete candidate photos
CREATE POLICY "Admins can delete candidate photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'candidates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy to allow everyone to view candidate photos (since bucket is public)
CREATE POLICY "Anyone can view candidate photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'candidates');