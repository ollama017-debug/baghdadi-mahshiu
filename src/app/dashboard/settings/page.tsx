'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, Settings } from '@/lib/supabase';
import { Save, Store, Phone, Clock, Link as LinkIcon, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    restaurant_name: '',
    description_ar: '',
    address: '',
    phone: '',
    whatsapp: '',
    working_hours: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    logo_url: '',
    cover_image_url: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
        setFormData({
          restaurant_name: data.restaurant_name || '',
          description_ar: data.description_ar || '',
          address: data.address || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          working_hours: data.working_hours || '',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          tiktok_url: data.tiktok_url || '',
          logo_url: data.logo_url || '',
          cover_image_url: data.cover_image_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // ضغط الصورة قبل الرفع
  const compressImage = (file: File, maxWidth = 400, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();
      
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // رفع الشعار
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const compressedBlob = await compressImage(file, 200, 0.9);
      const fileName = `logo-${Date.now()}.jpg`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('فشل رفع الشعار');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // رفع صورة الغلاف
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const compressedBlob = await compressImage(file, 1200, 0.85);
      const fileName = `cover-${Date.now()}.jpg`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, cover_image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('فشل رفع صورة الغلاف');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (settings) {
        const { error } = await supabase
          .from('settings')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert(formData);

        if (error) throw error;
      }

      alert('تم حفظ الإعدادات بنجاح');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">إعدادات المطعم</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-6 h-6 text-[#d4a574]" />
            <h2 className="text-lg font-bold">المعلومات الأساسية</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المطعم
              </label>
              <input
                type="text"
                value={formData.restaurant_name}
                onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="محشي البغدادي"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="البصرة الجزائر شارع جامع الموسوي"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وصف المطعم
              </label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none"
                placeholder="أول مطعم مختص بالدجاج المحشي في البصرة..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Phone className="w-6 h-6 text-[#d4a574]" />
            <h2 className="text-lg font-bold">معلومات التواصل</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="07xxxxxxxxx"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الواتساب
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="9647xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-[#d4a574]" />
            <h2 className="text-lg font-bold">أوقات العمل</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أوقات العمل
            </label>
            <input
              type="text"
              value={formData.working_hours}
              onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
              placeholder="من 1 ظهراً إلى 12 ليلاً"
            />
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <LinkIcon className="w-6 h-6 text-[#d4a574]" />
            <h2 className="text-lg font-bold">روابط التواصل الاجتماعي</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                فيسبوك
              </label>
              <input
                type="url"
                value={formData.facebook_url}
                onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="https://facebook.com/..."
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                انستغرام
              </label>
              <input
                type="url"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="https://instagram.com/..."
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تيك توك
              </label>
              <input
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                placeholder="https://tiktok.com/..."
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#d4a574]" />
            <h2 className="text-base sm:text-lg font-bold">الصور</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* الشعار */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                شعار المطعم
              </label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              
              {formData.logo_url ? (
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-[#d4a574] bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.logo_url} alt="الشعار" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <label
                    htmlFor="logo-upload"
                    className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-lg shadow cursor-pointer hover:bg-white"
                  >
                    <Upload className="w-4 h-4 text-gray-600" />
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  className={`flex flex-col items-center justify-center w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploadingLogo ? 'border-gray-300 bg-gray-50' : 'border-[#d4a574] hover:bg-[#d4a574]/5'
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#d4a574] mb-1" />
                      <span className="text-xs text-[#d4a574]">رفع الشعار</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* صورة الغلاف */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                صورة الغلاف
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
                id="cover-upload"
              />
              
              {formData.cover_image_url ? (
                <div className="relative">
                  <div className="w-full h-32 sm:h-40 rounded-xl overflow-hidden border-2 border-[#d4a574] bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.cover_image_url} alt="الغلاف" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <label
                    htmlFor="cover-upload"
                    className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-lg shadow cursor-pointer hover:bg-white"
                  >
                    <Upload className="w-4 h-4 text-gray-600" />
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="cover-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploadingCover ? 'border-gray-300 bg-gray-50' : 'border-[#d4a574] hover:bg-[#d4a574]/5'
                  }`}
                >
                  {uploadingCover ? (
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#d4a574] mb-1" />
                      <span className="text-xs text-[#d4a574]">رفع صورة الغلاف</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#d4a574] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#b8956a] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  );
}
