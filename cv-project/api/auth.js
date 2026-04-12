// api/auth.js — التحقق من رمز الدخول وتغييره
// رمز الدخول محفوظ في Vercel Environment Variables

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).end();

  const { action, pin, newPin } = req.body;

  // ── التحقق من الرمز ──
  if (action === 'verify') {
    if (pin === ADMIN_PIN) {
      return res.status(200).json({ valid: true });
    }
    return res.status(401).json({ valid: false });
  }

  // ── ملاحظة تغيير الرمز ──
  // تغيير الرمز يتطلب تحديث Environment Variable في Vercel يدوياً
  // هذا هو النهج الأكثر أماناً لأن الرمز لا يُخزن في قاعدة البيانات
  if (action === 'change') {
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: 'الرمز الحالي غير صحيح' });
    }
    return res.status(200).json({
      info: 'لتغيير الرمز، يجب تحديث متغير ADMIN_PIN في إعدادات Vercel ثم إعادة النشر.'
    });
  }

  return res.status(400).json({ error: 'action غير معروف' });
}
