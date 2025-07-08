import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, checkConnection } from '@/integrations/supabase/client';
import { parseOpenImmoXml } from '@/utils/xmlParser';
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

  const validateXmlFile = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      if (text.length === 0) {
        throw new Error('Ficheiro XML vazio');
      }
      
      // Basic XML validation
      if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<')) {
        throw new Error('Ficheiro não é um XML válido');
      }
      
      // Try to parse to catch any XML errors early
      parseOpenImmoXml(text);
      return true;
    } catch (error: any) {
      toast({
        title: "Ficheiro Inválido",
        description: error.message || "Ficheiro XML não é válido",
        variant: "destructive",
      });
      return false;
    }
  };

  const retryWithDelay = async (fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`Retry attempt, ${retries} remaining...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithDelay(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  const cleanupFailedImport = async (importId: string) => {
    try {
      // Remove any listings that might have been partially inserted
      await supabase
        .from('listings')
        .delete()
        .eq('import_id', importId);
      
      // Mark import as failed
      await supabase
        .from('imports')
        .update({ 
          status: 'failed',
          error_message: 'Importação limpa devido a erro crítico'
        })
        .eq('id', importId);
    } catch (cleanupError) {
      console.error('Failed to cleanup import:', cleanupError);
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

    // Check connection before starting
    const isConnected = await checkConnection();
    if (!isConnected) {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor. Verifique a sua conexão à internet e tente novamente.",
        variant: "destructive",
      });
      return false;
    }

    // Validate XML file before processing
    const isValid = await validateXmlFile(selectedFile);
    if (!isValid) {
      return false;
    }

    setIsUploading(true);
    setUploadProgress(10);
    let importRecord: any = null;
    
    try {
      const fileText = await selectedFile.text();
      setUploadProgress(20);
      
      const listings = parseOpenImmoXml(fileText);
      setUploadProgress(40);

      if (listings.length === 0) {
        throw new Error('Nenhum anúncio encontrado no ficheiro XML');
      }

      // Create import record with retry
      const { data: importData, error: importError } = await retryWithDelay(async () => {
        return await supabase
          .from('imports')
          .insert({
            agency_id: profile.agency_id,
            file_name: selectedFile.name,
            num_listings: listings.length,
            status: 'processing'
          })
          .select()
          .single();
      });

      if (importError) throw importError;
      importRecord = importData;
      setUploadProgress(60);

      // Insert listings with import_id and retry
      const listingsWithAgency = listings.map(listing => ({
        ...listing,
        agency_id: profile.agency_id,
        import_id: importRecord.id
      }));

      const { error: listingsError } = await retryWithDelay(async () => {
        return await supabase
          .from('listings')
          .insert(listingsWithAgency);
      });

      if (listingsError) {
        await cleanupFailedImport(importRecord.id);
        throw listingsError;
      }

      setUploadProgress(80);

      // Update import status to completed with retry
      const { error: updateError } = await retryWithDelay(async () => {
        return await supabase
          .from('imports')
          .update({ status: 'completed' })
          .eq('id', importRecord.id);
      });

      if (updateError) {
        console.error('Failed to update import status:', updateError);
        // Don't throw here as the listings were successfully inserted
      }

      setUploadProgress(100);

      toast({
        title: "Sucesso",
        description: `Importação concluída com sucesso! ${listings.length} anúncios importados.`,
      });

      setSelectedFile(null);
      await fetchImports(); // Refresh the imports list
      return true;

    } catch (error: any) {
      console.error('Import error:', error);
      
      // Cleanup failed import if we have an import record
      if (importRecord?.id) {
        await cleanupFailedImport(importRecord.id);
      }
      
      const errorMessage = error.message?.includes('fetch') || error.message?.includes('Failed to fetch')
        ? 'Erro de conectividade. Verifique a configuração CORS no Supabase e tente novamente.'
        : error.message || 'Erro ao processar o ficheiro XML.';
      
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