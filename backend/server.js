require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');


/* V14.2 TELEGRAM NOTIFICATIONS */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TELEGRAM_ENABLED = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

async function telegramApi(method, body) {
  if (!TELEGRAM_ENABLED) return { ok: false, skipped: true };
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

function telegramEscape(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function telegramOrderText(order, event='PAYMENT PROOF') {
  const items = (order.items || []).map(i =>
    `• ${telegramEscape(i.product_id)} × ${i.quantity} — Rp${Number(i.unit_price||0).toLocaleString('id-ID')}`
  ).join('\n') || '• —';
  return [
    `🔔 <b>ZYREX — ${telegramEscape(event)}</b>`,
    '',
    `🧾 <b>Order:</b> <code>${telegramEscape(order.id)}</code>`,
    `👤 <b>Customer:</b> ${telegramEscape(order.customer?.name)}`,
    `📧 <b>Email:</b> ${telegramEscape(order.customer?.email)}`,
    '',
    '<b>Products</b>',
    items,
    '',
    `💰 <b>Total:</b> Rp${Number(order.total_amount||0).toLocaleString('id-ID')}`,
    `💳 <b>Payment:</b> ${telegramEscape(order.payment_method?.label || order.payment_method?.type || 'QRIS')}`,
    `📌 <b>Status:</b> ${telegramEscape(order.status)}`,
  ].join('\n');
}

async function notifyTelegramOrder(order, proofBuffer=null, proofMime='image/jpeg') {
  if (!TELEGRAM_ENABLED) return;
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ APPROVE', callback_data: `zyrex:approve:${order.id}` },
      { text: '❌ REJECT', callback_data: `zyrex:reject:${order.id}` }
    ]]
  };
  if (proofBuffer) {
    const boundary = `----zyrex${crypto.randomBytes(12).toString('hex')}`;
    // multipart helper below handles Buffer safely.
    await telegramMultipart('sendPhoto', {
      chat_id: TELEGRAM_CHAT_ID,
      photo: { filename: `proof-${order.id}.jpg`, buffer: proofBuffer, mime: proofMime },
      caption: telegramOrderText(order, 'PAYMENT PROOF'),
      parse_mode: 'HTML',
      reply_markup: JSON.stringify(keyboard)
    });
  } else {
    await telegramApi('sendMessage', {
      chat_id: TELEGRAM_CHAT_ID,
      text: telegramOrderText(order, 'NEW ORDER'),
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
}

async function telegramMultipart(method, fields) {
  if (!TELEGRAM_ENABLED) return { ok:false, skipped:true };
  const boundary = `----ZYREX-${crypto.randomBytes(12).toString('hex')}`;
  const chunks = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value?.buffer) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${value.filename}"\r\nContent-Type: ${value.mime}\r\n\r\n`));
      chunks.push(value.buffer);
      chunks.push(Buffer.from('\r\n'));
    } else {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method:'POST',
    headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`},
    body:Buffer.concat(chunks)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

async function editTelegramDecision(messageId, decision, orderId) {
  if (!TELEGRAM_ENABLED) return;
  const label = decision === 'APPROVED' ? '✅ APPROVED' : '❌ REJECTED';
  await telegramApi('editMessageReplyMarkup', {
    chat_id: TELEGRAM_CHAT_ID,
    message_id: messageId,
    reply_markup: JSON.stringify({ inline_keyboard: [[{ text: `${label} · ${orderId}`, callback_data: 'zyrex:done' }]] })
  });
}


const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5500';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || FRONTEND_URL).split(',').map(s => s.trim()).filter(Boolean);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PROOF_BUCKET = 'payment-proofs';
const PRODUCT_BUCKET = 'product-files';
const AI_RATE_WINDOW_MS = 10 * 60 * 1000;
const AI_RATE_LIMIT = 20;
const aiRate = new Map();

const USE_SUPABASE = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = USE_SUPABASE ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
if (!USE_SUPABASE) console.warn('Supabase env not found — using local JSON database for development.');
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'db.json');
const LOCAL_UPLOAD_DIR = path.join(LOCAL_DATA_DIR, 'uploads');

const defaultProducts = [
  { id: 'p1', name: 'ZYREX Landing Kit', category: 'TEMPLATES', description: 'A premium vanilla HTML/CSS landing foundation.', price: 79000, image: '', file_path: 'zyrex-landing-kit.zip', active: true },
  { id: 'p2', name: 'Motion UI Pack', category: 'UI KITS', description: 'Micro-interaction patterns and reusable interface components.', price: 59000, image: '', file_path: 'motion-ui-pack.zip', active: true },
  { id: 'p3', name: 'Roblox Core Scripts', category: 'SCRIPTS', description: 'Editable starter systems for Roblox creators.', price: 99000, image: '', file_path: 'roblox-core-scripts.zip', active: true },
  { id: 'p4', name: 'Creator Utility Pack', category: 'DIGITAL TOOLS', description: 'Small utilities designed to speed up creator workflows.', price: 49000, image: '', file_path: 'creator-utility-pack.zip', active: true }
];
const defaultPaymentMethods = [
  { id: 'pm_qris', type: 'QRIS', label: 'QRIS (All e-wallets & banks)', image: 'assets/zyrex-qris.jpg', bank_name: '', account_number: '', account_holder: '', instructions: 'Scan with any QRIS-supported e-wallet or mobile banking app.', active: true, created_at: new Date().toISOString() }
];

// ---- Persistence (Supabase Postgres: one JSONB row holds the whole app state) ----
async function loadDb() {
  const initial = { users: [], sessions: [], admin_sessions: [], products: defaultProducts.map(x=>({...x})), payment_methods: defaultPaymentMethods.map(x=>({...x})), orders: [], payments: [], download_tokens: [] };
  if (!USE_SUPABASE) {
    const fs = require('fs');
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive:true });
    if (!fs.existsSync(LOCAL_DB_FILE)) { fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial,null,2)); return initial; }
    try {
      const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE,'utf8'));
      for (const key of Object.keys(initial)) if (!Array.isArray(db[key])) db[key]=initial[key];
      if (!db.products.length) db.products=initial.products;
      if (!db.payment_methods.length) db.payment_methods=initial.payment_methods;
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db,null,2));
      return db;
    } catch { fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial,null,2)); return initial; }
  }
  const { data, error } = await supabase.from('app_state').select('data').eq('id','main').maybeSingle();
  if (error) throw new Error(`Failed to load database: ${error.message}`);
  if (!data) {
    const { error: insertError } = await supabase.from('app_state').insert({ id:'main', data:initial });
    if (insertError) throw new Error(`Failed to initialize database: ${insertError.message}`);
    return initial;
  }
  const db=data.data||{};
  for (const key of Object.keys(initial)) if (!Array.isArray(db[key])) db[key]=[];
  let changed=false;
  if (!db.products.length){db.products=initial.products;changed=true;}
  if (!db.payment_methods.length){db.payment_methods=initial.payment_methods;changed=true;}
  if(changed) await saveDb(db);
  return db;
}
async function saveDb(db) {
  if (!USE_SUPABASE) {
    const fs=require('fs');fs.mkdirSync(LOCAL_DATA_DIR,{recursive:true});
    const tmp=LOCAL_DB_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,LOCAL_DB_FILE);return;
  }
  const { error }=await supabase.from('app_state').update({data:db,updated_at:new Date().toISOString()}).eq('id','main');
  if(error) throw new Error(`Failed to save database: ${error.message}`);
}
async function ensureBuckets() {
  if (!USE_SUPABASE) { const fs=require('fs'); fs.mkdirSync(LOCAL_UPLOAD_DIR,{recursive:true}); return; }
  for(const bucket of [PROOF_BUCKET,PRODUCT_BUCKET]){const {data}=await supabase.storage.getBucket(bucket);if(!data)await supabase.storage.createBucket(bucket,{public:false});}
}

function id(prefix) { return `${prefix}_${crypto.randomBytes(8).toString('hex')}`; }
function now() { return new Date().toISOString(); }
function publicProduct(p) { return { id: p.id, name: p.name, category: p.category, description: p.description, price: p.price, image: p.image || '', active: !!p.active }; }
function publicPaymentMethod(m) { return { id: m.id, type: m.type, label: m.label, image: m.image || '', bankName: m.bank_name || '', accountNumber: m.account_number || '', accountHolder: m.account_holder || '', instructions: m.instructions || '', active: !!m.active }; }
function validateProductInput(body, existing) {
  const name = sanitizeName(body.name); const category = String(body.category || '').trim().slice(0, 60); const description = String(body.description || '').trim().slice(0, 600);
  const price = Math.trunc(Number(body.price)); const image = String(body.image || '').trim().slice(0, 500); const filePath = String(body.file_path || existing?.file_path || '').trim().slice(0, 200);
  if (name.length < 2) return { error: 'Product name must be at least 2 characters' };
  if (!category) return { error: 'Category is required' };
  if (!description) return { error: 'Description is required' };
  if (!Number.isInteger(price) || price < 0) return { error: 'Price must be a non-negative whole number' };
  return { value: { name, category, description, price, image, file_path: filePath } };
}
function validatePaymentMethodInput(body) {
  const type = String(body.type || '').toUpperCase(); const label = sanitizeName(body.label); const instructions = String(body.instructions || '').trim().slice(0, 300);
  if (!['QRIS', 'BANK_TRANSFER'].includes(type)) return { error: 'Type must be QRIS or BANK_TRANSFER' };
  if (label.length < 2) return { error: 'Label must be at least 2 characters' };
  if (type === 'QRIS') { const image = String(body.image || '').trim().slice(0, 500); if (!image) return { error: 'QRIS methods need an image URL or path' }; return { value: { type, label, instructions, image, bank_name: '', account_number: '', account_holder: '' } }; }
  const bankName = String(body.bankName || body.bank_name || '').trim().slice(0, 100); const accountNumber = String(body.accountNumber || body.account_number || '').trim().slice(0, 60); const accountHolder = String(body.accountHolder || body.account_holder || '').trim().slice(0, 100);
  if (!bankName || !accountNumber || !accountHolder) return { error: 'Bank transfer methods need bank name, account number and account holder' };
  return { value: { type, label, instructions, image: '', bank_name: bankName, account_number: accountNumber, account_holder: accountHolder } };
}
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, createdAt: u.created_at }; }
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }
function sanitizeName(v) { return String(v || '').trim().replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, 120); }
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
}
function passwordVerify(password, encoded) {
  try {
    const [salt, hex] = String(encoded || '').split(':');
    if (!salt || !hex) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hex, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
async function issueSession(db, userId, admin = false) {
  const raw = crypto.randomBytes(32).toString('hex');
  const record = { id: id(admin ? 'as' : 'ses'), user_id: userId, token_hash: tokenHash(raw), expires_at: new Date(Date.now() + (admin ? ADMIN_SESSION_TTL_MS : SESSION_TTL_MS)).toISOString(), created_at: now() };
  (admin ? db.admin_sessions : db.sessions).push(record);
  await saveDb(db);
  return raw;
}
function bearer(req) { const h = req.get('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; }
function currentUser(db, req) {
  const raw = bearer(req); if (!raw) return null;
  const s = db.sessions.find(x => x.token_hash === tokenHash(raw));
  if (!s || Date.now() > Date.parse(s.expires_at)) return null;
  const u = db.users.find(x => x.id === s.user_id && x.active !== false); return u ? { user: u, session: s } : null;
}
function auth(req, res, next) { const c = currentUser(req.db, req); if (!c) return res.status(401).json({ error: 'Authentication required' }); req.user = c.user; req.session = c.session; next(); }
function adminAuth(req, res, next) {
  const raw = bearer(req);
  const legacy = process.env.ADMIN_TOKEN && req.get('x-admin-token') === process.env.ADMIN_TOKEN;
  if (legacy) return next();
  if (!raw) return res.status(401).json({ error: 'Admin authentication required' });
  const s = req.db.admin_sessions.find(x => x.token_hash === tokenHash(raw));
  if (!s || Date.now() > Date.parse(s.expires_at)) return res.status(401).json({ error: 'Admin session expired' });
  req.adminSession = s; next();
}
function publicOrder(o) { return { id: o.id, total: o.total_amount, status: o.status, customer: { name: o.customer.name, email: o.customer.email }, items: o.items.map(i => ({ productId: i.product_id, quantity: i.quantity, unitPrice: i.unit_price })), paymentMethod: o.payment_method ? { id: o.payment_method.id, type: o.payment_method.type, label: o.payment_method.label } : null, proofStatus: o.proof ? 'SUBMITTED' : 'NOT_SUBMITTED', createdAt: o.created_at, paidAt: o.paid_at || null }; }
function parseProof(data) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(data || '')); if (!m) return null;
  const buf = Buffer.from(m[2], 'base64'); if (!buf.length || buf.length > MAX_PROOF_BYTES) return null;
  const signatures = { 'image/jpeg': b => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), 'image/png': b => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/webp': b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' };
  if (!signatures[m[1]](buf)) return null; return { mime: m[1], ext: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[m[1]], buf };
}

app.disable('x-powered-by');

/* V13.1 PUBLIC AUTH DISABLED */
const PUBLIC_AUTH_DISABLED = true;
function publicAuthDisabled(req, res, next) {
  if (PUBLIC_AUTH_DISABLED && /^\/api\/(auth\/(login|register|signup)|register|signup|login)$/.test(req.path)) {
    return res.status(410).json({ok:false, error:"Public user authentication is disabled. Admin access only."});
  }
  next();
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(publicAuthDisabled);
app.use(cors({ origin: (origin, cb) => {
  if (!origin || origin === 'null' || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  try {
    const u = new URL(origin);
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && ['http:','https:'].includes(u.protocol)) return cb(null, true);
  } catch {}
  cb(new Error('CORS origin denied'));
} }));
app.use(express.json({ limit: '8mb' }));

// One-click Render deployment: serve the frontend from the same Node service.

const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR, { extensions: ['html'] }));

// AI assistant proxy. Configure AI_API_KEY, AI_API_URL and AI_MODEL in backend/.env.
app.post('/api/ai/chat', async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const nowMs = Date.now();
    const prev = aiRate.get(ip) || { start: nowMs, count: 0 };
    if (nowMs - prev.start > AI_RATE_WINDOW_MS) { prev.start = nowMs; prev.count = 0; }
    prev.count += 1; aiRate.set(ip, prev);
    if (prev.count > AI_RATE_LIMIT) return res.status(429).json({ error: 'Too many AI requests. Try again later.' });
    const apiKey = String(process.env.AI_API_KEY || '').trim();
    const apiUrl = String(process.env.AI_API_URL || '').trim();
    const model = String(process.env.AI_MODEL || '').trim();
    if (!apiKey || !apiUrl || !model) return res.status(503).json({ error: 'AI is not configured on the server yet.' });
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = incoming.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string').slice(-12);
    if (!messages.length) return res.status(400).json({ error: 'Message is required.' });
    const system = 'You are ZYREX AI, the helpful assistant for the ZYREX digital ecosystem. Answer in the user\'s language, be concise, friendly and practical. You can explain ZYREX website features, digital products, web development, UI/UX and Roblox development. Never claim a payment is verified; payment verification is handled by the backend/admin. Do not expose server secrets or API keys.';
    const upstream = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages], temperature: 0.7 }) });
    const raw = await upstream.text();
    let data; try { data = JSON.parse(raw); } catch { data = null; }
    if (!upstream.ok) { console.error('AI upstream error:', upstream.status, raw.slice(0, 500)); return res.status(502).json({ error: `AI provider returned ${upstream.status}.` }); }
    const message = data?.choices?.[0]?.message?.content || data?.output_text || data?.message?.content;
    if (!message) return res.status(502).json({ error: 'AI provider returned no message.' });
    res.json({ message: String(message).slice(0, 6000) });
  } catch (e) { console.error('AI proxy error:', e.message); res.status(502).json({ error: 'Could not reach AI provider.' }); }
});




app.get('/api/health', (req, res) => res.json({ ok: true, service: 'zyrex-api', version: '14.2.0', auth: 'ADMIN_ONLY', roles: ['ADMIN'], paymentMode: 'MULTI_METHOD_MANUAL_VERIFICATION', persistentStorage: USE_SUPABASE ? 'supabase' : 'local-development' }));

// Load fresh app state from Supabase before every request past this point.
app.use(async (req, res, next) => {
  try { req.db = await loadDb(); next(); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Database unavailable' }); }
});

// V14: public customer accounts are disabled. Store uses guest checkout.
app.post('/api/auth/register',(req,res)=>res.status(410).json({error:'Customer registration is disabled. Checkout as guest.'}));
app.post('/api/auth/login',(req,res)=>res.status(410).json({error:'Customer login is disabled. Checkout as guest.'}));
app.get('/api/auth/me',(req,res)=>res.status(410).json({error:'Customer accounts are disabled.'}));
app.post('/api/auth/logout',(req,res)=>res.json({ok:true}));
app.get('/api/me/orders',(req,res)=>res.status(410).json({error:'Customer accounts are disabled.'}));

// Admin authentication
app.post('/api/admin/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), pass = String(req.body?.password || '');
  const configuredEmail = String(process.env.ADMIN_EMAIL || 'admin@zyrex.local').trim().toLowerCase();
  const configuredHash = String(process.env.ADMIN_PASSWORD_HASH || '');
  const configuredPlain = String(process.env.ADMIN_PASSWORD || (!USE_SUPABASE ? 'admin123' : ''));
  const a = Buffer.from(pass), b = Buffer.from(configuredPlain); const plainOk = !!configuredPlain && a.length === b.length && crypto.timingSafeEqual(a, b); const valid = email === configuredEmail && (configuredHash ? passwordVerify(pass, configuredHash) : plainOk);
  if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });
  const token = await issueSession(req.db, `ADMIN:${email}`, true); res.json({ token, admin: { email, role: 'ADMIN' }, expiresIn: ADMIN_SESSION_TTL_MS });
});
app.post('/api/admin/auth/logout', adminAuth, async (req, res) => { if (req.adminSession) { req.db.admin_sessions = req.db.admin_sessions.filter(s => s.id !== req.adminSession.id); await saveDb(req.db); } res.json({ ok: true }); });

app.get('/api/products', (req, res) => res.json(req.db.products.filter(p => p.active).map(publicProduct)));
app.get('/api/products/:id', (req, res) => { const p = req.db.products.find(x => x.id === req.params.id && x.active); if (!p) return res.status(404).json({ error: 'Product not found' }); res.json(publicProduct(p)); });

app.get('/api/payment-methods', (req, res) => res.json(req.db.payment_methods.filter(m => m.active).map(publicPaymentMethod)));

app.post('/api/orders', async (req,res)=>{
  try{
    const body=req.body||{}, customer=body.customer||{};
    const name=sanitizeName(customer.name), email=String(customer.email||'').trim().toLowerCase();
    if(name.length<2)return res.status(400).json({error:'Enter your name.'});
    if(!validateEmail(email))return res.status(400).json({error:'Enter a valid email.'});
    if(!Array.isArray(body.items)||!body.items.length||body.items.length>30)return res.status(400).json({error:'Cart is invalid'});
    const method=req.db.payment_methods.find(m=>m.id===String(body.paymentMethodId)&&m.active);
    if(!method)return res.status(400).json({error:'Choose a valid payment method'});
    const items=[];let total=0;
    for(const raw of body.items){
      const p=req.db.products.find(x=>x.id===String(raw.productId)&&x.active),qty=Math.trunc(Number(raw.quantity));
      if(!p||!Number.isInteger(qty)||qty<1||qty>99)return res.status(400).json({error:'Invalid product or quantity'});
      total+=p.price*qty;items.push({product_id:p.id,quantity:qty,unit_price:p.price});
    }
    const order={id:`ZYX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,user_id:null,
      customer:{name,email},type:body.type==='CUSTOM_SERVICE'?'CUSTOM_SERVICE':'DIGITAL_PRODUCT',
      total_amount:total,status:'PENDING_PAYMENT',items,
      payment_method:{id:method.id,type:method.type,label:method.label},proof:null,created_at:now(),updated_at:now()};
    req.db.orders.push(order);
    req.db.payments.push({id:id('pay'),order_id:order.id,gateway:method.type,transaction_id:null,amount:total,status:'PENDING',created_at:now()});
    await saveDb(req.db);
    res.status(201).json({orderId:order.id,status:order.status,amount:total,paymentMethod:publicPaymentMethod(method),
      payment:{message:'Pay the exact total, then submit payment proof for manual verification.'}});
  }catch(e){console.error(e);res.status(500).json({error:'Could not create order'});}
});
app.get('/api/orders/:id',async(req,res)=>{
  const o=req.db.orders.find(x=>x.id===req.params.id);
  if(!o)return res.status(404).json({error:'Order not found'});res.json(publicOrder(o));
});
app.post('/api/payments/proof',async(req,res)=>{
  try{
    const {orderId,proofData}=req.body||{},o=req.db.orders.find(x=>x.id===String(orderId));
    if(!o)return res.status(404).json({error:'Order not found'});
    if(o.status!=='PENDING_PAYMENT')return res.status(409).json({error:`Order is ${o.status}`});
    const parsed=parseProof(proofData);
    if(!parsed)return res.status(400).json({error:'Invalid proof. Use a real JPG, PNG or WebP image up to 5 MB.'});
    const filename=`${o.id}-${crypto.randomBytes(12).toString('hex')}.${parsed.ext}`;
    if (USE_SUPABASE) {
      const {error:uploadError}=await supabase.storage.from(PROOF_BUCKET).upload(filename,parsed.buf,{contentType:parsed.mime,upsert:false});
      if(uploadError){console.error(uploadError);return res.status(500).json({error:'Could not store payment proof'});}
    } else {
      const fs=require('fs');fs.mkdirSync(LOCAL_UPLOAD_DIR,{recursive:true});fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR,filename),parsed.buf);
    }
    o.proof={filename,mime:parsed.mime,submitted_at:now()};o.status='WAITING_VERIFICATION';o.updated_at=now();
    const pay=req.db.payments.find(p=>p.order_id===o.id);if(pay){pay.status='PROOF_SUBMITTED';pay.updated_at=now();}
    await saveDb(req.db);
    notifyTelegramOrder(o, parsed.buf, parsed.mime).catch(err => console.error('[telegram proof]', err.message));
    res.json({ok:true,orderId:o.id,status:o.status});
  }catch(e){console.error(e);res.status(500).json({error:'Could not submit payment proof'});}
});
app.get('/api/payments/:id',async(req,res)=>{
  const o=req.db.orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Order not found'});
  const p=req.db.payments.find(x=>x.order_id===o.id);
  res.json({orderId:o.id,amount:o.total_amount,status:o.status,paymentStatus:p?.status||'PENDING',proofStatus:o.proof?'SUBMITTED':'NOT_SUBMITTED'});
});

