// api/photo.js — رفع وجلب الصورة الشخصية عبر Supabase Storage

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PIN    = process.env.ADMIN_PIN || '1234';
const BUCKET       = 'cv-assets';
const PHOTO_PATH   = 'profile/photo.jpg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: جلب رابط الصورة ──
  if (req.method === 'GET') {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PHOTO_PATH}`;
    // نتحقق إن كانت الصورة موجودة
    const check = await fetch(publicUrl, { method: 'HEAD' });
    if (check.ok) {
      return res.status(200).json({ url: publicUrl + '?t=' + Date.now() });
    }
    return res.status(200).json({ url: null });
  }

  // ── POST: رفع صورة جديدة ──
  if (req.method === 'POST') {
    const pin = req.headers['x-admin-pin'];
    if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'غير مصرح' });

    // الصورة تأتي كـ base64
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'لا توجد صورة' });

    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PHOTO_PATH}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeType || 'image/jpeg',
          'x-upsert': 'true' // يستبدل الصورة القديمة
        },
        body: buffer
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return res.status(500).json({ error: err });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PHOTO_PATH}`;
    return res.status(200).json({ url: publicUrl + '?t=' + Date.now() });
  }

  // ── DELETE: حذف الصورة ──
  if (req.method === 'DELETE') {
    const pin = req.headers['x-admin-pin'];
    if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'غير مصرح' });

    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PHOTO_PATH}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }
    );
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
