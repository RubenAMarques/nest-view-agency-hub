import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportRecord } from '@/types/import';
import { ImportCard } from './ImportCard';

interface ImportHistoryProps {
  imports: ImportRecord[];
  onImportDeleted?: () => void;
}

export function ImportHistory({ imports, onImportDeleted }: ImportHistoryProps) {
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
              <ImportCard 
                key={importRecord.id} 
                importRecord={importRecord} 
                onImportDeleted={onImportDeleted}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}