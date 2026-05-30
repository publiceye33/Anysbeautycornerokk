import React, { useState, useEffect } from 'react';
import { database, auth, googleProvider } from '@/src/lib/firebase';
import { ref, get, set, update, onValue } from 'firebase/database';
import { signInWithRedirect } from 'firebase/auth';
import { useStore } from '@/src/lib/store';
import { useRouter } from '@/src/lib/navigation';
import { 
  Bell, 
  ArrowLeft,
  ChevronRight,
  Info,
  User,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';

export default function NotificationsView() {
  const { user, setUser } = useStore();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsRef = ref(database, `users/${user.uid}/notifications`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(list);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error loading notifications:", err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Mark single notification as read
  const markAsRead = async (notifId: string) => {
    if (!user) return;
    try {
      const notifRef = ref(database, `users/${user.uid}/notifications/${notifId}`);
      await update(notifRef, { read: true });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const updates: Record<string, any> = {};
    notifications.forEach(n => {
      if (!n.read) {
        updates[`users/${user.uid}/notifications/${n.id}/read`] = true;
      }
    });

    if (Object.keys(updates).length === 0) return;

    try {
      await update(ref(database), updates);
    } catch (e) {
      console.error("Error marking all notifications read:", e);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    if (confirm('আপনি কি সব নোটিফিকেশন মুছে ফেলতে চান?')) {
      try {
        const notificationsRef = ref(database, `users/${user.uid}/notifications`);
        await set(notificationsRef, null);
      } catch (e) {
        console.error("Error clearing notifications:", e);
      }
    }
  };

  // Google Sign-In Trigger
  const handleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto p-4 max-w-3xl pt-16 pb-12 text-gray-800 font-sans">
      <LoadingScreen isLoading={loading} />

      {/* Header Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => router.back()} 
          className="p-1 px-2.5 bg-white hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 border text-xs font-bold transition flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> পিছনে
        </button>
        <span className="text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-500 font-bold">নোটিফিকেশনসমূহ</span>
      </div>

      {!user ? (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md mx-auto space-y-6 mt-10">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-rose-955 mb-2 font-serif italic">নোটিফিকেশন</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              আপনার অর্ডারের তাৎক্ষণিক আপডেট এবং নোটিফিকেশন পেতে অনুগ্রহ করে গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
            </p>
          </div>
          <button 
            onClick={handleLogin} 
            className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <User className="w-4 h-4" />
            গুগল দিয়ে লগইন করুন
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-gray-850 flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-500" />
                আমার নোটিফিকেশনসমূহ
              </h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">Live Order Status Alerts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl font-bold text-[10px] transition"
                >
                  সবগুলো পড়া হয়েছে
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl font-bold text-[10px] flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> সবগুলো মুছুন
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    router.push(`/order-track?orderId=${notif.orderId}`);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 relative overflow-hidden group hover:shadow-xs ${notif.read ? 'bg-gray-50 border-gray-250/30' : 'bg-rose-500/5 border-rose-200/70'}`}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  )}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${notif.read ? 'bg-gray-100 text-gray-400' : 'bg-rose-100 text-rose-600'}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${notif.read ? 'text-gray-500 font-medium' : 'text-gray-800 font-black'} break-words`}>
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-gray-400 font-bold tracking-tight block mt-1">
                      {new Date(notif.timestamp).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <CheckCircle2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-bold text-xs">আপনার কোনো নোটিফিকেশন নেই।</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