// Telegram webhook — inline APPROVE / REJECT buttons.
app.post('/api/telegram/webhook', async (req,res)=>{
  try{
    const cb=req.body?.callback_query;
    if(!cb?.data?.startsWith('zyrex:')) return res.json({ok:true});
    const [prefix,action,orderId]=String(cb.data).split(':');
    if(!['approve','reject'].includes(action)||!orderId) { await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:'Invalid action'}); return res.json({ok:true}); }
    if(String(cb.message?.chat?.id)!==String(TELEGRAM_CHAT_ID)) { await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:'Unauthorized'}); return res.status(403).json({ok:false}); }
    const db=await loadDb(); const o=db.orders.find(x=>x.id===orderId);
    if(!o){await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:'Order not found'});return res.json({ok:true});}
    if(o.status!=='WAITING_VERIFICATION'){await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:`Already ${o.status}`});return res.json({ok:true});}
    o.status=action==='approve'?'PAID':'REJECTED';o.updated_at=now();
    const pay=db.payments.find(x=>x.order_id===o.id);if(pay){pay.status=action==='approve'?'PAID':'REJECTED';pay.updated_at=now();}
    await saveDb(db);
    await telegramApi('answerCallbackQuery',{callback_query_id:cb.id,text:action==='approve'?'Payment approved':'Payment rejected'});
    await editTelegramDecision(cb.message.message_id,action==='approve'?'APPROVED':'REJECTED',o.id);
    await telegramApi('sendMessage',{chat_id:TELEGRAM_CHAT_ID,text:`${action==='approve'?'✅':'❌'} <b>${action==='approve'?'PAYMENT APPROVED':'PAYMENT REJECTED'}</b>\nOrder <code>${telegramEscape(o.id)}</code>`,parse_mode:'HTML'});
    res.json({ok:true});
  }catch(e){console.error('[telegram webhook]',e);res.status(500).json({ok:false});}
});

