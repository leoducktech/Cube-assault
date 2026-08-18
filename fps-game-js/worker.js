export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS' && (url.pathname === '/api/signup' || url.pathname === '/api/login' || url.pathname === '/api/update-score' || url.pathname === '/api/leaderboard')) {
        return corsResponse();
      }

      if (url.pathname === '/api/signup' && request.method === 'POST') {
        return await handleSignup(request, env);
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return await handleLogin(request, env);
      }

      if (url.pathname === '/api/update-score' && request.method === 'POST') {
        return await handleUpdateScore(request, env);
      }

      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        return await handleLeaderboard(env);
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

  await ensureUserTable(env);

  const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ? OR email = ? LIMIT 1')
    .bind(username, email)
    .first();

  if (existing) {
    return jsonResponse({ success: false, error: 'Username or email already in use.' }, 409);
  }

  const passwordHash = await hashPassword(password);

  await env.DB.prepare('INSERT INTO users (username, email, password, score) VALUES (?, ?, ?, 0)')
    .bind(username, email, passwordHash)
    .run();

  return jsonResponse({ success: true, message: 'Account created successfully.' }, 201);
}

async function handleLogin(request, env) {
  const body = await request.json();
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return jsonResponse({ success: false, error: 'Username and password are required.' }, 400);
  }

  await ensureUserTable(env);

  const account = await env.DB.prepare('SELECT username, email, password, score FROM users WHERE username = ? LIMIT 1')
    .bind(username)
    .first();

  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, 404);
  }

  const passwordHash = await hashPassword(password);
  if (account.password !== passwordHash) {
    return jsonResponse({ success: false, error: 'Incorrect password.' }, 401);
  }

  return jsonResponse({ success: true, email: account.email, score: Number(account.score || 0) }, 200);
}

async function handleUpdateScore(request, env) {
  const body = await request.json();
  const username = String(body.username || '').trim();
  const score = Number(body.score || 0);

  if (!username) {
    return jsonResponse({ success: false, error: 'Username is required.' }, 400);
  }

  await ensureUserTable(env);
  await env.DB.prepare('UPDATE users SET score = MAX(COALESCE(score, 0), ?) WHERE username = ?')
    .bind(score, username)
    .run();

  const updated = await env.DB.prepare('SELECT score FROM users WHERE username = ? LIMIT 1').bind(username).first();
  return jsonResponse({ success: true, score: Number(updated?.score || 0) }, 200);
}

async function handleLeaderboard(env) {
  await ensureUserTable(env);
  const result = await env.DB.prepare('SELECT username, score FROM users WHERE score IS NOT NULL ORDER BY score DESC LIMIT 10').all();
  return jsonResponse({ success: true, entries: (result.results || []).map((entry) => ({
    username: entry.username,
    score: Number(entry.score || 0),
  })) }, 200);
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

async function ensureUserTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        score INTEGER DEFAULT 0
      )
    `).run();
  } catch {
    // Ignore if the table already exists or the database is temporarily unavailable.
  }

  try {
    await env.DB.prepare('ALTER TABLE users ADD COLUMN score INTEGER DEFAULT 0').run();
  } catch {
    // Ignore if the column already exists.
  }
}
