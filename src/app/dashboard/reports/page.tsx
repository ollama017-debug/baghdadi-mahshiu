'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, ShoppingBag, Clock, Calendar, ChefHat, Star, X } from 'lucide-react';

interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
}

interface CategoryStat {
  category_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface ItemStat {
  item_name: string;
  total_quantity: number;
  total_revenue: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [topItems, setTopItems] = useState<ItemStat[]>([]);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    if (period === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(end.getDate() - 30);
    } else {
      start.setDate(end.getDate() - 365);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchReports = async () => {
    try {
      const { start, end } = getDateRange();

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      if (orders) {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        setStats({
          totalOrders: orders.length,
          totalRevenue,
          avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
          completedOrders,
          cancelledOrders,
        });

        const dailyMap = new Map<string, { orders: number; revenue: number }>();
        orders.forEach(order => {
          const date = new Date(order.created_at).toLocaleDateString('ar-IQ');
          const existing = dailyMap.get(date) || { orders: 0, revenue: 0 };
          dailyMap.set(date, {
            orders: existing.orders + 1,
            revenue: existing.revenue + (order.total_amount || 0),
          });
        });

        const dailyArray = Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-10);

        setDailyStats(dailyArray);
      }

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(
          `
          *,
          menu_item:menu_items(name_ar, category:categories(id, name_ar)),
          order:orders!inner(created_at)
        `
        )
        .gte('order.created_at', start)
        .lte('order.created_at', end);

      if (orderItems) {
        const categoryMap = new Map<string, { quantity: number; revenue: number; category_name: string }>();
        const itemMap = new Map<string, { quantity: number; revenue: number; name: string }>();

        for (const item of orderItems) {
          if (item.menu_item?.category) {
            const category = item.menu_item.category;
            const existing = categoryMap.get(category.id) || {
              quantity: 0,
              revenue: 0,
              category_name: category.name_ar,
            };
            categoryMap.set(category.id, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + item.unit_price * item.quantity,
              category_name: category.name_ar,
            });
          }

          if (item.menu_item?.name_ar) {
            const existing = itemMap.get(item.menu_item_id) || {
              quantity: 0,
              revenue: 0,
              name: item.menu_item.name_ar,
            };
            itemMap.set(item.menu_item_id, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + item.unit_price * item.quantity,
              name: item.menu_item.name_ar,
            });
          }
        }

        setCategoryStats(
          Array.from(categoryMap.values())
            .map(v => ({
              category_name: v.category_name,
              total_quantity: v.quantity,
              total_revenue: v.revenue,
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
        );

        setTopItems(
          Array.from(itemMap.values())
            .map(v => ({
              item_name: v.name,
              total_quantity: v.quantity,
              total_revenue: v.revenue,
            }))
            .sort((a, b) => b.total_quantity - a.total_quantity)
            .slice(0, 10)
        );
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxDailyRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);
  const maxDailyOrders = Math.max(...dailyStats.map(d => d.orders), 1);
  const maxCategoryRevenue = Math.max(...categoryStats.map(c => c.total_revenue), 1);
  const maxItemQuantity = Math.max(...topItems.map(i => i.total_quantity), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              period === 'week'
                ? 'bg-[#d4a574] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              period === 'month'
                ? 'bg-[#d4a574] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            آخر 30 يوم
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              period === 'year'
                ? 'bg-[#d4a574] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            آخر سنة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">إجمالي الطلبات</p>
          <p className="text-3xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">إجمالي الإيرادات</p>
          <p className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()} د.ع</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">متوسط قيمة الطلب</p>
          <p className="text-3xl font-bold">{Math.round(stats.avgOrderValue).toLocaleString()} د.ع</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">الطلبات المكتملة</p>
          <p className="text-3xl font-bold">{stats.completedOrders}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#d4a574]" />
            الطلبات اليومية
          </h3>
          <div className="space-y-3">
            {dailyStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              dailyStats.map((day, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{day.date}</span>
                    <span className="text-gray-600">{day.orders} طلب</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                      style={{ width: `${(day.orders / maxDailyOrders) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#d4a574]" />
            الإيرادات اليومية
          </h3>
          <div className="space-y-3">
            {dailyStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              dailyStats.map((day, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{day.date}</span>
                    <span className="text-gray-600">{day.revenue.toLocaleString()} د.ع</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-green-500 to-green-600 rounded-lg transition-all duration-500"
                      style={{ width: `${(day.revenue / maxDailyRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-[#d4a574]" />
            المبيعات حسب القسم
          </h3>
          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{cat.category_name}</span>
                    <span className="text-gray-600">{cat.total_revenue.toLocaleString()} د.ع</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-purple-500 to-purple-600 rounded-lg transition-all duration-500"
                      style={{ width: `${(cat.total_revenue / maxCategoryRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#d4a574]" />
            أكثر الأطباق مبيعاً
          </h3>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              topItems.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 truncate">{item.item_name}</span>
                    <span className="text-gray-600 flex-shrink-0 mr-2">{item.total_quantity} وحدة</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 rounded-lg transition-all duration-500"
                      style={{ width: `${(item.total_quantity / maxItemQuantity) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {stats.cancelledOrders > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-900">الطلبات الملغاة</h3>
              <p className="text-sm text-red-700">تم إلغاء {stats.cancelledOrders} طلب خلال الفترة المحددة</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
