-- Add import_id column to listings table to track which import created each listing
ALTER TABLE public.listings 
ADD COLUMN import_id UUID REFERENCES public.imports(id);

-- Create index for better performance
CREATE INDEX idx_listings_import_id ON public.listings(import_id);