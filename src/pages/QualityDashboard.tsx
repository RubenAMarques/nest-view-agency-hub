import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, Building2, AlertTriangle } from 'lucide-react';

export default function QualityDashboard() {
  const navigate = useNavigate();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, score, property_type');
      
      if (error) throw error;
      return data as Pick<Property, 'id' | 'title' | 'score' | 'property_type'>[];
    }
  });

  // Calcular estatísticas
  const analyzedProperties = properties.filter(p => p.score !== null);
  const totalProperties = properties.length;
  const totalAnalyzed = analyzedProperties.length;
  const averageScore = totalAnalyzed > 0 
    ? Math.round(analyzedProperties.reduce((sum, p) => sum + (p.score || 0), 0) / totalAnalyzed)
    : 0;

  // Dados para o gráfico
  const chartData = [
    {
      range: '0-49',
      label: 'Precisa melhorar',
      count: analyzedProperties.filter(p => (p.score || 0) < 50).length,
      color: '#dc2626'
    },
    {
      range: '50-74',
      label: 'Bom',
      count: analyzedProperties.filter(p => (p.score || 0) >= 50 && (p.score || 0) < 75).length,
      color: '#f59e0b'
    },
    {
      range: '75-100',
      label: 'Excelente',
      count: analyzedProperties.filter(p => (p.score || 0) >= 75).length,
      color: '#16a34a'
    }
  ];

  const propertiesNeedingImprovement = analyzedProperties.filter(p => (p.score || 0) < 75);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/properties')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à lista
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard de Qualidade</h1>
          <p className="text-muted-foreground">Visão geral da qualidade dos imóveis</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                {totalAnalyzed} analisados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média de Qualidade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}/100</div>
              <p className="text-xs text-muted-foreground">
                {totalAnalyzed > 0 ? 'Baseado em imóveis analisados' : 'Nenhum imóvel analisado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisam de Melhoria</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertiesNeedingImprovement.length}</div>
              <p className="text-xs text-muted-foreground">
                Score abaixo de 75
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Distribuição */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Distribuição por Faixa de Pontuação</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAnalyzed > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Faixa: ${value}`}
                    formatter={(value, name) => [value, 'Imóveis']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--foreground))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum imóvel foi analisado ainda</p>
                <Button 
                  onClick={() => navigate('/properties')}
                  className="mt-4"
                >
                  Ir para Lista de Imóveis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Imóveis que Precisam Melhorar */}
        {propertiesNeedingImprovement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Imóveis que Precisam de Melhoria
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/properties')}
                >
                  Ver todos
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {propertiesNeedingImprovement.slice(0, 5).map((property) => (
                  <div 
                    key={property.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/properties/${property.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{property.title}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {property.property_type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{property.score}/100</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                ))}
                
                {propertiesNeedingImprovement.length > 5 && (
                  <div className="text-center pt-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/properties')}
                    >
                      Ver mais {propertiesNeedingImprovement.length - 5} imóveis
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}