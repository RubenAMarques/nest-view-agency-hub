import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import XmlImport from '@/components/XmlImport';
import ListingsTable from '@/components/ListingsTable';

export default function AgencyDashboard() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Nest View
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard da Agência
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email} • {profile?.agency?.name}
            </span>
            <Button onClick={signOut} variant="outline" size="sm">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
            <CardHeader>
              <CardTitle>Bem-vindo à {profile?.agency?.name}</CardTitle>
              <CardDescription>
                Dashboard da sua agência imobiliária
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm">
                  <strong>Agência:</strong> {profile?.agency?.name}<br />
                  <strong>Email:</strong> {user?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="import" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import">Importar XML</TabsTrigger>
              <TabsTrigger value="listings">Anúncios</TabsTrigger>
            </TabsList>
            
            <TabsContent value="import" className="space-y-4">
              <XmlImport />
            </TabsContent>
            
            <TabsContent value="listings" className="space-y-4">
              <ListingsTable />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}