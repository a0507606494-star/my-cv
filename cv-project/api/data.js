// api/data.js — Vercel Serverless Function
// يتعامل مع قراءة وكتابة بيانات السيرة الذاتية عبر Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service Role Key (سري - على السيرفر فقط)
const ADMIN_PIN    = process.env.ADMIN_PIN || '1234';

// ── دالة مساعدة للتواصل مع Supabase REST API ──
async function supabase(method, table, body = null, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: جلب البيانات ──
    if (req.method === 'GET') {
      const rows = await supabase('GET', 'cv_data', null, '?select=*&order=id.desc&limit=1');
      if (!rows || rows.length === 0) {
        return res.status(200).json({ exists: false, data: null });
      }
      return res.status(200).json({ exists: true, data: rows[0].content });
    }

    // ── POST: حفظ البيانات (يتطلب رمز الدخول) ──
    if (req.method === 'POST') {
      const pin = req.headers['x-admin-pin'];
      if (pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'رمز الدخول غير صحيح' });
      }

      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'لا يوجد محتوى' });

      // تحقق إن كان هناك سجل موجود
      const existing = await supabase('GET', 'cv_data', null, '?select=id&limit=1');

      if (existing && existing.length > 0) {
        // تحديث السجل الموجود
        await supabase('PATCH', 'cv_data', { content, updated_at: new Date().toISOString() }, `?id=eq.${existing[0].id}`);
      } else {
        // إنشاء سجل جديد
        await supabase('POST', 'cv_data', { content, updated_at: new Date().toISOString() });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
