export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { pathname } = new URL(request.url);

  const body = await parseJson(request);
  if (!body) {
    return jsonResponse({ success: false, error: 'Invalid JSON payload.' }, 400);
  }

  if (pathname === '/api/login') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return jsonResponse({ success: false, error: 'Username and password are required.' }, 400);
    }

    await ensureScoreColumn(env);

    const account = await env.DB.prepare(
      'SELECT username, email, password, score FROM users WHERE username = ? LIMIT 1'
    )
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

  if (pathname === '/api/update-score') {
    const username = String(body.username || '').trim();
    const score = Number(body.score || 0);

    if (!username) {
      return jsonResponse({ success: false, error: 'Username is required.' }, 400);
    }

    await ensureScoreColumn(env);
    await env.DB.prepare(
      'UPDATE users SET score = MAX(COALESCE(score, 0), ?) WHERE username = ?'
    )
      .bind(score, username)
      .run();

    const updated = await env.DB.prepare('SELECT score FROM users WHERE username = ? LIMIT 1').bind(username).first();
    return jsonResponse({ success: true, score: Number(updated?.score || 0) }, 200);
  }

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

  await ensureScoreColumn(env);

  const existing = await env.DB.prepare(
    'SELECT username FROM users WHERE username = ? OR email = ? LIMIT 1'
  )
    .bind(username, email)
    .first();

  if (existing) {
    return jsonResponse({ success: false, error: 'Username or email already in use.' }, 409);
  }

  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (username, email, password, score) VALUES (?, ?, ?, 0)'
  )
    .bind(username, email, passwordHash)
    .run();

  return jsonResponse({ success: true, message: 'Account created successfully.' }, 201);
}

async function ensureScoreColumn(env) {
  try {
    await env.DB.prepare('ALTER TABLE users ADD COLUMN score INTEGER DEFAULT 0').run();
  } catch {
    // Ignore if the column already exists.
  }
}

async function parseJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      ...corsHeaders(),
    },
  });
}
