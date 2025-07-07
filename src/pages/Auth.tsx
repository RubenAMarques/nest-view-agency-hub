import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  name: string;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching agencies:', error);
        return;
      }

      setAgencies(data || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message === 'Invalid login credentials' 
              ? 'Email ou palavra-passe incorretos' 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login realizado com sucesso",
            description: "Bem-vindo ao Nest View!",
          });
        }
      } else {
        if (!selectedAgency) {
          toast({
            title: "Erro",
            description: "Por favor, selecione uma agência",
            variant: "destructive",
          });
          return;
        }

        const selectedAgencyData = agencies.find(a => a.id === selectedAgency);
        const { error } = await signUp(email, password, selectedAgencyData?.name || '');
        
        if (error) {
          toast({
            title: "Erro no registo",
            description: error.message === 'User already registered' 
              ? 'Este email já está registado' 
              : error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada com sucesso",
            description: "Pode agora fazer login com as suas credenciais",
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            Nest View
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Faça login na sua conta' : 'Crie a sua conta'}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
          <CardHeader>
            <CardTitle className="text-center">
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? 'Insira as suas credenciais para aceder' 
                : 'Preencha os dados para criar uma nova conta'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecione uma agência" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                variant="elegant"
                disabled={isLoading}
              >
                {isLoading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin 
                  ? 'Não tem conta? Crie uma aqui' 
                  : 'Já tem conta? Faça login aqui'
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}