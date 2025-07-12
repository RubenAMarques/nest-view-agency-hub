import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property, QualityAnalysis } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, MapPin, Calendar, Home, Car, CheckCircle, XCircle, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<QualityAnalysis | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do imóvel é obrigatório');
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Property;
    },
    enabled: !!id
  });

  const analyzeProperty = async () => {
    if (!property) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-property', {
        body: { id: property.id }
      });
      
      if (error) throw error;
      
      setAnalysisResult(data);
      await queryClient.invalidateQueries({ queryKey: ['property', id] });
      
      toast({
        title: "Análise concluída",
        description: `Pontuação: ${data.score}/100`,
      });
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar o imóvel. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar detalhes do imóvel...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Imóvel não encontrado</h2>
          <Button onClick={() => navigate('/properties')}>
            Voltar à lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/properties')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à lista
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">{property.title}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {property.street && `${property.street}, `}{property.city}, {property.country}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Galeria de Imagens */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Galeria de Imagens</CardTitle>
              </CardHeader>
              <CardContent>
                {property.img_urls && property.img_urls.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.img_urls.map((url, index) => (
                      <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`Imagem ${index + 1} do imóvel`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Imagem+não+disponível';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma imagem disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dados Básicos */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Básicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{formatPrice(property.price)}</div>
                    <div className="text-sm text-muted-foreground">Preço</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                      <Calendar className="h-5 w-5" />
                      {property.year_built || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Ano</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{property.area_util || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Área (m²)</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                      <Home className="h-5 w-5" />
                      {property.rooms || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Quartos</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="secondary" className="capitalize">{property.property_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código Postal:</span>
                    <span className="font-medium">{property.zipcode || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Análise de Qualidade */}
            <Card>
              <CardHeader>
                <CardTitle>Análise de Qualidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.score ? (
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <Progress 
                        value={property.score} 
                        className="w-full h-full transform rotate-90"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{property.score}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Última análise: {property.last_analyzed_at ? new Date(property.last_analyzed_at).toLocaleDateString('pt-PT') : 'Nunca'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">Imóvel ainda não analisado</p>
                  </div>
                )}

                <Button
                  onClick={analyzeProperty}
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Executar Análise de Qualidade
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resultados da Análise */}
        {analysisResult && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Resultados da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.criteria.map((criterion, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                    {criterion.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{criterion.name}</div>
                      {criterion.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <strong>Sugestão:</strong> {criterion.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Descrição */}
        {property.description && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{property.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}