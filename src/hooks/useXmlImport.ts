import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseOpenImmoXml } from '@/utils/xmlParser';
import { validateXmlFile } from '@/utils/xmlValidation';
import { 
  createImportRecord, 
  processBatchImport, 
  cleanupFailedImport,
  tryEdgeFunctionImport 
} from '@/services/importService';
import { ImportRecord } from '@/types/import';

export function useXmlImport() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchImports = async () => {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('import_date', { ascending: false });

      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error('Error fetching imports:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Erro",
          description: "Por favor selecione um ficheiro XML válido.",
          variant: "destructive",
        });
        event.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Erro",
        description: "Por favor selecione um ficheiro XML.",
        variant: "destructive",
      });
      return false;
    }

    if (!profile?.agency_id) {
      toast({
        title: "Erro",
        description: "Perfil não carregado. Tente refrescar a página.",
        variant: "destructive",
      });
      return false;
    }

    // Validate XML file before processing
    const validationResult = await validateXmlFile(selectedFile);
    if (!validationResult.isValid) {
      toast({
        title: "Ficheiro Inválido",
        description: validationResult.error || "Ficheiro XML não é válido",
        variant: "destructive",
      });
      return false;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const fileText = await selectedFile.text();
      setUploadProgress(20);
      
      const listings = parseOpenImmoXml(fileText);
      setUploadProgress(40);

      if (listings.length === 0) {
        throw new Error('Nenhum anúncio encontrado no ficheiro XML');
      }

      setUploadProgress(60);

      // Try using Edge Function first
      const edgeFunctionResult = await tryEdgeFunctionImport(fileText, selectedFile.name, listings);
      
      if (edgeFunctionResult.success) {
        setUploadProgress(100);
        toast({
          title: "Sucesso",
          description: `Importação concluída com sucesso! ${listings.length} anúncios importados.`,
        });
        setSelectedFile(null);
        await fetchImports();
        return true;
      }

      // Fallback to direct method with batch processing
      console.warn('Edge Function failed, falling back to direct method:', edgeFunctionResult.error);
      
      let importRecord: any = null;
      
      try {
        // Create import record
        const { data: importData, error: importError } = await createImportRecord(
          profile.agency_id,
          selectedFile.name,
          listings.length
        );

        if (importError) throw importError;
        importRecord = importData;
        setUploadProgress(70);

        // Process batch import
        const batchResult = await processBatchImport(
          listings,
          profile.agency_id,
          importRecord.id,
          setUploadProgress
        );

        if (!batchResult.success) {
          throw new Error(batchResult.error || 'Erro no processamento em lotes');
        }

        setUploadProgress(100);

        toast({
          title: "Sucesso",
          description: `Importação concluída com sucesso! ${batchResult.totalInserted} anúncios importados.`,
        });

        setSelectedFile(null);
        await fetchImports();
        return true;

      } catch (directError) {
        // Cleanup failed import if we have an import record
        if (importRecord?.id) {
          await cleanupFailedImport(importRecord.id);
        }
        throw directError;
      }

    } catch (error: any) {
      console.error('Import error:', error);
      
      const errorMessage = error.message || 'Erro ao processar o ficheiro XML.';
      
      toast({
        title: "Erro na importação",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    imports,
    selectedFile,
    isUploading,
    uploadProgress,
    fetchImports,
    handleFileSelect,
    handleImport
  };
}