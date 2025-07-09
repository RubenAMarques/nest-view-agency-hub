import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agencies:', error);
        return;
      }

      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agencies')
        .insert([{ name: agencyName.trim() }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: error.message.includes('unique') 
            ? 'Já existe uma agência com este nome' 
            : error.message,
          variant: "destructive",
        });
        return;
      }

      setAgencies(prev => [data, ...prev]);
      setAgencyName('');
      toast({
        title: "Sucesso",
        description: "Agência criada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a agência",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: "Erro ao sair",
          description: `Falha no logout: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
      navigate('/auth', { replace: true });
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Ocorreu um erro inesperado ao fazer logout",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Nest View
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard Administrativo
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email} • {profile?.agency?.name}
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Create Agency Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
            <CardHeader>
              <CardTitle>Criar Nova Agência</CardTitle>
              <CardDescription>
                Adicione uma nova agência ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAgency} className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="agencyName" className="sr-only">
                    Nome da Agência
                  </Label>
                  <Input
                    id="agencyName"
                    placeholder="Nome da Agência"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button type="submit" disabled={isLoading} variant="elegant">
                  {isLoading ? 'Criando...' : 'Adicionar Agência'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Agencies List */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
            <CardHeader>
              <CardTitle>Agências Existentes</CardTitle>
              <CardDescription>
                Lista de todas as agências no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agencies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma agência encontrada
                  </p>
                ) : (
                  agencies.map((agency) => (
                    <div
                      key={agency.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30"
                    >
                      <div>
                        <h3 className="font-medium">{agency.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Criada em {new Date(agency.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}