import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ImportRecord } from '@/types/import';

interface ImportCardProps {
  importRecord: ImportRecord;
}

export function ImportCard({ importRecord }: ImportCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/importacoes/${importRecord.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Ver detalhes da importação ${importRecord.file_name}`}
      className="
        group relative flex items-center justify-between gap-4
        p-4 mt-2 rounded-lg border border-border/40
        transition-all duration-150 cursor-pointer
        hover:bg-primary/10 hover:border-primary/50 hover:shadow-md hover:shadow-primary/20
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
      "
    >
      {/* Informação à esquerda */}
      <div>
        <p className="font-medium">{importRecord.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(importRecord.import_date), 'dd/MM/yyyy, HH:mm')}
        </p>
      </div>

      {/* Informação à direita */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-primary-foreground">
            {importRecord.num_listings} anúncio{importRecord.num_listings !== 1 ? 's' : ''}
          </div>
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
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
    </Card>
  );
}