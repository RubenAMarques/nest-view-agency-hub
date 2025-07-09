Deno.serve(async (req) => {
  // Configurar cabeçalhos CORS para permitir solicitações de domínios específicos
  const allowedOrigins = [
    'https://fae488a3-d626-4849-b66c-d31dda8be445.lovableproject.com',
    'https://id-preview--fae488a3-d626-4849-b66c-d31dda8be445.lovable.app',
    'https://lovable.dev',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Get the target path from the request URL
    const url = new URL(req.url);
    const targetPath = url.pathname.replace('/supabase-cors-proxy', '');
    const targetUrl = `https://eytqmdssekkdlnoqzrzb.supabase.co${targetPath}${url.search}`;
    
    // Copiar os cabeçalhos da solicitação original
    const headers = new Headers();
    for (const [key, value] of req.headers.entries()) {
      // Não copiar cabeçalhos relacionados a host e origem
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    }
    
    // Add Supabase API key if not present
    if (!headers.has('apikey')) {
      headers.set('apikey', Deno.env.get('SUPABASE_ANON_KEY') || '');
    }
    
    // Prepare request options
    const options: RequestInit = {
      method: req.method,
      headers: headers,
    };
    
    // Adicionar corpo da solicitação para métodos não-GET
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        options.body = JSON.stringify(await req.json().catch(() => ({})));
      } else if (contentType && contentType.includes('multipart/form-data')) {
        options.body = await req.formData().catch(() => new FormData());
      } else {
        options.body = await req.text().catch(() => '');
      }
    }
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Make request to Supabase
    const response = await fetch(targetUrl, options);
    
    // Criar resposta com cabeçalhos CORS
    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      responseHeaders.append(key, value);
    }
    
    // Adicionar cabeçalhos CORS à resposta
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    
    // Get response body
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`Proxy error: ${error.message}`);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});