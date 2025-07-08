import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useXmlImport } from '@/hooks/useXmlImport';
import { XmlUploadSection } from './XmlUploadSection';
import { ImportHistory } from './ImportHistory';

export default function XmlImport() {
  const { profile } = useAuth();
  const {
    imports,
    selectedFile,
    isUploading,
    uploadProgress,
    fetchImports,
    handleFileSelect,
    handleImport
  } = useXmlImport();

  useEffect(() => {
    fetchImports();
  }, [profile]);

  const handleClearFile = () => {
    // This will be called after successful import
    fetchImports();
  };

  return (
    <div className="space-y-6">
      <XmlUploadSection
        selectedFile={selectedFile}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
        onClearFile={handleClearFile}
      />
      
      <ImportHistory imports={imports} />
    </div>
  );
}