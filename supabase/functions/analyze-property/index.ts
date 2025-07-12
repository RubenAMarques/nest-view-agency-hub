import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityCriteria {
  name: string;
  passed: boolean;
  suggestion?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID do imóvel é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch property data
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !property) {
      return new Response(
        JSON.stringify({ error: 'Imóvel não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing property:', property.title);

    // Quality criteria analysis
    const criteria: QualityCriteria[] = [];
    let score = 100;

    // 1. Critério: Fotos (15 pontos)
    const hasPhotos = property.img_urls && property.img_urls.length >= 3;
    criteria.push({
      name: 'Fotos Suficientes',
      passed: hasPhotos,
      suggestion: hasPhotos ? undefined : 'Adicione pelo menos 3 fotos do imóvel para melhorar a apresentação'
    });
    if (!hasPhotos) score -= 15;

    // 2. Critério: Qualidade das fotos (15 pontos)
    const hasGoodPhotos = property.img_urls && property.img_urls.length >= 5;
    criteria.push({
      name: 'Qualidade das Fotos',
      passed: hasGoodPhotos,
      suggestion: hasGoodPhotos ? undefined : 'Adicione mais fotos (pelo menos 5) incluindo diferentes divisões'
    });
    if (!hasGoodPhotos) score -= 15;

    // 3. Critério: Localização completa (20 pontos)
    const hasCompleteLocation = property.street && property.zipcode && property.city;
    criteria.push({
      name: 'Localização Completa',
      passed: hasCompleteLocation,
      suggestion: hasCompleteLocation ? undefined : 'Complete a informação de localização (rua, código postal, cidade)'
    });
    if (!hasCompleteLocation) score -= 20;

    // 4. Critério: Descrição adequada (20 pontos)
    const hasGoodDescription = property.description && property.description.length >= 100;
    criteria.push({
      name: 'Descrição Adequada',
      passed: hasGoodDescription,
      suggestion: hasGoodDescription ? undefined : 'Adicione uma descrição mais detalhada (pelo menos 100 caracteres)'
    });
    if (!hasGoodDescription) score -= 20;

    // 5. Critério: Dados básicos completos (20 pontos)
    const hasBasicData = property.price && property.price > 0 && 
                        property.property_type && 
                        (property.rooms && property.rooms > 0) || property.property_type === 'terreno';
    criteria.push({
      name: 'Dados Básicos Completos',
      passed: hasBasicData,
      suggestion: hasBasicData ? undefined : 'Complete os dados básicos: preço, tipo de imóvel e número de quartos'
    });
    if (!hasBasicData) score -= 20;

    // 6. Critério: Área especificada (10 pontos)
    const hasArea = property.area_util && property.area_util > 0;
    criteria.push({
      name: 'Área Especificada',
      passed: hasArea,
      suggestion: hasArea ? undefined : 'Especifique a área útil do imóvel'
    });
    if (!hasArea) score -= 10;

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    console.log('Analysis complete. Score:', score);

    // Update property with analysis results
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        score,
        last_analyzed_at: new Date().toISOString(),
        has_bad_photos: !hasPhotos || !hasGoodPhotos,
        has_bad_description: !hasGoodDescription,
        has_insufficient_location: !hasCompleteLocation,
        has_missing_data: !hasBasicData || !hasArea
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating property:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar análise' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return analysis results
    const result = {
      score,
      criteria
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-property function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});