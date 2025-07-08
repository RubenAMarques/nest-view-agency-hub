import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportRecord } from '@/types/import';

interface ImportHistoryProps {
  imports: ImportRecord[];
}

export function ImportHistory({ imports }: ImportHistoryProps) {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
      <CardHeader>
        <CardTitle>Histórico de Importações</CardTitle>
        <CardDescription>
          Lista das importações XML realizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma importação realizada ainda
          </p>
        ) : (
          <div className="space-y-2">
            {imports.map((importRecord) => (
              <div
                key={importRecord.id}
                onClick={() => navigate(`/importacoes/${importRecord.id}`)}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="font-medium">{importRecord.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(importRecord.import_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {importRecord.num_listings} anúncios
                    </p>
                    <p className={`text-xs ${
                      importRecord.status === 'completed' 
                        ? 'text-green-600' 
                        : importRecord.status === 'failed'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {importRecord.status === 'completed' && 'Concluído'}
                      {importRecord.status === 'failed' && 'Falhou'}
                      {importRecord.status === 'processing' && 'A processar'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}