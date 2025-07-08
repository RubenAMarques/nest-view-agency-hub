import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Listing {
  id: string;
  title: string | null;
  city: string | null;
  price: number | null;
  living_area: number | null;
  rooms: number | null;
  images: string[] | null;
  created_at: string;
  import_id: string | null;
  has_bad_photos: boolean;
  has_bad_description: boolean;
  is_duplicate: boolean;
}

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchListings = async () => {
    if (!profile?.agency_id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,city,price,living_area,rooms,images,created_at,import_id')
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        toast({
          title: "Erro ao carregar anúncios",
          description: "Não foi possível carregar a lista de anúncios.",
          variant: "destructive",
        });
        return;
      }

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Erro ao carregar anúncios",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [profile?.agency_id]);

  return {
    listings,
    isLoading,
    fetchListings
  };
}