// Admin order management
app.get('/api/admin/orders', adminAuth, (req, res) => res.json(req.db.orders.slice().reverse().map(o => ({ id: o.id, total: o.total_amount, status: o.status, customer: o.customer, items: o.items, proof: o.proof ? { submittedAt: o.proof.submitted_at, viewUrl: `/api/admin/orders/${o.id}/proof` } : null, createdAt: o.created_at }))));
app.get('/api/admin/orders/:id/proof', adminAuth, async (req, res) => {
  const o = req.db.orders.find(x => x.id === req.params.id); if (!o?.proof) return res.status(404).json({ error: 'Proof not found' });
  let buf;
  if (USE_SUPABASE) {
    const { data, error } = await supabase.storage.from(PROOF_BUCKET).download(o.proof.filename);
    if (error || !data) return res.status(404).json({ error: 'Proof file missing' });
    buf = Buffer.from(await data.arrayBuffer());
  } else {
    const fs=require('fs'); const file=path.join(LOCAL_UPLOAD_DIR,o.proof.filename);
    if(!fs.existsSync(file)) return res.status(404).json({error:'Proof file missing'});
    buf=fs.readFileSync(file);
  }
  res.type(o.proof.mime); res.send(buf);
});
app.post('/api/admin/orders/:id/approve', adminAuth, async (req, res) => {
  const o = req.db.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.status !== 'WAITING_VERIFICATION') return res.status(409).json({ error: 'Order is not waiting for verification' });
  o.status = 'PAID'; o.paid_at = now(); o.updated_at = now();
  const pay = req.db.payments.find(p => p.order_id === o.id);
  if (pay) { pay.status = 'PAID'; pay.transaction_id = pay.transaction_id || `MANUAL-${o.id}`; pay.paid_at = o.paid_at; }
  const tokens = [];
  for (const item of o.items) { const raw = crypto.randomBytes(32).toString('hex'); req.db.download_tokens.push({ id: id('dlt'), order_id: o.id, product_id: item.product_id, token_hash: tokenHash(raw), expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), used_at: null, created_at: now() }); tokens.push({ productId: item.product_id, token: raw }); }
  await saveDb(req.db);
  res.json({ ok: true, id: o.id, status: o.status, downloads: tokens });
});
app.post('/api/admin/orders/:id/reject', adminAuth, async (req, res) => {
  const o = req.db.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.status !== 'WAITING_VERIFICATION') return res.status(409).json({ error: 'Order is not waiting for verification' });
  o.status = 'REJECTED'; o.updated_at = now();
  const p = req.db.payments.find(x => x.order_id === o.id); if (p) p.status = 'REJECTED';
  await saveDb(req.db);
  res.json({ ok: true, id: o.id, status: o.status });
});

