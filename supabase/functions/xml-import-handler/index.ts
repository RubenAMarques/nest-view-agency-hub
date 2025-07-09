import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Configurar cabeçalhos CORS para permitir solicitações de domínios específicos
  const allowedOrigins = [
    'https://fae488a3-d626-4849-b66c-d31dda8be445.lovableproject.com',
    'https://id-preview--fae488a3-d626-4849-b66c-d31dda8be445.lovable.app',
    'https://lovable.dev',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Lidar com solicitações OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Não autorizado');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado');
    }

    if (req.method === 'POST') {
      const { xmlContent, fileName, listings } = await req.json();

      if (!xmlContent || !fileName || !listings || listings.length === 0) {
        throw new Error('Dados de importação inválidos');
      }

      // Create import record
      const { data: importData, error: importError } = await supabaseAdmin
        .from('imports')
        .insert({
          agency_id: profile.agency_id,
          file_name: fileName,
          num_listings: listings.length,
          status: 'processing'
        })
        .select()
        .single();

      if (importError) {
        throw new Error('Erro ao criar registo de importação');
      }

      // Prepare listings with agency_id and import_id
      const listingsWithAgency = listings.map((listing: any) => ({
        ...listing,
        agency_id: profile.agency_id,
        import_id: importData.id
      }));

      // Insert listings
      const { error: listingsError } = await supabaseAdmin
        .from('listings')
        .insert(listingsWithAgency);

      if (listingsError) {
        // Cleanup failed import
        await supabaseAdmin
          .from('imports')
          .update({ 
            status: 'failed',
            error_message: 'Erro ao inserir anúncios'
          })
          .eq('id', importData.id);
        
        throw new Error('Erro ao inserir anúncios');
      }

      // Update import status to completed
      await supabaseAdmin
        .from('imports')
        .update({ status: 'completed' })
        .eq('id', importData.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Importação concluída com sucesso',
        importId: importData.id,
        numListings: listings.length
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'online',
        message: 'A função XML Import Handler está funcionando corretamente',
        allowedOrigins,
        origin: origin,
        isAllowedOrigin
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    throw new Error('Método não suportado');

  } catch (error: any) {
    console.error('Error in xml-import-handler:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});