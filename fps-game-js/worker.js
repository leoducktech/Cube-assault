export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/signup' && request.method === 'OPTIONS') {
        return corsResponse();
      }

      if (url.pathname === '/api/signup' && request.method === 'POST') {
        return await handleSignup(request, env);
      }

      return new Response('Not found', {
        status: 404,
        headers: corsHeaders(),
      });
    } catch (error) {
      return jsonResponse({ success: false, error: `Worker error: ${error.message}` }, 500);
    }
  },
};

async function handleSignup(request, env) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse({ success: false, error: 'Request must be JSON.' }, 400);
  }

  const body = await request.json();
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!username || !email || !password || !confirmPassword) {
    return jsonResponse({ success: false, error: 'All fields are required.' }, 400);
  }

  if (password !== confirmPassword) {
    return jsonResponse({ success: false, error: 'Passwords do not match.' }, 400);
  }

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT
    )`
  ).run();

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1')
    .bind(username, email)
    .first();

  if (existing) {
    return jsonResponse({ success: false, error: 'Username or email already in use.' }, 409);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  await env.DB.prepare('INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, username, email, passwordHash, createdAt)
    .run();

  return jsonResponse({ success: true, message: 'Account created successfully.' }, 201);
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}