// Admin product management
app.get('/api/admin/products', adminAuth, (req, res) => res.json(req.db.products.slice().reverse().map(publicProduct)));
app.post('/api/admin/products', adminAuth, async (req, res) => {
  const v = validateProductInput(req.body || {}); if (v.error) return res.status(400).json({ error: v.error });
  const product = { id: id('p'), ...v.value, active: req.body?.active !== false, created_at: now() };
  req.db.products.push(product); await saveDb(req.db); res.status(201).json(publicProduct(product));
});
app.patch('/api/admin/products/:id', adminAuth, async (req, res) => {
  const p = req.db.products.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: 'Product not found' });
  const body = req.body || {}; const v = validateProductInput({ name: body.name ?? p.name, category: body.category ?? p.category, description: body.description ?? p.description, price: body.price ?? p.price, image: body.image ?? p.image, file_path: body.file_path ?? p.file_path }, p);
  if (v.error) return res.status(400).json({ error: v.error });
  Object.assign(p, v.value); if (typeof body.active === 'boolean') p.active = body.active; p.updated_at = now();
  await saveDb(req.db); res.json(publicProduct(p));
});
app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  const idx = req.db.products.findIndex(x => x.id === req.params.id); if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  req.db.products.splice(idx, 1); await saveDb(req.db); res.json({ ok: true });
});

