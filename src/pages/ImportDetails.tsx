import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ImportRecord {
  id: string;
  import_date: string;
  file_name: string | null;
  num_listings: number;
  status: string;
  error_message: string | null;
}

interface ListingSummary {
  id: string;
  title: string | null;
  city: string | null;
  price: number | null;
  images: string[] | null;
  has_bad_photos: boolean;
  has_bad_description: boolean;
  is_duplicate: boolean;
}

type FilterType = 'bad_photos' | 'bad_description' | 'duplicate' | null;

export default function ImportDetails() {
  const { importId } = useParams<{ importId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [importRecord, setImportRecord] = useState<ImportRecord | null>(null);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  useEffect(() => {
    if (!importId || !profile?.agency_id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch import record
        const { data: importData, error: importError } = await supabase
          .from('imports')
          .select('*')
          .eq('id', importId)
          .eq('agency_id', profile.agency_id)
          .single();

        if (importError) {
          console.error('Error fetching import:', importError);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os detalhes da importação.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setImportRecord(importData);

        // Fetch listings for this import
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id,title,city,price,images,has_bad_photos,has_bad_description,is_duplicate')
          .eq('import_id', importId);

        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os anúncios da importação.",
            variant: "destructive",
          });
        } else {
          const listingsWithDefaults = (listingsData || []).map(listing => ({
            ...listing,
            has_bad_photos: listing.has_bad_photos || false,
            has_bad_description: listing.has_bad_description || false,
            is_duplicate: listing.is_duplicate || false,
          }));
          setListings(listingsWithDefaults);
          setFilteredListings(listingsWithDefaults);
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [importId, profile?.agency_id, navigate, toast]);

  // Filter listings based on search term and active filter
  useEffect(() => {
    let filtered = listings;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        (listing.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (listing.city?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply problem filter
    if (activeFilter === 'bad_photos') {
      filtered = filtered.filter(listing => listing.has_bad_photos);
    } else if (activeFilter === 'bad_description') {
      filtered = filtered.filter(listing => listing.has_bad_description);
    } else if (activeFilter === 'duplicate') {
      filtered = filtered.filter(listing => listing.is_duplicate);
    }

    setFilteredListings(filtered);
  }, [listings, searchTerm, activeFilter]);

  const handleFilterClick = (filterType: FilterType) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
  };

  const clearFilters = () => {
    setActiveFilter(null);
    setSearchTerm('');
  };

  const getFilterCounts = () => {
    return {
      badPhotos: listings.filter(l => l.has_bad_photos).length,
      badDescription: listings.filter(l => l.has_bad_description).length,
      duplicate: listings.filter(l => l.is_duplicate).length,
    };
  };

  const filterCounts = getFilterCounts();

  const formatPrice = (price: number | null) => {
    if (!price) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatImageCount = (images: string[] | null) => {
    if (!images || images.length === 0) return '0';
    return images.length.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Detalhes da Importação
            </h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">A carregar…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!importRecord) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Importação não encontrada
            </h1>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Detalhes da Importação
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Import Details */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
          <CardHeader>
            <CardTitle>Detalhes da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>ID:</strong> {importRecord.id}</div>
            <div><strong>Data:</strong> {format(new Date(importRecord.import_date), 'dd/MM/yyyy HH:mm')}</div>
            <div><strong>Ficheiro:</strong> {importRecord.file_name || '—'}</div>
            <div><strong>Anúncios importados:</strong> {importRecord.num_listings}</div>
            <div><strong>Estado:</strong> {importRecord.status}</div>
            {importRecord.error_message && (
              <div><strong>Erro:</strong> <span className="text-destructive">{importRecord.error_message}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Listings List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🗄 Lista de Anúncios
            </CardTitle>
            <CardDescription>
              {filteredListings.length} de {listings.length} anúncio{listings.length !== 1 ? 's' : ''} 
              {activeFilter && ' (filtrado)'}
            </CardDescription>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por título ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {(activeFilter || searchTerm) && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Filtro activo
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredListings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {listings.length === 0 
                    ? "Nenhum anúncio encontrado para esta importação." 
                    : "Nenhum anúncio corresponde aos filtros aplicados."
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Fotos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">
                        {listing.title || '—'}
                      </TableCell>
                      <TableCell>{listing.city || '—'}</TableCell>
                      <TableCell>{formatPrice(listing.price)}</TableCell>
                      <TableCell>{formatImageCount(listing.images)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
          <CardHeader>
            <CardTitle>Análise de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button disabled className="w-full" title="Em breve">
              Correr Análise
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bad Photos Card */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeFilter === 'bad_photos' ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleFilterClick('bad_photos')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-destructive mb-1">
                    {filterCounts.badPhotos}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fotos em falta / baixa qualidade
                  </div>
                </CardContent>
              </Card>

              {/* Bad Description Card */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeFilter === 'bad_description' ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleFilterClick('bad_description')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500 mb-1">
                    {filterCounts.badDescription}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Descrições insuficientes
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Card */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeFilter === 'duplicate' ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleFilterClick('duplicate')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {filterCounts.duplicate}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Anúncios duplicados
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}