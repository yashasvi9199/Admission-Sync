export const onRequest = async (context: any) => {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { 'Allow': 'POST' } 
    });
  }

  const dbUrl = env.TURSO_DATABASE_URL || env.VITE_TURSO_DATABASE_URL;
  const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;

  if (!dbUrl || !token) {
    return new Response(JSON.stringify({ 
      error: 'Database environment variables TURSO_DATABASE_URL or TURSO_AUTH_TOKEN are not configured.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const httpUrl = dbUrl.replace(/^libsql:\/\//, 'https://');
  const targetUrl = `${httpUrl}/v2/pipeline`;

  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