// Admin payment method management
app.get('/api/admin/payment-methods', adminAuth, (req, res) => res.json(req.db.payment_methods.slice().reverse().map(publicPaymentMethod)));
app.post('/api/admin/payment-methods', adminAuth, async (req, res) => {
  const v = validatePaymentMethodInput(req.body || {}); if (v.error) return res.status(400).json({ error: v.error });
  const method = { id: id('pm'), ...v.value, active: req.body?.active !== false, created_at: now() };
  req.db.payment_methods.push(method); await saveDb(req.db); res.status(201).json(publicPaymentMethod(method));
});
app.patch('/api/admin/payment-methods/:id', adminAuth, async (req, res) => {
  const m = req.db.payment_methods.find(x => x.id === req.params.id); if (!m) return res.status(404).json({ error: 'Payment method not found' });
  const body = req.body || {}; const v = validatePaymentMethodInput({ type: body.type ?? m.type, label: body.label ?? m.label, instructions: body.instructions ?? m.instructions, image: body.image ?? m.image, bankName: body.bankName ?? m.bank_name, accountNumber: body.accountNumber ?? m.account_number, accountHolder: body.accountHolder ?? m.account_holder });
  if (v.error) return res.status(400).json({ error: v.error });
  Object.assign(m, v.value); if (typeof body.active === 'boolean') m.active = body.active; m.updated_at = now();
  await saveDb(req.db); res.json(publicPaymentMethod(m));
});
app.delete('/api/admin/payment-methods/:id', adminAuth, async (req, res) => {
  const idx = req.db.payment_methods.findIndex(x => x.id === req.params.id); if (idx === -1) return res.status(404).json({ error: 'Payment method not found' });
  if (req.db.payment_methods.length <= 1) return res.status(409).json({ error: 'At least one payment method must remain' });
  req.db.payment_methods.splice(idx, 1); await saveDb(req.db); res.json({ ok: true });
});

