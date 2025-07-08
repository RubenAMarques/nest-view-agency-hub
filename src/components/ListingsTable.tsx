import React from 'react';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useListings, type Listing } from '@/hooks/useListings';
import { useNavigate } from 'react-router-dom';

export default function ListingsTable() {
  const { listings, isLoading } = useListings();
  const navigate = useNavigate();

  const formatPrice = (price: number | null) => {
    if (!price) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area: number | null) => {
    if (!area) return '—';
    return `${area} m²`;
  };

  const formatRooms = (rooms: number | null) => {
    if (!rooms) return '—';
    return rooms.toString();
  };

  const formatImageCount = (images: string[] | null) => {
    if (!images || images.length === 0) return '0';
    return images.length.toString();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd-MM-yyyy');
  };

  const handleViewImport = (listing: Listing) => {
    if (listing.import_id) {
      navigate(`/importacoes/${listing.import_id}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
        <CardHeader>
          <CardTitle>Anúncios da Agência</CardTitle>
          <CardDescription>
            Lista de propriedades da sua agência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">A carregar…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
        <CardHeader>
          <CardTitle>Anúncios da Agência</CardTitle>
          <CardDescription>
            Lista de propriedades da sua agência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Sem anúncios importados ainda.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
      <CardHeader>
        <CardTitle>Anúncios da Agência</CardTitle>
        <CardDescription>
          {listings.length} propriedade{listings.length !== 1 ? 's' : ''} encontrada{listings.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Preço €</TableHead>
              <TableHead>Área (m²)</TableHead>
              <TableHead>Quartos</TableHead>
              <TableHead>Fotos</TableHead>
              <TableHead>Importado em</TableHead>
              <TableHead></TableHead>
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
                <TableCell>{formatArea(listing.living_area)}</TableCell>
                <TableCell>{formatRooms(listing.rooms)}</TableCell>
                <TableCell>{formatImageCount(listing.images)}</TableCell>
                <TableCell>{formatDate(listing.created_at)}</TableCell>
                <TableCell>
                  {listing.import_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewImport(listing)}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}