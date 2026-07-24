import { neon, Pool } from '@neondatabase/serverless';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const json = (response, value, status = 200) => response.status(status).setHeader('content-type', 'application/json; charset=utf-8').send(value);
const now = () => new Date().toISOString();
const clean = (value, max = 200) => String(value || '').trim().slice(0, max);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const key = () => `ICB-${randomBytes(16).toString('hex').toUpperCase().match(/.{1,4}/g).join('-')}`;
const isAdmin = (request) => request.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN}`;
const validExpiry = (value) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T23:59:59.999Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; };
const db = () => neon(process.env.DATABASE_URL);

async function activate(request, response, sql) {
  const licenseKey = clean(request.body?.licenseKey, 100).toUpperCase();
  const installationId = clean(request.body?.installationId, 120);
  if (!licenseKey || !installationId) return json(response, { valid: false, error: 'Нужны ключ и идентификатор установки.' }, 400);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pointResult = await client.query('SELECT id, name, status, expires_at, max_activations FROM points WHERE license_hash=$1 FOR UPDATE', [hash(`${licenseKey}:${process.env.LICENSE_PEPPER}`)]);
    const point = pointResult.rows[0];
    if (!point || point.status !== 'active' || new Date(`${point.expires_at}T23:59:59.999Z`).getTime() < Date.now()) { await client.query('ROLLBACK'); return json(response, { valid: false, error: 'Лицензия недействительна.' }, 403); }
    const existing = await client.query('SELECT 1 FROM activations WHERE point_id=$1 AND installation_id=$2', [point.id, installationId]);
    if (existing.rowCount) await client.query('UPDATE activations SET last_seen_at=$1 WHERE point_id=$2 AND installation_id=$3', [now(), point.id, installationId]);
    else {
      const count = await client.query('SELECT COUNT(*)::int AS count FROM activations WHERE point_id=$1', [point.id]);
      if (count.rows[0].count >= point.max_activations) { await client.query('ROLLBACK'); return json(response, { valid: false, error: 'Достигнут лимит устройств.' }, 403); }
      const timestamp = now();
      await client.query('INSERT INTO activations (point_id, installation_id, first_seen_at, last_seen_at) VALUES ($1, $2, $3, $4)', [point.id, installationId, timestamp, timestamp]);
    }
    await client.query('COMMIT');
    return json(response, { valid: true, point: { id: point.id, name: point.name }, expiresAt: point.expires_at });
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); await pool.end(); }
}

async function list(response, sql) { const points = await sql`SELECT p.id, p.name, p.address, p.contact, p.status, p.expires_at, p.max_activations, p.created_at, p.updated_at, COUNT(a.installation_id)::int AS activation_count FROM points p LEFT JOIN activations a ON a.point_id=p.id GROUP BY p.id ORDER BY p.created_at DESC`; return json(response, { points }); }
async function create(request, response, sql) { const data = request.body || {}; const name = clean(data.name); const expiresAt = clean(data.expiresAt, 10); const max = Math.max(1, Math.min(50, Number(data.maxActivations) || 1)); if (!name || !validExpiry(expiresAt)) return json(response, { error: 'Укажите название точки и корректную дату лицензии.' }, 400); const licenseKey = key(); const point = { id: randomUUID(), name, address: clean(data.address), contact: clean(data.contact), expiresAt, max, createdAt: now() }; await sql`INSERT INTO points (id,name,address,contact,status,license_hash,expires_at,max_activations,created_at,updated_at) VALUES (${point.id},${point.name},${point.address},${point.contact},'active',${hash(`${licenseKey}:${process.env.LICENSE_PEPPER}`)},${point.expiresAt},${point.max},${point.createdAt},${point.createdAt})`; return json(response, { point, licenseKey }, 201); }
async function update(request, response, sql, id) { const data=request.body||{}; const name=clean(data.name); const expiresAt=clean(data.expiresAt,10); const max=Math.max(1,Math.min(50,Number(data.maxActivations)||1)); if(!name||!validExpiry(expiresAt)) return json(response,{error:'Укажите название точки и корректную дату лицензии.'},400); const result=await sql`UPDATE points SET name=${name},address=${clean(data.address)},contact=${clean(data.contact)},status=${data.status==='blocked'?'blocked':'active'},expires_at=${expiresAt},max_activations=${max},updated_at=${now()} WHERE id=${id} RETURNING id`; return result.length?json(response,{ok:true}):json(response,{error:'Точка не найдена.'},404); }
async function rotate(response, sql, id) { const licenseKey=key(); const result=await sql`UPDATE points SET license_hash=${hash(`${licenseKey}:${process.env.LICENSE_PEPPER}`)},updated_at=${now()} WHERE id=${id} RETURNING id`; return result.length?json(response,{licenseKey}):json(response,{error:'Точка не найдена.'},404); }
async function reset(response, sql, id) { const exists=await sql`SELECT id FROM points WHERE id=${id}`; if(!exists.length)return json(response,{error:'Точка не найдена.'},404); const removed=await sql`DELETE FROM activations WHERE point_id=${id} RETURNING installation_id`; return json(response,{ok:true,removed:removed.length}); }

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') return json(response, { ok: true });
  if (!process.env.DATABASE_URL || !process.env.ADMIN_TOKEN || !process.env.LICENSE_PEPPER) return json(response, { error: 'Сервер лицензий не настроен.' }, 503);
  const rawRoute = new URL(request.url, 'https://localhost').pathname.split('/').filter(Boolean); const adminIndex = rawRoute.lastIndexOf('admin'); const route = adminIndex >= 0 ? rawRoute.slice(adminIndex) : rawRoute; const sql = db();
  if (new URL(request.url, 'https://localhost').pathname.endsWith('/activate') && request.method === 'POST') return activate(request, response, sql);
  if (!isAdmin(request)) return json(response, { error: 'Не авторизован.' }, 401);
  if (route.join('/') === 'admin/points' && request.method === 'GET') return list(response, sql);
  if (route.join('/') === 'admin/points' && request.method === 'POST') return create(request, response, sql);
  // Keep mutations on flat paths: Vercel's nested catch-all route can otherwise
  // resolve to a static 404 before this function receives the request.
  const pointId = clean(request.body?.id, 80);
  if (route.join('/') === 'admin/point' && request.method === 'PATCH') return update(request, response, sql, pointId);
  if (route.join('/') === 'admin/rotate' && request.method === 'POST') return rotate(response, sql, pointId);
  if (route.join('/') === 'admin/reset' && request.method === 'POST') return reset(response, sql, pointId);
  return json(response, { error: 'Не найдено.' }, 404);
}
