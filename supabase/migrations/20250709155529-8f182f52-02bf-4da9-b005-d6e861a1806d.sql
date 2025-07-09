-- Create Agency table
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user information linked to agencies
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create listings table for property data
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.imports(id),
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
  has_bad_photos boolean DEFAULT false,
  has_bad_description boolean DEFAULT false,
  is_duplicate boolean DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create imports table for tracking XML uploads
CREATE TABLE IF NOT EXISTS public.imports (
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
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_agencies_updated_at ON public.agencies;
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_listings_updated_at ON public.listings;
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_imports_updated_at ON public.imports;
CREATE TRIGGER update_imports_updated_at
BEFORE UPDATE ON public.imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_listings_import_id ON public.listings(import_id);

-- RLS Policies for agencies
DROP POLICY IF EXISTS "Everyone can view agencies" ON public.agencies;
CREATE POLICY "Everyone can view agencies" 
ON public.agencies 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admin can insert agencies" ON public.agencies;
CREATE POLICY "Admin can insert agencies"
ON public.agencies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.user_id = auth.uid() AND a.name = 'Administrador'
  )
);

DROP POLICY IF EXISTS "Admin can update agencies" ON public.agencies;
CREATE POLICY "Admin can update agencies"
ON public.agencies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.user_id = auth.uid() AND a.name = 'Administrador'
  )
);

DROP POLICY IF EXISTS "Admin can delete agencies" ON public.agencies;
CREATE POLICY "Admin can delete agencies"
ON public.agencies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.user_id = auth.uid() AND a.name = 'Administrador'
  )
);

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for listings
DROP POLICY IF EXISTS "Users can view listings from their agency" ON public.listings;
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

DROP POLICY IF EXISTS "Admin can view all listings" ON public.listings;
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

DROP POLICY IF EXISTS "Users can create listings for their agency" ON public.listings;
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

DROP POLICY IF EXISTS "Users can update listings from their agency" ON public.listings;
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

DROP POLICY IF EXISTS "Users can delete listings from their agency" ON public.listings;
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

-- RLS Policies for imports
DROP POLICY IF EXISTS "Users can view imports from their agency" ON public.imports;
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

DROP POLICY IF EXISTS "Admin can view all imports" ON public.imports;
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

DROP POLICY IF EXISTS "Users can create imports for their agency" ON public.imports;
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

DROP POLICY IF EXISTS "Users can update imports from their agency" ON public.imports;
CREATE POLICY "Users can update imports from their agency" 
ON public.imports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = imports.agency_id
  )
);

DROP POLICY IF EXISTS "Users can delete imports from their agency" ON public.imports;
CREATE POLICY "Users can delete imports from their agency" 
ON public.imports 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.agency_id = imports.agency_id
  )
);

DROP POLICY IF EXISTS "Admin can delete all imports" ON public.imports;
CREATE POLICY "Admin can delete all imports" 
ON public.imports 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE p.user_id = auth.uid() 
    AND a.name = 'Administrador'
  )
);

-- Insert seed data for agencies
INSERT INTO public.agencies (name) VALUES 
('Administrador'),
('NestView')
ON CONFLICT (name) DO NOTHING;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  agency_id_val UUID;
BEGIN
  -- Get agency_id from metadata
  SELECT id INTO agency_id_val 
  FROM public.agencies 
  WHERE name = NEW.raw_user_meta_data ->> 'agency_name';
  
  -- Insert profile with agency reference
  INSERT INTO public.profiles (user_id, agency_id)
  VALUES (NEW.id, agency_id_val);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();