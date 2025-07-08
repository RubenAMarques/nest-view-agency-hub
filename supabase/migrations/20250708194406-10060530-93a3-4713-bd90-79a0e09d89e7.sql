-- Clean up problematic import data
-- Update the stuck import to failed status
UPDATE public.imports 
SET status = 'failed',
    error_message = 'Import processo interrompido - dados inconsistentes limpos automaticamente'
WHERE id = '9de4742b-5778-4ad9-b4d6-cc03679af76f'
AND status = 'processing';

-- Clean up any orphaned listings without import_id for this agency
-- (This should not affect existing good data)
DELETE FROM public.listings 
WHERE import_id IS NULL 
AND agency_id = '378bc30e-10bd-4177-b866-fddda3a12371'
AND created_at > '2025-07-08 19:30:00'::timestamp;