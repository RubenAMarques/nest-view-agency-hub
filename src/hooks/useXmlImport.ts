import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseOpenImmoXml } from '@/utils/xmlParser';
import { ImportRecord } from '@/types/import';

export function useXmlImport() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      return;
    }

    if (!profile?.agency_id) {
      toast({
        title: "Erro",
        description: "Perfil não carregado. Tente refrescar a página.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileText = await selectedFile.text();
      const listings = parseOpenImmoXml(fileText);

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({
          agency_id: profile.agency_id,
          file_name: selectedFile.name,
          num_listings: listings.length,
          status: 'processing'
        })
        .select()
        .single();

      if (importError) throw importError;

      // Insert listings
      const listingsWithAgency = listings.map(listing => ({
        ...listing,
        agency_id: profile.agency_id,
        import_id: importRecord.id
      }));

      const { error: listingsError } = await supabase
        .from('listings')
        .insert(listingsWithAgency);

      if (listingsError) throw listingsError;

      // Update import status
      await supabase
        .from('imports')
        .update({ status: 'completed' })
        .eq('id', importRecord.id);

      toast({
        title: "Sucesso",
        description: `Importação concluída com sucesso! ${listings.length} anúncios importados.`,
      });

      setSelectedFile(null);
      return true;

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Erro ao processar o ficheiro XML.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    imports,
    selectedFile,
    isUploading,
    fetchImports,
    handleFileSelect,
    handleImport
  };
}