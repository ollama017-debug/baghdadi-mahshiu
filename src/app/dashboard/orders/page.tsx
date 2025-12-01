'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, Order, OrderItem } from '@/lib/supabase';
import { ClipboardList, Eye, X, Phone, User, Hash, Clock, ChefHat, Bell, BellRing } from 'lucide-react';
import { requestNotificationPermission, showNotification, playNotificationSound } from '@/lib/notifications';

interface OrderWithItems extends Order {
  items: (OrderItem & { menu_item: { name_ar: string; price: number } })[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousOrdersCount = useRef(0);

  useEffect(() => {
    // طلب إذن الإشعارات
    requestNotificationPermission().then(granted => {
      setNotificationsEnabled(granted);
    });
    
    fetchOrders();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        // إشعار بطلب جديد
        if (notificationsEnabled) {
          const newOrder = payload.new as Order;
          showNotification('طلب جديد! 🍗', {
            body: `طاولة ${newOrder.table_number || 'بدون رقم'} - ${newOrder.total_amount?.toLocaleString()} د.ع`,
            tag: 'new-order',
          });
          playNotificationSound();
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationsEnabled]);

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      showNotification('تم تفعيل الإشعارات! 🔔', {
        body: 'ستصلك إشعارات عند وصول طلبات جديدة',
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            menu_item:menu_items(name_ar, price)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: status as Order['status'] } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: status as Order['status'] });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('حدث خطأ أثناء تحديث الطلب');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const filteredOrders = filterStatus
    ? orders.filter(o => o.status === filterStatus)
    : orders;

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
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
        <h1 className="text-lg sm:text-2xl font-bold">إدارة الطلبات</h1>
        
        {/* زر تفعيل الإشعارات */}
        <button
          onClick={enableNotifications}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base ${
            notificationsEnabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          {notificationsEnabled ? (
            <>
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">الإشعارات مفعلة</span>
              <span className="sm:hidden">مفعلة</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">تفعيل الإشعارات</span>
              <span className="sm:hidden">تفعيل</span>
            </>
          )}
        </button>
      </div>

      {/* Status Filters - متوافق مع الجوال */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-3 sm:pb-4 mb-4 sm:mb-6 scrollbar-hide">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap transition-colors text-xs sm:text-sm ${
            filterStatus === '' ? 'bg-[#d4a574] text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          الكل ({statusCounts.all})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap transition-colors text-xs sm:text-sm ${
            filterStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          انتظار ({statusCounts.pending})
        </button>
        <button
          onClick={() => setFilterStatus('preparing')}
          className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap transition-colors text-xs sm:text-sm ${
            filterStatus === 'preparing' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          }`}
        >
          تحضير ({statusCounts.preparing})
        </button>
        <button
          onClick={() => setFilterStatus('ready')}
          className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap transition-colors text-xs sm:text-sm ${
            filterStatus === 'ready' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          جاهز ({statusCounts.ready})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full whitespace-nowrap transition-colors text-xs sm:text-sm ${
            filterStatus === 'completed' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          مكتمل ({statusCounts.completed})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
          <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-500 mb-2">لا توجد طلبات</h3>
          <p className="text-gray-400 text-sm sm:text-base">ستظهر الطلبات هنا عندما يقوم الزبائن بالطلب</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden border-r-4 ${getStatusColor(order.status).split(' ')[2]}`}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {order.table_number && (
                      <span className="bg-[#2d2d2d] text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-bold">
                        طاولة {order.table_number}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {order.customer_name && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 mb-1">
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">{order.customer_name}</span>
                  </div>
                )}

                <div className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-1">
                  {order.items?.slice(0, 2).map((item, i) => (
                    <span key={item.id}>
                      {item.menu_item?.name_ar} ({item.quantity})
                      {i < Math.min(order.items.length - 1, 1) && '، '}
                    </span>
                  ))}
                  {order.items?.length > 2 && <span>... +{order.items.length - 2}</span>}
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold text-[#d4a574]">{order.total_amount?.toLocaleString()} د.ع</span>
                </div>

                {/* Quick Status Buttons - متوافق مع الجوال */}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="flex-1 py-1.5 sm:py-2 bg-blue-100 text-blue-800 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        بدء التحضير
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="flex-1 py-1.5 sm:py-2 bg-green-100 text-green-800 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        جاهز
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="flex-1 py-1.5 sm:py-2 bg-gray-100 text-gray-800 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        تم التسليم
                      </button>
                    )}
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-800 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal - متوافق مع الجوال */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-3 sm:p-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">تفاصيل الطلب</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {selectedOrder.table_number && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500">رقم الطاولة</p>
                      <p className="font-bold text-sm sm:text-base">{selectedOrder.table_number}</p>
                    </div>
                  </div>
                )}
                {selectedOrder.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500">اسم الزبون</p>
                      <p className="font-bold text-sm sm:text-base truncate">{selectedOrder.customer_name}</p>
                    </div>
                  </div>
                )}
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500">رقم الهاتف</p>
                      <p className="font-bold text-sm sm:text-base" dir="ltr">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500">وقت الطلب</p>
                    <p className="font-bold text-xs sm:text-base">{new Date(selectedOrder.created_at).toLocaleString('ar-IQ')}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">حالة الطلب</p>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {['pending', 'preparing', 'ready', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                        selectedOrder.status === status
                          ? getStatusColor(status)
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">الأصناف المطلوبة</p>
                <div className="space-y-2 sm:space-y-3">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-xl">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#d4a574]/20 rounded-lg flex items-center justify-center">
                          <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4a574]" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm sm:text-base">{item.menu_item?.name_ar}</p>
                          <p className="text-xs sm:text-sm text-gray-500">الكمية: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-bold text-[#d4a574] text-sm sm:text-base">
                        {(item.unit_price * item.quantity).toLocaleString()} د.ع
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">ملاحظات</p>
                  <p className="bg-yellow-50 p-2 sm:p-3 rounded-xl text-xs sm:text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t">
                <span className="text-base sm:text-lg font-semibold">المجموع الكلي</span>
                <span className="text-xl sm:text-2xl font-bold text-[#d4a574]">
                  {selectedOrder.total_amount?.toLocaleString()} د.ع
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
