import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent mb-4">
            Nest View
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma de gestão imobiliária para agências modernas
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
            <CardHeader>
              <CardTitle>Para Agências</CardTitle>
              <CardDescription>
                Gerir propriedades, clientes e vendas numa plataforma integrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Gestão de propriedades</li>
                <li>• Base de dados de clientes</li>
                <li>• Relatórios de vendas</li>
                <li>• Dashboard analítico</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
            <CardHeader>
              <CardTitle>Para Administradores</CardTitle>
              <CardDescription>
                Controle total sobre agências e utilizadores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Gestão de agências</li>
                <li>• Controle de utilizadores</li>
                <li>• Configurações globais</li>
                <li>• Relatórios administrativos</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-x-4">
          <Button 
            onClick={() => navigate('/auth')}
            variant="elegant"
            size="lg"
          >
            Entrar na Plataforma
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
