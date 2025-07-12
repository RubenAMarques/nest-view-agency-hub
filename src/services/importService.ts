import { supabase } from '@/integrations/supabase/client';
import { chunk } from '@/utils/arrayUtils';
import { retryWithDelay } from '@/utils/retryUtils';
import { ParsedListing } from '@/types/import';

export interface ImportProgressCallback {
  (progress: number): void;
}

export interface BatchImportResult {
  success: boolean;
  importId?: string;
  totalInserted: number;
  error?: string;
}

export const cleanupFailedImport = async (importId: string) => {
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

export const createImportRecord = async (
  agencyId: string,
  fileName: string,
  numListings: number
) => {
  return await retryWithDelay(async () => {
    return await supabase
      .from('imports')
      .insert({
        agency_id: agencyId,
        file_name: fileName,
        num_listings: numListings,
        listings_inserted: 0,
        status: 'processing'
      })
      .select()
      .single();
  });
};

export const processBatchImport = async (
  listings: ParsedListing[],
  agencyId: string,
  importId: string,
  onProgress?: ImportProgressCallback
): Promise<BatchImportResult> => {
  try {
    // Prepare listings with agency_id and import_id
    const listingsWithAgency = listings.map(listing => ({
      ...listing,
      agency_id: agencyId,
      import_id: importId
    }));

    // Process in batches of 5 listings
    const chunks = chunk(listingsWithAgency, 5);
    let totalInserted = 0;

    for (const [index, chunkData] of chunks.entries()) {
      try {
        const { error: chunkError } = await retryWithDelay(async () => {
          return await supabase.from('listings').insert(chunkData);
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
            .eq('id', importId);
          
          throw new Error(`Falha no lote ${index + 1}: ${chunkError.message}`);
        }

        totalInserted += chunkData.length;
        
        // Update progress in database
        await supabase
          .from('imports')
          .update({ listings_inserted: totalInserted })
          .eq('id', importId);

        // Update UI progress
        if (onProgress) {
          const progressPercent = 70 + (index + 1) / chunks.length * 20;
          onProgress(progressPercent);
        }

      } catch (batchError) {
        // Cleanup any partially inserted listings
        await supabase
          .from('listings')
          .delete()
          .eq('import_id', importId);
        
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
        .eq('id', importId);
    });

    if (updateError) {
      console.error('Failed to update import status:', updateError);
      // Don't throw here as the listings were successfully inserted
    }

    return {
      success: true,
      importId,
      totalInserted
    };

  } catch (error: any) {
    return {
      success: false,
      totalInserted: 0,
      error: error.message || 'Erro no processamento em lotes'
    };
  }
};

export const tryEdgeFunctionImport = async (
  fileText: string,
  fileName: string,
  listings: ParsedListing[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Tentando usar Edge Function para importação...');
    
    const { data, error } = await supabase.functions.invoke('xml-import-handler', {
      body: {
        xmlContent: fileText,
        fileName: fileName,
        listings: listings
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro na Edge Function');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Falha na importação');
    }

    console.log('Edge Function import successful:', data);
    return { success: true };
  } catch (error: any) {
    console.error('Edge Function import failed:', error);
    return { 
      success: false, 
      error: error.message || 'Erro na Edge Function' 
    };
  }
};