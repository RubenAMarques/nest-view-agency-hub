import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Upload, AlertCircle } from 'lucide-react';

interface XmlUploadSectionProps {
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress?: number;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => Promise<boolean>;
  onClearFile: () => void;
}

export function XmlUploadSection({ 
  selectedFile, 
  isUploading, 
  uploadProgress = 0,
  onFileSelect, 
  onImport,
  onClearFile 
}: XmlUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = async () => {
    const success = await onImport();
    if (success && fileInputRef.current) {
      fileInputRef.current.value = '';
      onClearFile();
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Listagens via XML
        </CardTitle>
        <CardDescription>
          Importe e gerencie as suas listagens em segundos, sem complicações
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
            onChange={onFileSelect}
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

        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 animate-pulse" />
              A importar ficheiro... {uploadProgress}%
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}
        
        <Button 
          onClick={handleImportClick}
          disabled={!selectedFile || isUploading}
          className="w-full"
          variant="elegant"
        >
          {isUploading ? 'A importar...' : 'Importar'}
        </Button>
      </CardContent>
    </Card>
  );
}