// Customer product download (redirects to a short-lived signed Supabase Storage URL)
app.get('/api/download/:token', async (req, res) => {
  const hash = tokenHash(req.params.token);
  const t = req.db.download_tokens.find(x => x.token_hash === hash);
  if (!t || t.used_at || Date.now() > Date.parse(t.expires_at)) return res.status(403).json({ error: 'Download access denied or expired' });
  const o = req.db.orders.find(x => x.id === t.order_id);
  const p = req.db.products.find(x => x.id === t.product_id);
  if (!o || o.status !== 'PAID' || !p || !p.file_path) return res.status(404).json({ error: 'Product delivery is not configured' });
  if (!USE_SUPABASE) return res.status(404).json({error:'Product delivery requires Supabase Storage in production.'});
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUrl(p.file_path, 60);
  if (error || !data) return res.status(404).json({ error: 'Product file is not available yet' });
  t.used_at = now(); await saveDb(req.db); res.redirect(data.signedUrl);
});

// Browser routes: serve the main site without intercepting API errors.
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'admin.html')));

app.use((err, req, res, next) => { console.error(err); res.status(err.message === 'CORS origin denied' ? 403 : 500).json({ error: err.message === 'CORS origin denied' ? 'CORS origin denied' : 'Internal server error' }); });

ensureBuckets().catch(e => console.error('Bucket setup warning:', e.message));

if (require.main === module) {
  app.listen(PORT, () => console.log(`ZYREX API listening on port ${PORT}`));
}
module.exports = app;
