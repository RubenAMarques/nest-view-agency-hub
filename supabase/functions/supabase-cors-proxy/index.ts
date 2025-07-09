import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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
    const targetUrl = `https://jpbqehtcthvhhkpbcqxo.supabase.co${targetPath}${url.search}`;
    
    // Copy request headers
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // Don't copy host-related headers
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });
    
    // Add Supabase API key if not present
    if (!headers.has('apikey')) {
      headers.set('apikey', Deno.env.get('SUPABASE_ANON_KEY') || '');
    }
    
    // Prepare request options
    const options: RequestInit = {
      method: req.method,
      headers: headers,
    };
    
    // Add request body for non-GET methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        options.body = JSON.stringify(await req.json());
      } else if (contentType?.includes('multipart/form-data')) {
        options.body = await req.formData();
      } else {
        options.body = await req.text();
      }
    }
    
    // Make request to Supabase
    const response = await fetch(targetUrl, options);
    
    // Create response with CORS headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.append(key, value);
    });
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    // Get response body
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
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