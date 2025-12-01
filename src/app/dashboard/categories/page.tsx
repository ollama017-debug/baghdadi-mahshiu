'use client';

import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { Plus, Edit2, Trash2, GripVertical, X, Save, Image as ImageIcon } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name_ar: '',
    description_ar: '',
    image_url: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name_ar: category.name_ar,
        description_ar: category.description_ar || '',
        image_url: category.image_url || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name_ar: '',
        description_ar: '',
        image_url: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name_ar: '',
      description_ar: '',
      image_url: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name_ar: formData.name_ar,
            description_ar: formData.description_ar || null,
            image_url: formData.image_url || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const maxOrder = Math.max(...categories.map(c => c.sort_order), 0);
        const { error } = await supabase
          .from('categories')
          .insert({
            name_ar: formData.name_ar,
            description_ar: formData.description_ar || null,
            image_url: formData.image_url || null,
            is_active: formData.is_active,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
      }

      await fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const updateOrder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: newOrder })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    // Update sort_order for both
    await updateOrder(newCategories[index].id, index);
    await updateOrder(newCategories[targetIndex].id, targetIndex);
    
    setCategories(newCategories);
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
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">إدارة الأقسام</h1>
        <button
          onClick={() => openModal()}
          className="bg-[#d4a574] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 hover:bg-[#b8956a] transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">إضافة قسم</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
          <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-500 mb-2">لا توجد أقسام</h3>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">ابدأ بإضافة أقسام للقائمة</p>
          <button
            onClick={() => openModal()}
            className="bg-[#d4a574] text-white px-4 sm:px-6 py-2 rounded-xl hover:bg-[#b8956a] transition-colors text-sm sm:text-base"
          >
            إضافة قسم جديد
          </button>
        </div>
      ) : (
        <>
          {/* عرض الجدول للشاشات الكبيرة */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الترتيب</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الاسم</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الوصف</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === categories.length - 1}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{category.name_ar}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {category.description_ar || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        category.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(category)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* عرض البطاقات للجوال */}
          <div className="md:hidden space-y-3">
            {categories.map((category, index) => (
              <div key={category.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{category.name_ar}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        category.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'مفعل' : 'معطل'}
                      </span>
                    </div>
                    {category.description_ar && (
                      <p className="text-gray-500 text-xs line-clamp-2 break-all">{category.description_ar}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* أزرار الترتيب */}
                    <div className="flex flex-col gap-0.5 ml-1">
                      <button
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 p-0.5"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 p-0.5"
                      >
                        ▼
                      </button>
                    </div>
                    
                    {/* أزرار التعديل والحذف */}
                    <button
                      onClick={() => openModal(category)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal - متوافق مع الجوال */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h2>
              <button onClick={closeModal} className="p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  اسم القسم *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm sm:text-base"
                  placeholder="مثال: دجاج محشي"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  الوصف
                </label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none text-sm sm:text-base"
                  placeholder="وصف مختصر للقسم"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  رابط الصورة
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm sm:text-base"
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded text-[#d4a574] focus:ring-[#d4a574]"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  القسم مفعل (يظهر في الموقع)
                </label>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
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
