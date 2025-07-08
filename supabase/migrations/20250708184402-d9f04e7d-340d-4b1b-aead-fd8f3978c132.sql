-- Fix existing data: Associate listings with their import and update import status
-- Update the listings to have the correct import_id
UPDATE public.listings 
SET import_id = '9a1dadef-cb98-4dd1-8520-18e60a065ab1'
WHERE import_id IS NULL 
AND agency_id = '378bc30e-10bd-4177-b866-fddda3a12371'
AND created_at >= '2025-07-08 09:30:00'::timestamp;

-- Update the import status from processing to completed
UPDATE public.imports 
SET status = 'completed'
WHERE id = '9a1dadef-cb98-4dd1-8520-18e60a065ab1'
AND status = 'processing';