import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ImportRecord } from '@/types/import';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ImportCardProps {
  importRecord: ImportRecord;
  onImportDeleted?: () => void;
}

export function ImportCard({ importRecord, onImportDeleted }: ImportCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    navigate(`/importacoes/${importRecord.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      // First delete all associated listings
      const { error: listingsError } = await supabase
        .from('listings')
        .delete()
        .eq('import_id', importRecord.id);

      if (listingsError) {
        console.error('Error deleting listings:', listingsError);
        throw new Error('Erro ao eliminar anúncios associados');
      }

      // Then delete the import record
      const { error: importError } = await supabase
        .from('imports')
        .delete()
        .eq('id', importRecord.id);

      if (importError) {
        console.error('Error deleting import:', importError);
        throw importError;
      }

      toast({
        title: "Importação eliminada",
        description: "A importação foi eliminada com sucesso.",
      });

      onImportDeleted?.();
    } catch (error: any) {
      console.error('Error deleting import:', error);
      toast({
        title: "Erro ao eliminar",
        description: error.message || "Ocorreu um erro ao eliminar a importação.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
          <div className="text-sm font-semibold text-foreground">
            {importRecord.num_listings} anúncio{importRecord.num_listings !== 1 ? 's' : ''}
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              disabled={isDeleting}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar importação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que pretende eliminar esta importação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? 'A eliminar...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
    </Card>
  );
}