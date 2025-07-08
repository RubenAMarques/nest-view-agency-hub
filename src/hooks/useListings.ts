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

const PAGE_SIZE = 50;

const getRange = (page: number, pageSize: number) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
};

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchListings = async (page: number = 0) => {
    if (!profile?.agency_id) return;

    try {
      setIsLoading(true);
      const { from, to } = getRange(page, PAGE_SIZE);
      
      const { data, error, count } = await supabase
        .from('listings')
        .select('id,title,city,price,living_area,rooms,images,created_at,import_id,has_bad_photos,has_bad_description,is_duplicate', { count: 'exact' })
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching listings:', error);
        toast({
          title: "Erro ao carregar anúncios",
          description: "Não foi possível carregar a lista de anúncios.",
          variant: "destructive",
        });
        return;
      }

      const listingsWithDefaults = (data || []).map(listing => ({
        ...listing,
        has_bad_photos: listing.has_bad_photos || false,
        has_bad_description: listing.has_bad_description || false,
        is_duplicate: listing.is_duplicate || false,
      }));
      
      setListings(listingsWithDefaults);
      setTotalCount(count || 0);
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
    totalCount,
    fetchListings
  };
}