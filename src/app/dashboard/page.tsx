'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FolderOpen, UtensilsCrossed, ClipboardList, TrendingUp, ArrowUpLeft, ChefHat } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    categories: 0,
    items: 0,
    pendingOrders: 0,
    todayOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Count categories
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      // Count menu items
      const { count: itemsCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true });

      // Count pending orders
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        categories: categoriesCount || 0,
        items: itemsCount || 0,
        pendingOrders: pendingCount || 0,
        todayOrders: todayCount || 0,
      });

      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            menu_item:menu_items(name_ar)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'preparing': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ready': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'completed': return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statsCards = [
    {
      label: 'الأقسام',
      value: stats.categories,
      icon: FolderOpen,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      label: 'الأطباق',
      value: stats.items,
      icon: UtensilsCrossed,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      label: 'طلبات قيد الانتظار',
      value: stats.pendingOrders,
      icon: ClipboardList,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      label: 'طلبات اليوم',
      value: stats.todayOrders,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center`}>
                <stat.icon className={`w-7 h-7 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link 
          href="/dashboard/categories" 
          className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#d4a574]/30 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4a574] to-[#b8956a] rounded-xl flex items-center justify-center shadow-lg shadow-[#d4a574]/20">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <ArrowUpLeft className="w-5 h-5 text-gray-300 group-hover:text-[#d4a574] transition-colors" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">إدارة الأقسام</h3>
          <p className="text-sm text-gray-500">إضافة وتعديل أقسام القائمة</p>
        </Link>

        <Link 
          href="/dashboard/items" 
          className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#d4a574]/30 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4a574] to-[#b8956a] rounded-xl flex items-center justify-center shadow-lg shadow-[#d4a574]/20">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <ArrowUpLeft className="w-5 h-5 text-gray-300 group-hover:text-[#d4a574] transition-colors" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">إدارة الأطباق</h3>
          <p className="text-sm text-gray-500">إضافة وتعديل الأطباق والأسعار</p>
        </Link>

        <Link 
          href="/dashboard/orders" 
          className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#d4a574]/30 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4a574] to-[#b8956a] rounded-xl flex items-center justify-center shadow-lg shadow-[#d4a574]/20">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <ArrowUpLeft className="w-5 h-5 text-gray-300 group-hover:text-[#d4a574] transition-colors" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">متابعة الطلبات</h3>
          <p className="text-sm text-gray-500">عرض وإدارة طلبات الزبائن</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-800">آخر الطلبات</h2>
            <p className="text-sm text-gray-500">متابعة أحدث الطلبات الواردة</p>
          </div>
          <Link 
            href="/dashboard/orders" 
            className="text-[#d4a574] text-sm font-medium hover:text-[#b8956a] transition-colors flex items-center gap-1"
          >
            عرض الكل
            <ArrowUpLeft className="w-4 h-4" />
          </Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-600 mb-1">لا توجد طلبات بعد</h3>
            <p className="text-sm text-gray-400">ستظهر الطلبات هنا عندما يقوم الزبائن بالطلب</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#d4a574]/10 rounded-xl flex items-center justify-center">
                      <span className="text-[#d4a574] font-bold text-sm">
                        {order.table_number || '#'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">
                        {order.table_number ? `طاولة ${order.table_number}` : 'بدون طاولة'}
                      </span>
                      {order.customer_name && (
                        <span className="text-gray-500 mr-2">• {order.customer_name}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mr-13 mb-2">
                  {order.items?.map((item: any) => item.menu_item?.name_ar).join('، ') || 'لا توجد عناصر'}
                </div>
                <div className="flex items-center justify-between text-sm mr-13">
                  <span className="text-gray-400">
                    {new Date(order.created_at).toLocaleString('ar-IQ')}
                  </span>
                  <span className="font-bold text-[#d4a574]">
                    {order.total_amount?.toLocaleString()} د.ع
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
