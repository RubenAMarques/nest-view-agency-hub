-- Create Agency table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Create policy for agencies - everyone can read, only admin can insert/update/delete
CREATE POLICY "Everyone can view agencies" 
ON public.agencies 
FOR SELECT 
USING (true);

-- Create profiles table for additional user information linked to agencies
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin policies for profiles (admin can view all profiles)
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.user_id = auth.uid() AND a.name = 'Administrador'
  )
);

-- Admin policies for agencies (admin can insert/update/delete agencies)
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for agencies
INSERT INTO public.agencies (name) VALUES 
('Administrador'),
('NestView');

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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();