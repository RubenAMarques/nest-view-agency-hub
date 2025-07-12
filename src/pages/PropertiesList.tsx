import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Home, Building2, MapPin } from 'lucide-react';

export default function PropertiesList() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Property[];
    }
  });

  const filteredProperties = properties.filter(property => {
    const matchesType = typeFilter === 'all' || property.property_type === typeFilter;
    const matchesPrice = priceFilter === 'all' || 
      (priceFilter === 'low' && (property.price || 0) < 250000) ||
      (priceFilter === 'medium' && (property.price || 0) >= 250000 && (property.price || 0) < 400000) ||
      (priceFilter === 'high' && (property.price || 0) >= 400000);
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) || '';
    
    return matchesType && matchesPrice && matchesSearch;
  });

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'apartamento': return <Building2 className="h-4 w-4" />;
      case 'moradia': return <Home className="h-4 w-4" />;
      case 'terreno': return <MapPin className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return <Badge variant="secondary">Não analisado</Badge>;
    if (score >= 75) return <Badge className="bg-green-600">Excelente ({score})</Badge>;
    if (score >= 50) return <Badge variant="secondary">Bom ({score})</Badge>;
    return <Badge variant="destructive">Precisa melhorar ({score})</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar imóveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lista de Imóveis</h1>
          <p className="text-muted-foreground">Gerir e analisar a qualidade dos seus imóveis</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Procurar imóveis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="moradia">Moradia</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Faixa de preço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os preços</SelectItem>
                  <SelectItem value="low">Até 250.000€</SelectItem>
                  <SelectItem value="medium">250.000€ - 400.000€</SelectItem>
                  <SelectItem value="high">Acima de 400.000€</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Ver Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Imóveis */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Quartos</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((property) => (
                  <TableRow key={property.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getPropertyIcon(property.property_type)}
                        <div>
                          <div className="font-semibold">{property.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {property.city && `${property.city}, ${property.country}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{property.property_type}</TableCell>
                    <TableCell className="font-semibold">{formatPrice(property.price)}</TableCell>
                    <TableCell>{property.rooms || 'N/A'}</TableCell>
                    <TableCell>{property.area_util ? `${property.area_util} m²` : 'N/A'}</TableCell>
                    <TableCell>{getScoreBadge(property.score)}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => navigate(`/properties/${property.id}`)}
                        size="sm"
                        className="w-full"
                      >
                        Analisar Qualidade
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum imóvel encontrado com os filtros aplicados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}