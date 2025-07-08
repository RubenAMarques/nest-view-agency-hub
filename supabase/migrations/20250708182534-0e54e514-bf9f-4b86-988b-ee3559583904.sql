-- Add analysis columns to listings table
ALTER TABLE public.listings 
ADD COLUMN has_bad_photos boolean DEFAULT false,
ADD COLUMN has_bad_description boolean DEFAULT false,
ADD COLUMN is_duplicate boolean DEFAULT false;