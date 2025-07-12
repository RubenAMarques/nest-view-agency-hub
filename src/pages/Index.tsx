import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Building2, BarChart3, Search, TrendingUp } from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            PropertyQuality
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Plataforma de análise de qualidade de imóveis com inteligência artificial
          </p>
        </div>

        {user ? (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Bem-vindo de volta!
              </h2>
              <p className="text-muted-foreground">
                Escolha uma das opções abaixo para continuar
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer border-border" onClick={() => navigate('/properties')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Lista de Imóveis
                  </CardTitle>
                  <CardDescription>
                    Veja e analise todos os seus imóveis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Acesse a lista completa com filtros e análise de qualidade
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-shadow cursor-pointer border-border" onClick={() => navigate('/dashboard')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dashboard
                  </CardTitle>
                  <CardDescription>
                    Métricas e estatísticas de qualidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Visão geral da qualidade dos imóveis e áreas a melhorar
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-shadow border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Análise Inteligente
                  </CardTitle>
                  <CardDescription>
                    IA para avaliação de qualidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Análise automática de fotos, descrições e dados
                  </p>
                  <Button className="w-full" onClick={() => navigate('/properties')}>
                    Começar Análise
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className="shadow-elegant border-border">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Bem-vindo ao PropertyQuality</CardTitle>
                <CardDescription>
                  Entre na sua conta para começar a analisar os seus imóveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full mb-4" 
                  onClick={() => navigate('/auth')}
                >
                  Entrar
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Ainda não tem conta? Registe-se na página de autenticação
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


