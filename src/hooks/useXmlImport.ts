import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseOpenImmoXml } from '@/utils/xmlParser';
import { ImportRecord } from '@/types/import';

// Utility function to chunk arrays
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

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

    // Validate XML file before processing
    const isValid = await validateXmlFile(selectedFile);
    if (!isValid) {
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
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          throw new Error('Não autenticado');
        }

        console.log('Tentando usar Edge Function para importação...');
        
        const response = await fetch(
          'https://eytqmdssekkdlnoqzrzb.functions.supabase.co/xml-import-handler',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json',
              'x-supabase-auth': `Bearer ${session.session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              xmlContent: fileText,
              fileName: selectedFile.name,
              listings: listings
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro na Edge Function');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erro desconhecido');
        }

        setUploadProgress(100);

        toast({
          title: "Sucesso",
          description: `Importação concluída com sucesso! ${listings.length} anúncios importados.`,
        });

        setSelectedFile(null);
        await fetchImports();
        return true;

      } catch (edgeFunctionError: any) {
        console.warn('Edge Function failed, falling back to direct method:', edgeFunctionError);
        
        // Check if it's a CORS error specifically
        if (edgeFunctionError.message?.includes('CORS') || 
            edgeFunctionError.message?.includes('fetch') ||
            edgeFunctionError.message?.includes('Failed to fetch')) {
          console.log('Detectado erro CORS, tentando método direto...');
        }
        
        // Fallback to direct method with batch processing
        let importRecord: any = null;
        
        try {
          // Create import record with retry
          const { data: importData, error: importError } = await retryWithDelay(async () => {
            return await supabase
              .from('imports')
              .insert({
                agency_id: profile.agency_id,
                file_name: selectedFile.name,
                num_listings: listings.length,
                listings_inserted: 0,
                status: 'processing'
              })
              .select()
              .single();
          });

          if (importError) throw importError;
          importRecord = importData;
          setUploadProgress(70);

          // Prepare listings with agency_id and import_id
          const listingsWithAgency = listings.map(listing => ({
            ...listing,
            agency_id: profile.agency_id,
            import_id: importRecord.id
          }));

          // Process in batches of 5 listings
          const chunks = chunk(listingsWithAgency, 5);
          let totalInserted = 0;

          for (const [index, chunk] of chunks.entries()) {
            try {
              const { error: chunkError } = await retryWithDelay(async () => {
                return await supabase.from('listings').insert(chunk);
              });

              if (chunkError) {
                // Mark import as failed and cleanup
                await supabase
                  .from('imports')
                  .update({ 
                    status: 'failed',
                    error_message: `Falha no lote ${index + 1}: ${chunkError.message}`,
                    listings_inserted: totalInserted
                  })
                  .eq('id', importRecord.id);
                
                throw new Error(`Falha no lote ${index + 1}: ${chunkError.message}`);
              }

              totalInserted += chunk.length;
              
              // Update progress in database
              await supabase
                .from('imports')
                .update({ listings_inserted: totalInserted })
                .eq('id', importRecord.id);

              // Update UI progress
              const progressPercent = 70 + (index + 1) / chunks.length * 20;
              setUploadProgress(progressPercent);

            } catch (batchError) {
              // Cleanup any partially inserted listings
              await supabase
                .from('listings')
                .delete()
                .eq('import_id', importRecord.id);
              
              throw batchError;
            }
          }

          // Update import status to completed
          const { error: updateError } = await retryWithDelay(async () => {
            return await supabase
              .from('imports')
              .update({ 
                status: 'completed',
                listings_inserted: totalInserted
              })
              .eq('id', importRecord.id);
          });

          if (updateError) {
            console.error('Failed to update import status:', updateError);
            // Don't throw here as the listings were successfully inserted
          }

          setUploadProgress(100);

          toast({
            title: "Sucesso",
            description: `Importação concluída com sucesso! ${totalInserted} anúncios importados.`,
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