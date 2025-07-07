import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'lucide-react';

interface ImportRecord {
  id: string;
  import_date: string;
  file_name: string;
  num_listings: number;
  status: string;
}

export default function XmlImport() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    fetchImports();
  }, [profile]);

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

  const parseOpenImmoXml = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML inválido");
    }

    const listings: any[] = [];
    const immobilien = xmlDoc.querySelectorAll("immobilie");

    immobilien.forEach((immobilie) => {
      const listing: any = {
        xml_data: {}
      };

      // Extract basic property info
      const objekttitel = immobilie.querySelector("freitexte objekttitel");
      if (objekttitel) listing.title = objekttitel.textContent?.trim();

      const dreizeiler = immobilie.querySelector("freitexte dreizeiler");
      if (dreizeiler) listing.description = dreizeiler.textContent?.trim();

      // Extract address
      const geo = immobilie.querySelector("geo");
      if (geo) {
        const ort = geo.querySelector("ort");
        if (ort) listing.city = ort.textContent?.trim();

        const plz = geo.querySelector("plz");
        if (plz) listing.zipcode = plz.textContent?.trim();

        const strasse = geo.querySelector("strasse");
        if (strasse) listing.street = strasse.textContent?.trim();

        const land = geo.querySelector("land");
        if (land) listing.country = land.textContent?.trim();

        // Coordinates
        const breitengrad = geo.querySelector("breitengrad");
        const laengengrad = geo.querySelector("laengengrad");
        if (breitengrad) listing.latitude = parseFloat(breitengrad.textContent || '0');
        if (laengengrad) listing.longitude = parseFloat(laengengrad.textContent || '0');
      }

      // Extract prices
      const preise = immobilie.querySelector("preise");
      if (preise) {
        const kaufpreis = preise.querySelector("kaufpreis");
        const nettokaltmiete = preise.querySelector("nettokaltmiete");
        
        if (kaufpreis) {
          listing.price = parseFloat(kaufpreis.textContent || '0');
          listing.offer_type = 'sale';
        } else if (nettokaltmiete) {
          listing.price = parseFloat(nettokaltmiete.textContent || '0');
          listing.offer_type = 'rent';
        }
      }

      // Extract areas and rooms
      const flaechen = immobilie.querySelector("flaechen");
      if (flaechen) {
        const wohnflaeche = flaechen.querySelector("wohnflaeche");
        if (wohnflaeche) listing.living_area = parseFloat(wohnflaeche.textContent || '0');
      }

      const ausstattung = immobilie.querySelector("ausstattung");
      if (ausstattung) {
        const anzahlZimmer = ausstattung.querySelector("anzahl_zimmer");
        if (anzahlZimmer) listing.rooms = parseInt(anzahlZimmer.textContent || '0');
      }

      // Extract property type
      const objektkategorie = immobilie.querySelector("objektkategorie");
      if (objektkategorie) {
        const nutzungsart = objektkategorie.querySelector("nutzungsart");
        const vermarktungsart = objektkategorie.querySelector("vermarktungsart");
        const objektart = objektkategorie.querySelector("objektart");
        
        if (objektart) {
          const wohnung = objektart.querySelector("wohnung");
          const haus = objektart.querySelector("haus");
          const grundstueck = objektart.querySelector("grundstueck");
          
          if (wohnung) listing.property_type = 'apartment';
          else if (haus) listing.property_type = 'house';
          else if (grundstueck) listing.property_type = 'land';
        }
      }

      // Store original XML data for unmapped fields
      listing.xml_data = {
        original_id: immobilie.getAttribute('id'),
        raw_xml: immobilie.outerHTML
      };

      listings.push(listing);
    });

    return listings;
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
        agency_id: profile.agency_id
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchImports();

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Erro ao processar o ficheiro XML.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Listagens via XML
          </CardTitle>
          <CardDescription>
            Carregue um ficheiro XML no formato OpenImmo para importar anúncios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="xml-file" className="block text-sm font-medium mb-2">
              Carregar ficheiro XML
            </label>
            <Input
              ref={fileInputRef}
              id="xml-file"
              type="file"
              accept=".xml,text/xml"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
          
          {selectedFile && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Ficheiro selecionado:</strong> {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Tamanho: {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleImport}
            disabled={!selectedFile || isUploading}
            className="w-full"
            variant="elegant"
          >
            {isUploading ? 'A importar...' : 'Importar'}
          </Button>
        </CardContent>
      </Card>

      {/* Import History */}
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
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30"
                >
                  <div>
                    <p className="font-medium">{importRecord.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(importRecord.import_date)}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}