export interface Property {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  property_type: 'apartamento' | 'moradia' | 'terreno';
  offer_type: 'KAUF' | 'MIETE';
  price?: number;
  rooms?: number;
  area_util?: number;
  year_built?: number;
  
  // Localização
  street?: string;
  city?: string;
  zipcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  
  // Imagens e análise
  img_urls?: string[];
  score?: number;
  last_analyzed_at?: string;
  
  // Critérios de qualidade
  has_bad_photos?: boolean;
  has_bad_description?: boolean;
  is_duplicate?: boolean;
  has_insufficient_location?: boolean;
  has_missing_data?: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface QualityCriteria {
  name: string;
  passed: boolean;
  suggestion?: string;
}

export interface QualityAnalysis {
  score: number;
  criteria: QualityCriteria[];
}