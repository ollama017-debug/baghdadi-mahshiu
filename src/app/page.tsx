'use client';

import { useEffect, useState } from 'react';
import { supabase, Category, MenuItem, Settings, ItemImage } from '@/lib/supabase';
import { MapPin, Phone, Clock, ChefHat, Star, ShoppingCart, X, Plus, Minus, Send, Percent } from 'lucide-react';
import Image from 'next/image';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // جلب البيانات الأساسية أولاً (بدون الصور) لعرض الصفحة بسرعة
      const [settingsRes, categoriesRes, itemsRes] = await Promise.all([
        supabase.from('settings').select('*').single(),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order')
      ]);

      setSettings(settingsRes.data);
      setCategories(categoriesRes.data || []);
      setMenuItems(itemsRes.data || []);
      setLoading(false); // إنهاء التحميل فوراً
      
      // جلب الصور في الخلفية (لا تؤخر عرض الصفحة)
      const { data: images } = await supabase
        .from('item_images')
        .select('*');
      
      if (images && images.length > 0) {
        setMenuItems(prev => prev.map(item => ({
          ...item,
          images: images.filter(img => img.menu_item_id === item.id) as ItemImage[]
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.menuItem.id === itemId) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : c;
        }
        return c;
      }).filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber ? parseInt(tableNumber) : null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          notes: orderNotes || null,
          total_amount: cartTotal,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.menuItem.id,
        quantity: c.quantity,
        unit_price: c.menuItem.price,
        notes: c.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderSubmitted(true);
      setCart([]);
      setTableNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');

      setTimeout(() => {
        setOrderSubmitted(false);
        setShowCart(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('حدث خطأ أثناء إرسال الطلب');
    }
  };

  const getPrimaryImage = (item: MenuItem) => {
    if (!item.images || item.images.length === 0) {
      // إذا لم تكن هناك صور، استخدم صورة افتراضية
      return "https://placehold.co/400x300/e9e9e9/d4a574?text=محشي+البغدادي";
    }
    const primary = item.images.find(img => img.is_primary);
    return primary?.image_url || item.images[0]?.image_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Header - متوافق مع الجوال */}
      <header className="bg-gradient-to-l from-[#2d2d2d] to-[#1a1a1a] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {settings?.logo_url ? (
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-[#d4a574] flex-shrink-0">
                <Image
                  src={settings.logo_url}
                  alt={settings?.restaurant_name || 'لوجو المطعم'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-[#d4a574] flex-shrink-0" />
            )}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold truncate">{settings?.restaurant_name || 'محشي البغدادي'}</h1>
          </div>
        </div>
      </header>

      {/* Categories Navigation - متوافق مع الجوال */}
      {categories.length > 0 && (
        <div className="sticky top-[40px] sm:top-[52px] z-40 bg-white/95 backdrop-blur-sm shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full whitespace-nowrap transition-all text-xs sm:text-sm font-medium ${
                  selectedCategory === null
                    ? 'bg-[#d4a574] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const element = document.getElementById(`category-${cat.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full whitespace-nowrap transition-all text-xs sm:text-sm font-medium ${
                    selectedCategory === cat.id
                      ? 'bg-[#d4a574] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name_ar}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items - متوافق مع الجوال */}
      <main className="flex-1 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 w-full">
        {menuItems.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">القائمة فارغة</h2>
            <p className="text-gray-500">لم يتم إضافة أي أطباق بعد</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-10">
            {/* عرض حسب القسم المحدد أو جميع الأقسام */}
            {(selectedCategory ? categories.filter(c => c.id === selectedCategory) : categories).map(category => {
              const categoryItems = menuItems.filter(item => item.category_id === category.id);
              if (categoryItems.length === 0) return null;
              
              return (
                <section 
                  key={category.id} 
                  id={`category-${category.id}`}
                  className="scroll-mt-24 sm:scroll-mt-28"
                >
                  {/* عنوان القسم */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#d4a574]/30"></div>
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-800 px-2 sm:px-4">{category.name_ar}</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#d4a574]/30"></div>
                  </div>
                  
                  {/* أطباق القسم */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="relative h-28 sm:h-40 bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getPrimaryImage(item)}
                            alt={item.name_ar}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {item.is_featured && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-[#d4a574] text-white px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              مميز
                            </div>
                          )}
                          {item.has_offer && item.offer_price && (
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-500 text-white px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs flex items-center gap-0.5">
                              <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              عرض
                            </div>
                          )}
                        </div>
                        <div className="p-2 sm:p-3">
                          <h3 className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1 text-gray-800 line-clamp-1">{item.name_ar}</h3>
                          {item.description_ar && (
                            <p className="text-gray-500 text-[10px] sm:text-xs mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2 hidden sm:block">{item.description_ar}</p>
                          )}
                          <div className="flex items-center justify-between">
                            {item.has_offer && item.offer_price ? (
                              <div className="flex flex-col sm:flex-row sm:items-center">
                                <span className="text-[10px] sm:text-xs text-gray-400 line-through">{item.price.toLocaleString()}</span>
                                <span className="text-sm sm:text-lg font-bold text-red-500">{item.offer_price.toLocaleString()} د.ع</span>
                              </div>
                            ) : (
                              <span className="text-sm sm:text-lg font-bold text-[#d4a574]">{item.price.toLocaleString()} د.ع</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                              className="bg-[#2d2d2d] text-white p-1.5 sm:p-2 rounded-full hover:bg-[#d4a574] transition-colors"
                            >
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Button - متوافق مع الجوال */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 bg-[#d4a574] text-white p-3 sm:p-4 rounded-full shadow-2xl hover:bg-[#b8956a] transition-colors z-50"
        >
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs sm:text-sm flex items-center justify-center">
            {cart.reduce((sum, c) => sum + c.quantity, 0)}
          </span>
        </button>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedItem(null); setSelectedImageIndex(0); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* الصورة الرئيسية */}
            <div className="relative h-72 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedItem.images?.[selectedImageIndex]?.image_url || getPrimaryImage(selectedItem)}
                alt={selectedItem.name_ar}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => { setSelectedItem(null); setSelectedImageIndex(0); }}
                className="absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* شارة العرض */}
              {selectedItem.has_offer && selectedItem.offer_price && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Percent className="w-5 h-5" />
                  <span className="font-bold">
                    خصم {Math.round((1 - selectedItem.offer_price / selectedItem.price) * 100)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* معرض الصور - الضغط على صورة يعرضها كرئيسية */}
            {selectedItem.images && selectedItem.images.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
                {selectedItem.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                      selectedImageIndex === idx 
                        ? 'ring-2 ring-[#d4a574] ring-offset-2' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt={`${selectedItem.name_ar} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{selectedItem.name_ar}</h2>
              {selectedItem.description_ar && (
                <p className="text-gray-600 mb-4">{selectedItem.description_ar}</p>
              )}
              {selectedItem.ingredients_ar && (
                <div className="mb-4 bg-amber-50 p-3 rounded-xl">
                  <h4 className="font-semibold mb-2 text-amber-800">المكونات:</h4>
                  <p className="text-amber-700 text-sm">{selectedItem.ingredients_ar}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-6">
                {selectedItem.has_offer && selectedItem.offer_price ? (
                  <div>
                    <span className="text-lg text-gray-400 line-through block">{selectedItem.price.toLocaleString()} د.ع</span>
                    <span className="text-3xl font-bold text-red-500">{selectedItem.offer_price.toLocaleString()} د.ع</span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-[#d4a574]">{selectedItem.price.toLocaleString()} د.ع</span>
                )}
                <button
                  onClick={() => {
                    addToCart(selectedItem);
                    setSelectedItem(null);
                    setSelectedImageIndex(0);
                  }}
                  className="bg-[#d4a574] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#b8956a] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  أضف للطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">سلة الطلب</h2>
              <button onClick={() => setShowCart(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {orderSubmitted ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-600 mb-2">تم إرسال طلبك بنجاح!</h3>
                <p className="text-gray-600">سيتم تحضير طلبك في أقرب وقت</p>
              </div>
            ) : (
              <>
                <div className="p-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl">
                      <div className="relative w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {getPrimaryImage(item.menuItem) ? (
                          <Image src={getPrimaryImage(item.menuItem)!} alt={item.menuItem.name_ar} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.menuItem.name_ar}</h4>
                        <p className="text-[#d4a574] font-bold">{(item.menuItem.price * item.quantity).toLocaleString()} د.ع</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="w-8 h-8 bg-[#d4a574] text-white rounded-full flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.menuItem.id)} className="text-red-500">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t space-y-4">
                  <input
                    type="number"
                    placeholder="رقم الطاولة"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                  />
                  <input
                    type="text"
                    placeholder="الاسم (اختياري)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف (اختياري)"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                    dir="ltr"
                  />
                  <textarea
                    placeholder="ملاحظات إضافية"
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none"
                    rows={2}
                  />
                </div>

                <div className="sticky bottom-0 bg-white p-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg">المجموع:</span>
                    <span className="text-2xl font-bold text-[#d4a574]">{cartTotal.toLocaleString()} د.ع</span>
                  </div>
                  <button
                    onClick={submitOrder}
                    disabled={cart.length === 0}
                    className="w-full bg-[#d4a574] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#b8956a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    إرسال الطلب
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer - متوافق مع الجوال */}
      <footer className="bg-[#2d2d2d] text-white py-2 sm:py-3 mt-auto">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
            {/* معلومات التواصل */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#d4a574]" />
                <span className="text-[11px] sm:text-sm">{settings?.address || 'البصرة الجزائر'}</span>
              </div>
              {settings?.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-1 hover:text-[#d4a574] transition-colors">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-[#d4a574]" />
                  <span dir="ltr" className="text-[11px] sm:text-sm">{settings.phone}</span>
                </a>
              )}
              {settings?.working_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-[#d4a574]" />
                  <span className="text-[11px] sm:text-sm">{settings.working_hours}</span>
                </div>
              )}
            </div>
            
            {/* حقوق النشر */}
            <p className="text-[10px] sm:text-xs text-gray-500">&copy; {new Date().getFullYear()} {settings?.restaurant_name || 'محشي البغدادي'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
