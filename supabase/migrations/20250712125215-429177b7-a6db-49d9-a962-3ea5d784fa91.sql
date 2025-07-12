-- Reset completo - remover todas as tabelas existentes
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.imports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;

-- Criar nova tabela properties para análise de qualidade
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL, -- apartamento, moradia, terreno
  offer_type TEXT NOT NULL DEFAULT 'KAUF', -- KAUF, MIETE
  price DECIMAL(12,2),
  rooms INTEGER,
  area_util DECIMAL(8,2), -- m²
  year_built INTEGER,
  
  -- Localização
  street TEXT,
  city TEXT,
  zipcode TEXT,
  country TEXT DEFAULT 'PRT',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Imagens e análise
  img_urls TEXT[], -- array de URLs das imagens
  score INTEGER, -- 0-100
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Critérios de qualidade
  has_bad_photos BOOLEAN DEFAULT false,
  has_bad_description BOOLEAN DEFAULT false,
  is_duplicate BOOLEAN DEFAULT false,
  has_insufficient_location BOOLEAN DEFAULT false,
  has_missing_data BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" 
ON public.properties 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de demonstração
INSERT INTO public.properties (
  user_id, title, description, property_type, offer_type, price, rooms, area_util, year_built,
  street, city, zipcode, country, latitude, longitude, img_urls
) VALUES 
(
  '00000000-0000-0000-0000-000000000000', -- placeholder user_id
  'Apartamento T3 com vista para o rio',
  'Excelente apartamento T3 no coração de Lisboa, completamente remodelado com materiais de alta qualidade. Dispõe de três quartos espaçosos, dois wcs completos, sala de estar e jantar em open space com cozinha totalmente equipada. Todas as divisões têm muita luz natural e vista desafogada. Inclui lugar de garagem e arrecadação. Localizado numa zona premium com fácil acesso a transportes públicos, escolas e comércio. Prédio com elevador e em excelente estado de conservação.',
  'apartamento', 'KAUF', 350000.00, 3, 95.0, 1995,
  'Rua dos Prazeres, 45', 'Lisboa', '1250-012', 'PRT', 38.711046, -9.160127,
  ARRAY[
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&h=800&fit=crop'
  ]
),
(
  '00000000-0000-0000-0000-000000000000',
  'Moradia T4 com jardim',
  'Moradia isolada T4 numa zona residencial tranquila. Com jardim amplo e garagem para dois carros.',
  'moradia', 'KAUF', 420000.00, 4, 120.0, 2005,
  'Rua do Progresso, 10', 'Amadora', '2700-453', 'PRT', 38.751973, -9.230986,
  ARRAY[
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=800&fit=crop'
  ]
),
(
  '00000000-0000-0000-0000-000000000000',
  'Maisonette no centro do Porto',
  'Maisonette moderna com design contemporâneo.',
  'apartamento', 'KAUF', 310000.00, 3, 78.5, 1980,
  'Rua das Flores, 99', 'Porto', '4000-123', 'PRT', 41.149608, -8.610993,
  ARRAY[
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop'
  ]
),
(
  '00000000-0000-0000-0000-000000000000',
  'Terreno urbano em Castelo Branco',
  'Terreno plano com vista ampla e boa acessibilidade para construção.',
  'terreno', 'KAUF', 150000.00, 0, 0.0, NULL,
  'Rua do Terreiro, s/n', 'Castelo Branco', '8600-315', 'PRT', 39.823629, -7.490840,
  ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=800&fit=crop']
),
(
  '00000000-0000-0000-0000-000000000000',
  'Moradia T4 junto ao centro de Braga',
  'Moradia moderna com jardim e garagem privada, acabamentos de qualidade superior.',
  'moradia', 'KAUF', 285000.00, 4, 110.75, 2010,
  'Avenida Central, 20', 'Braga', '3700-234', 'PRT', 41.550319, -8.420050,
  ARRAY[
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&h=800&fit=crop'
  ]
);