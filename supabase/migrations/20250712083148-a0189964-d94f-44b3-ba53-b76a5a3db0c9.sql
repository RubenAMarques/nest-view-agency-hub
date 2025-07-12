-- Add listings_inserted field to imports table for progress tracking
ALTER TABLE public.imports 
ADD COLUMN listings_inserted integer DEFAULT 0;