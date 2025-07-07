-- Create listings table for property data
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  street TEXT,
  city TEXT,
  zipcode TEXT,
  country TEXT,
  price DECIMAL(12,2),
  property_type TEXT,
  offer_type TEXT, -- 'sale' or 'rent'
  living_area DECIMAL(8,2), -- in square meters
  rooms INTEGER,
  images TEXT[], -- array of image URLs/paths
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  xml_data JSONB, -- store original XML data for unmapped fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create imports table for tracking XML uploads
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  import_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT,
  num_listings INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed', -- 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings table
CREATE POLICY "Users can view listings from their agency" 
ON public.listings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = listings.agency_id
  )
);

CREATE POLICY "Admin can view all listings" 
ON public.listings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE p.user_id = auth.uid() 
    AND a.name = 'Administrador'
  )
);

CREATE POLICY "Users can create listings for their agency" 
ON public.listings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = listings.agency_id
  )
);

CREATE POLICY "Users can update listings from their agency" 
ON public.listings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = listings.agency_id
  )
);

CREATE POLICY "Users can delete listings from their agency" 
ON public.listings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = listings.agency_id
  )
);

-- RLS Policies for imports table
CREATE POLICY "Users can view imports from their agency" 
ON public.imports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = imports.agency_id
  )
);

CREATE POLICY "Admin can view all imports" 
ON public.imports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE p.user_id = auth.uid() 
    AND a.name = 'Administrador'
  )
);

CREATE POLICY "Users can create imports for their agency" 
ON public.imports 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = imports.agency_id
  )
);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_imports_updated_at
BEFORE UPDATE ON public.imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();