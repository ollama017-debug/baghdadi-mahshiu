# محشي البغدادي - موقع المينيو ولوحة التحكم

موقع مينيو إلكتروني لمطعم محشي البغدادي مع لوحة تحكم كاملة لإدارة الأقسام والأطباق والطلبات.

## المميزات

### واجهة الزبون (المينيو)
- عرض الأقسام والأطباق
- تصفح الأطباق حسب القسم
- عرض تفاصيل الطبق مع الصور والمكونات
- إضافة الأطباق لسلة الطلب
- إرسال الطلب مع رقم الطاولة

### لوحة التحكم (للمطعم)
- إدارة الأقسام (إضافة/تعديل/حذف)
- إدارة الأطباق مع صور متعددة
- متابعة الطلبات في الوقت الفعلي
- تحديث حالة الطلبات
- إعدادات المطعم

## إعداد المشروع

### 1. إنشاء مستخدم Admin

يجب إنشاء مستخدم Admin من خلال Supabase Dashboard:

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروع "محشي البغدادي"
3. اذهب إلى **Authentication** > **Users**
4. اضغط على **Add user** > **Create new user**
5. أدخل البيانات التالية:
   - **Email**: `admin@mahshi-baghdadi.com`
   - **Password**: `Mahshi@2024!Secure#Admin`
   - **Auto Confirm User**: ✓ (مفعل)
6. اضغط **Create user**

### 2. بيانات الدخول للوحة التحكم

- **رابط لوحة التحكم**: `/dashboard/login`
- **البريد الإلكتروني**: `admin@mahshi-baghdadi.com`
- **كلمة المرور**: `Mahshi@2024!Secure#Admin`

⚠️ **مهم**: قم بتغيير كلمة المرور بعد أول تسجيل دخول!

## تشغيل المشروع

```bash
# تثبيت الحزم
npm install

# تشغيل في وضع التطوير
npm run dev
```

## الروابط

- **المينيو (للزبائن)**: http://localhost:3000
- **لوحة التحكم**: http://localhost:3000/dashboard/login

## التقنيات المستخدمة

- **Next.js 16** - إطار العمل
- **Tailwind CSS** - التصميم
- **Supabase** - قاعدة البيانات والمصادقة
- **Lucide React** - الأيقونات

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
