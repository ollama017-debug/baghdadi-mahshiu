'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, Category, MenuItem, ItemImage } from '@/lib/supabase';
import { Plus, Edit2, Trash2, X, Save, ChefHat, Star, Image as ImageIcon, Upload, Percent, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function ItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name_ar: '',
    description_ar: '',
    ingredients_ar: '',
    price: '',
    offer_price: '',
    has_offer: false,
    is_active: true,
    is_featured: false,
  });
  const [images, setImages] = useState<{ url: string; is_primary: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // جلب البيانات الأساسية أولاً لعرض الصفحة بسرعة
      const [itemsRes, categoriesRes] = await Promise.all([
        supabase.from('menu_items').select('*, category:categories(*)').order('sort_order'),
        supabase.from('categories').select('*').order('sort_order'),
      ]);

      setItems(itemsRes.data || []);
      setCategories(categoriesRes.data || []);
      setLoading(false); // إنهاء التحميل فوراً
      
      // جلب الصور في الخلفية
      const { data: images } = await supabase.from('item_images').select('*');
      if (images && images.length > 0) {
        setItems(prev => prev.map(item => ({
          ...item,
          images: images.filter(img => img.menu_item_id === item.id)
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const openModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category_id: item.category_id,
        name_ar: item.name_ar,
        description_ar: item.description_ar || '',
        ingredients_ar: item.ingredients_ar || '',
        price: item.price.toString(),
        offer_price: item.offer_price?.toString() || '',
        has_offer: item.has_offer || false,
        is_active: item.is_active,
        is_featured: item.is_featured,
      });
      setImages(item.images?.map(img => ({ url: img.image_url, is_primary: img.is_primary })) || []);
    } else {
      setEditingItem(null);
      setFormData({
        category_id: categories[0]?.id || '',
        name_ar: '',
        description_ar: '',
        ingredients_ar: '',
        price: '',
        offer_price: '',
        has_offer: false,
        is_active: true,
        is_featured: false,
      });
      setImages([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // ضغط الصورة قبل الرفع
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<Blob> => {
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

  // رفع صورة من الجهاز
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        // ضغط الصورة أولاً
        const compressedBlob = await compressImage(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `menu-items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('فشل رفع الصورة: ' + uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
          
          setImages(prev => [...prev, { url: publicUrl, is_primary: prev.length === 0 }]);
        }
      } catch (error) {
        console.error('Error uploading:', error);
        alert('حدث خطأ أثناء رفع الصورة');
      }
    }
    
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
      newImages[0].is_primary = true;
    }
    setImages(newImages);
  };

  const setPrimaryImage = (index: number) => {
    setImages(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const itemData = {
        category_id: formData.category_id,
        name_ar: formData.name_ar,
        description_ar: formData.description_ar || null,
        ingredients_ar: formData.ingredients_ar || null,
        price: parseFloat(formData.price),
        offer_price: formData.has_offer && formData.offer_price ? parseFloat(formData.offer_price) : null,
        has_offer: formData.has_offer,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        // Update item
        const { error: itemError } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (itemError) throw itemError;

        // Delete old images and insert new ones
        await supabase.from('item_images').delete().eq('menu_item_id', editingItem.id);
        
        if (images.length > 0) {
          const imageRecords = images.map((img, index) => ({
            menu_item_id: editingItem.id,
            image_url: img.url,
            is_primary: img.is_primary,
            sort_order: index,
          }));
          await supabase.from('item_images').insert(imageRecords);
        }
      } else {
        // Create new item
        const maxOrder = Math.max(...items.map(i => i.sort_order), 0);
        const { data: newItem, error: itemError } = await supabase
          .from('menu_items')
          .insert({
            ...itemData,
            sort_order: maxOrder + 1,
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Insert images
        if (images.length > 0) {
          const imageRecords = images.map((img, index) => ({
            menu_item_id: newItem.id,
            image_url: img.url,
            is_primary: img.is_primary,
            sort_order: index,
          }));
          await supabase.from('item_images').insert(imageRecords);
        }
      }

      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبق؟')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const filteredItems = filterCategory
    ? items.filter(item => item.category_id === filterCategory)
    : items;

  const getPrimaryImage = (item: MenuItem) => {
    if (!item.images || item.images.length === 0) return null;
    const primary = item.images.find(img => img.is_primary);
    return primary?.image_url || item.images[0]?.image_url;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">إدارة الأطباق</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none p-2 text-sm sm:text-base border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          >
            <option value="">جميع الأقسام</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="bg-[#d4a574] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 hover:bg-[#b8956a] transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">إضافة طبق</span>
            <span className="sm:hidden">إضافة</span>
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
          <ChefHat className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-500 mb-2">لا توجد أقسام</h3>
          <p className="text-gray-400 text-sm sm:text-base">يجب إضافة أقسام أولاً قبل إضافة الأطباق</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
          <ChefHat className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-500 mb-2">لا توجد أطباق</h3>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">ابدأ بإضافة أطباق للقائمة</p>
          <button
            onClick={() => openModal()}
            className="bg-[#d4a574] text-white px-4 sm:px-6 py-2 rounded-xl hover:bg-[#b8956a] transition-colors text-sm sm:text-base"
          >
            إضافة طبق جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="relative h-32 sm:h-40 bg-gray-100">
                {getPrimaryImage(item) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getPrimaryImage(item)!}
                    alt={item.name_ar}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                  </div>
                )}
                {item.is_featured && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#d4a574] text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    مميز
                  </div>
                )}
                {!item.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">معطل</span>
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base truncate">{item.name_ar}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500">{item.category?.name_ar}</p>
                  </div>
                  <div className="text-left flex-shrink-0 mr-2">
                    {item.has_offer && item.offer_price ? (
                      <>
                        <span className="text-[10px] sm:text-sm text-gray-400 line-through">{item.price.toLocaleString()}</span>
                        <span className="text-sm sm:text-lg font-bold text-red-500 block">{item.offer_price.toLocaleString()} د.ع</span>
                      </>
                    ) : (
                      <span className="text-sm sm:text-lg font-bold text-[#d4a574]">{item.price.toLocaleString()} د.ع</span>
                    )}
                  </div>
                </div>
                {item.description_ar && (
                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-3">{item.description_ar}</p>
                )}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => openModal(item)}
                    className="flex-1 py-1.5 sm:py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 py-1.5 sm:py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - متوافق مع الجوال */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingItem ? 'تعديل الطبق' : 'إضافة طبق جديد'}
              </h2>
              <button onClick={closeModal} className="p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    القسم *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm sm:text-base"
                    required
                  >
                    <option value="">اختر القسم</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    السعر (د.ع) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm sm:text-base"
                    placeholder="0"
                    required
                    min="0"
                    step="500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  اسم الطبق *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm sm:text-base"
                  placeholder="مثال: دجاج محشي كامل"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  الوصف
                </label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none text-sm sm:text-base"
                  placeholder="وصف مختصر للطبق"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  المكونات
                </label>
                <textarea
                  value={formData.ingredients_ar}
                  onChange={(e) => setFormData({ ...formData, ingredients_ar: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none text-sm sm:text-base"
                  placeholder="رز، دجاج، بهارات..."
                  rows={2}
                />
              </div>

              {/* العرض */}
              <div className="bg-orange-50 p-3 sm:p-4 rounded-xl border border-orange-200">
                <label className="flex items-center gap-2 cursor-pointer mb-2 sm:mb-3">
                  <input
                    type="checkbox"
                    checked={formData.has_offer}
                    onChange={(e) => setFormData({ ...formData, has_offer: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded text-orange-500 focus:ring-orange-500"
                  />
                  <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  <span className="text-xs sm:text-sm font-medium text-orange-700">تفعيل العرض</span>
                </label>
                
                {formData.has_offer && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-orange-700 mb-1.5">
                      سعر العرض (د.ع)
                    </label>
                    <input
                      type="number"
                      value={formData.offer_price}
                      onChange={(e) => setFormData({ ...formData, offer_price: e.target.value })}
                      className="w-full p-2.5 sm:p-3 border border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
                      placeholder="سعر العرض"
                      min="0"
                      step="500"
                    />
                    {formData.price && formData.offer_price && (
                      <p className="text-[10px] sm:text-xs text-orange-600 mt-1.5">
                        نسبة الخصم: {Math.round((1 - parseFloat(formData.offer_price) / parseFloat(formData.price)) * 100)}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Images */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  الصور
                </label>
                
                {/* رفع من الجهاز */}
                <div className="mb-2 sm:mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`flex items-center justify-center gap-2 w-full p-3 sm:p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      uploading ? 'border-gray-300 bg-gray-50' : 'border-[#d4a574] hover:bg-[#d4a574]/5'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 animate-spin" />
                        <span className="text-gray-500 text-xs sm:text-sm">جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4a574]" />
                        <span className="text-[#d4a574] text-xs sm:text-sm">اضغط لرفع صور</span>
                      </>
                    )}
                  </label>
                </div>
                
                {images.length > 0 && (
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    {images.map((img, index) => (
                      <div key={index} className="relative group">
                        <div className={`relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl overflow-hidden border-2 shadow-sm ${img.is_primary ? 'border-[#d4a574] ring-2 ring-[#d4a574]/30' : 'border-gray-200'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg sm:rounded-xl flex items-center justify-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(index)}
                            className="p-1 sm:p-1.5 bg-white rounded-lg shadow"
                            title="تعيين كصورة رئيسية"
                          >
                            <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${img.is_primary ? 'text-[#d4a574] fill-[#d4a574]' : 'text-gray-400'}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="p-1 sm:p-1.5 bg-white rounded-lg shadow"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                          </button>
                        </div>
                        {img.is_primary && (
                          <span className="absolute -top-2 -right-2 bg-[#d4a574] text-white text-[10px] px-2 py-0.5 rounded-full shadow">رئيسية</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded text-[#d4a574] focus:ring-[#d4a574]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">مفعل</span>
                </label>

                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded text-[#d4a574] focus:ring-[#d4a574]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">مميز</span>
                </label>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#d4a574] text-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl hover:bg-[#b8956a] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
