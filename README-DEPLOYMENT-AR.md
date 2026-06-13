# دليل النشر الإنتاجي لمنصة تجارب تحسين التدريس

## سبب إلغاء الرابط المؤقت

روابط Quick Tunnel المؤقتة قد تتغير أو تتوقف عند إغلاق الجهاز أو توقف خدمة النفق. لذلك لا تصلح لاستقبال مشاركات المدارس بشكل رسمي.

## الخيار الإنتاجي الأسرع بدون إعادة بناء كبيرة

استخدم Render كخدمة Node.js دائمة مع HTTPS ورابط ثابت. هذا المشروع خادم Node.js واحد يخدم الواجهة والـ API، لذلك لا يحتاج فصل الواجهة عن الخادم في المرحلة الأولى.

ملفات النشر المضافة:

- `Dockerfile`
- `docker-compose.yml`
- `render.yaml`
- `.env.example`
- `.gitignore`
- `.dockerignore`
- `scripts/check-health.js`

## متغيرات البيئة المطلوبة

انسخ `.env.example` إلى `.env` محليًا، ولا ترفع `.env` إلى Git.

```text
PUBLIC_APP_URL=https://your-production-domain.example.com
DATA_DIR=/var/data
UPLOADS_DIR=/var/data/uploads
SESSION_SECRET=ضع-قيمة-سرية
MAX_IMAGE_MB=20
MAX_DOCUMENT_MB=50
MAX_VIDEO_MB=500
MAX_ARCHIVE_MB=100
MAX_REQUEST_MB=650
```

## Render

1. ادخل إلى https://render.com
2. أنشئ Web Service من مستودع المشروع.
3. استخدم:
   - Build Command: فارغ
   - Start Command: `npm start`
4. أضف Persistent Disk مركبًا على:

```text
/var/data
```

5. أضف متغير:

```text
PUBLIC_APP_URL=https://YOUR-APP.onrender.com
```

6. بعد النشر اختبر:

```text
https://YOUR-APP.onrender.com/api/health
```

## Cloudflare Named Tunnel ثابت

استخدمه إذا أردت تشغيل المنصة من جهازك المحلي مع رابط ثابت ودومين لديك في Cloudflare.

يتطلب تسجيل دخول Cloudflare ودومين:

```powershell
cloudflared tunnel login
cloudflared tunnel create asir-teaching-platform
cloudflared tunnel route dns asir-teaching-platform experiences.example.com
cloudflared tunnel run asir-teaching-platform
```

استخدم القالب:

```text
cloudflare/config.example.yml
```

ثم عيّن:

```text
PUBLIC_APP_URL=https://experiences.example.com
```

## فحص الصحة

```powershell
npm run health
```

يجب أن يرجع:

```json
{
  "status": "ok",
  "database": "connected",
  "storage": "connected"
}
```

## ملاحظات تخزين الملفات

النسخة الحالية تستخدم تخزين ملفات دائم على قرص الخادم عبر `UPLOADS_DIR`. في مرحلة لاحقة يمكن نقل الملفات إلى Supabase Storage أو Cloudflare R2 باستخدام Direct Upload/Signed URLs للفيديوهات الكبيرة.
