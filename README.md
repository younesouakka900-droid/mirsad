# مِرصاد — منصة أخبار الجريمة والحرب

## هيكل المشروع

```
mirsad/
├── index.html       ← الواجهة الكاملة
├── api/
│   └── news.js      ← Serverless Function (تخفي مفتاح API)
├── vercel.json      ← إعدادات Vercel
└── README.md
```

---

## خطوات النشر على Vercel

### 1. أنشئ مستودع على GitHub
- اذهب إلى github.com → New repository
- اسمه مثلاً: `mirsad`
- ارفع الملفات الثلاثة: `index.html`, `api/news.js`, `vercel.json`

### 2. استورد المشروع في Vercel
- اذهب إلى vercel.com → Add New Project
- اختر المستودع `mirsad`
- اضغط Deploy (بدون أي تعديل)

### 3. أضف مفتاح GNews
- في Vercel → مشروعك → Settings → Environment Variables
- أضف:
  - **Name:** `GNEWS_API_KEY`
  - **Value:** مفتاحك من gnews.io
- اضغط Save ثم أعد النشر (Redeploy)

### 4. احصل على مفتاح GNews مجاني
- اذهب إلى: https://gnews.io
- سجّل حساباً مجانياً
- المجاني يتيح 100 طلب/يوم — كافٍ للبداية

---

## ملاحظات أمنية
- المفتاح محفوظ في Vercel Environment Variables فقط
- لا يظهر أبداً في كود الواجهة أو متصفح الزوار
- الـ API endpoint `/api/news` هو الوسيط الوحيد
