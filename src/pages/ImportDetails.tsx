import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
}

export default function ImportDetails() {
  const { importId } = useParams<{ importId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [importRecord, setImportRecord] = useState<ImportRecord | null>(null);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          .select('id,title,city,price,images')
          .eq('import_id', importId);

        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os anúncios da importação.",
            variant: "destructive",
          });
        } else {
          setListings(listingsData || []);
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
            <CardTitle>Lista rápida</CardTitle>
            <CardDescription>
              {listings.length} anúncio{listings.length !== 1 ? 's' : ''} nesta importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum anúncio encontrado para esta importação.</p>
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
                  {listings.map((listing) => (
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
          <CardContent className="space-y-4">
            <Button disabled className="w-full" title="Em breve">
              Analisar Dados
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>Anúncios duplicados: 0</div>
              <div>Fotografias de baixa qualidade: 0</div>
              <div>Problemas de geolocalização: 0</div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}