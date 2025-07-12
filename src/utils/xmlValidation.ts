import { parseOpenImmoXml } from '@/utils/xmlParser';

export const validateXmlFile = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
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
    return { isValid: true };
  } catch (error: any) {
    return { 
      isValid: false, 
      error: error.message || "Ficheiro XML não é válido" 
    };
  }
};