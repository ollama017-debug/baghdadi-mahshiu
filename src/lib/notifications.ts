// نظام إشعارات المتصفح

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('هذا المتصفح لا يدعم الإشعارات');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon.png',
      badge: '/icon.png',
      dir: 'rtl',
      lang: 'ar',
      ...options,
    });

    // إغلاق الإشعار بعد 5 ثواني
    setTimeout(() => notification.close(), 5000);

    // عند النقر على الإشعار
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // تجاهل الخطأ إذا لم يتم تشغيل الصوت
    });
  } catch (error) {
    // تجاهل الخطأ
  }
};
