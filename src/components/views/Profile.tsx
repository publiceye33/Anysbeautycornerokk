import React, { useState, useEffect } from 'react';
import { database, auth, googleProvider } from '@/src/lib/firebase';
import { ref, get, set, update, onValue } from 'firebase/database';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useStore } from '@/src/lib/store';
import { useRouter } from '@/src/lib/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  Bell, 
  LogOut, 
  Check, 
  ChevronRight, 
  Eye, 
  Loader2, 
  Save, 
  CheckCircle, 
  Calendar, 
  ArrowLeft,
  X,
  Package,
  Info
} from 'lucide-react';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';

interface ProfileProps {
  initialTab?: 'info' | 'orders' | 'notifications';
}

export default function ProfileView({ initialTab = 'info' }: ProfileProps) {
  const { user, setUser } = useStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'notifications'>(initialTab);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Profile fields state
  const [profileData, setProfileData] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    deliveryLocation: 'insideDhaka',
    outsideDhakaLocation: '',
  });

  // Orders and notifications lists state
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Status state for alerts/toasts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle setting active tab from props when url hash changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Google Sign-In Trigger
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      setUser(userData);

      // Check / Create User in db
      const userRef = ref(database, `users/${result.user.uid}`);
      const userSnap = await get(userRef);
      if (!userSnap.exists()) {
        await set(userRef, {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Login failed:", e);
      setErrorMsg('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  // Google Sign-Out Trigger
  const handleLogout = async () => {
    if (confirm('আপনি কি লগআউট করতে চান?')) {
      await signOut(auth);
      setUser(null);
      router.push('/');
    }
  };

  // Load User details and Profile information
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const profileRef = ref(database, `users/${user.uid}/profile`);
    
    get(profileRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfileData({
          name: data.name || user.displayName || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          deliveryLocation: data.deliveryLocation || 'insideDhaka',
          outsideDhakaLocation: data.outsideDhakaLocation || '',
        });
      } else {
        // Fallback to auth details
        setProfileData(prev => ({
          ...prev,
          name: user.displayName || '',
        }));
      }
    }).catch(err => {
      console.error("Error loading user profile:", err);
    }).finally(() => {
      setProfileLoading(false);
    });

    // Sub to notifications in Realtime
    const notificationsRef = ref(database, `users/${user.uid}/notifications`);
    const unsubNotifications = onValue(notificationsRef, (snapshot) => {
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
    });

    return () => {
      unsubNotifications();
    };
  }, [user]);

  // Load User Orders List when Orders tab is active
  useEffect(() => {
    if (!user || activeTab !== 'orders') return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const userOrdersRef = ref(database, `users/${user.uid}/orders`);
        const snapshot = await get(userOrdersRef);
        
        if (snapshot.exists()) {
          const keys = Object.keys(snapshot.val());
          
          const promises = keys.map(async (key) => {
            const orderRef = ref(database, `orders/${key}`);
            const snap = await get(orderRef);
            if (snap.exists()) {
              return { id: key, ...snap.val() };
            }
            return null;
          });

          const results = await Promise.all(promises);
          const validOrders = results.filter(o => o !== null);
          validOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
          setOrders(validOrders);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Error loading profile orders:", err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user, activeTab]);

  // Handle Profiles changes submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const profileRef = ref(database, `users/${user.uid}/profile`);
      await set(profileRef, {
        ...profileData,
        updatedAt: new Date().toISOString(),
      });
      
      setSuccessMsg('প্রোফাইল তথ্য সফলভাবে সেভ করা হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setErrorMsg('প্রোফাইল সেভ করার সময় একটি ত্রুটি ঘটেছে।');
    } finally {
      setSavingProfile(false);
    }
  };

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

  const getStatusText = (status: string) => {
    const s: Record<string, string> = { 
      processing: 'প্রসেসিং', 
      confirmed: 'কনফার্মড', 
      packaging: 'প্যাকেজিং', 
      shipped: 'শিপড', 
      delivered: 'ডেলিভার্ড' 
    };
    return s[status] || 'প্রসেসিং';
  };

  const getStatusColor = (status: string) => {
    const c: Record<string, string> = { 
      processing: 'bg-amber-50 text-amber-700 border-amber-200/60', 
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200/60', 
      packaging: 'bg-purple-50 text-purple-700 border-purple-200/60', 
      shipped: 'bg-sky-50 text-sky-700 border-sky-200/60', 
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
    };
    return c[status] || c.processing;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto p-4 max-w-5xl pt-16 pb-12 text-gray-800 font-sans">
      <LoadingScreen isLoading={profileLoading} />

      {/* Header Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => router.back()} 
          className="p-1 px-2.5 bg-white hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 border text-xs font-bold transition flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> পিছনে
        </button>
        <span className="text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-500 font-bold">আমার প্রোফাইল</span>
      </div>

      {!user ? (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md mx-auto space-y-6 mt-10">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-rose-955 mb-2 font-serif italic">আমার প্রোফাইল</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              আপনার প্রোফাইল পরিচালনা করতে, অতীত অর্ডারের ইতিহাস দেখতে এবং রিয়েল-টাইম অর্ডার নোটিফিকেশন পেতে অনুগ্রহ করে লগইন করুন।
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100/80 shadow-xs flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-500/20 shadow-xs group-hover:border-rose-500 transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-500 font-bold text-3xl">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </div>
              <h2 className="font-bold text-gray-950 text-base line-clamp-1">{profileData.name || user.displayName}</h2>
              <p className="text-[10px] text-gray-400 font-medium truncate max-w-full mb-4">{user.email}</p>
              
              <button 
                onClick={handleLogout}
                className="w-full py-2 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                লগআউট করুন
              </button>
            </div>

            {/* Navigation Tabs List */}
            <div className="bg-white p-2.5 rounded-3xl border border-gray-100/90 shadow-2xs space-y-1">
              <button 
                onClick={() => { setActiveTab('info'); router.push('/profile'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition text-left ${activeTab === 'info' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10' : 'text-gray-700 hover:bg-rose-50/50 hover:text-rose-600'}`}
              >
                <User className="w-4 h-4" />
                <span>আমার প্রোফাইল</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
              </button>
              
              <button 
                onClick={() => { setActiveTab('orders'); router.push('/profile'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition text-left relative ${activeTab === 'orders' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10' : 'text-gray-700 hover:bg-rose-50/50 hover:text-rose-600'}`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>অর্ডার ইতিহাস</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
              </button>

              <button 
                onClick={() => { setActiveTab('notifications'); router.push('/notifications'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition text-left relative ${activeTab === 'notifications' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10' : 'text-gray-700 hover:bg-rose-50/50 hover:text-rose-600'}`}
              >
                <Bell className="w-4 h-4" />
                <span>নোটিফিকেশন</span>
                {unreadCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${activeTab === 'notifications' ? 'bg-white text-rose-500' : 'bg-rose-500 text-white'} ml-auto`}>
                    {toBengaliNumber(unreadCount)}
                  </span>
                )}
                {unreadCount === 0 && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Alerts Feedback */}
            <AnimatePresence>
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  <Info className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB CONTENT: Personal Profile Information Form */}
            {activeTab === 'info' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-extrabold text-gray-850 mb-1 border-b pb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-rose-500" />
                  প্রোফাইল সংশোধন করুন
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6 mt-1 font-bold">Personal & Billing Details</p>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-2">আপনার পুরো নাম</label>
                      <input 
                        type="text" 
                        required
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full p-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white outline-none transition font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-2">মোবাইল নম্বর</label>
                      <input 
                        type="tel" 
                        pattern="01[3-9][0-9]{8}"
                        placeholder="01XXXXXXXXX"
                        value={profileData.phoneNumber}
                        onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                        className="w-full p-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white outline-none transition font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-650 mb-2">ডেলিভারি ঠিকানা</label>
                    <textarea 
                      rows={3}
                      value={profileData.address}
                      placeholder="গ্রাম/রোড, পোস্ট অফিস, থানা, জেলা"
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="w-full p-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white outline-none transition font-bold text-xs"
                    />
                  </div>

                  <div className="border-t border-gray-150/40 pt-5">
                    <label className="block text-xs font-bold text-gray-650 mb-3">ডেলিভারি এলাকা অগ্রাধিকার</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className={`flex-1 flex items-center p-4 border rounded-2xl cursor-pointer transition ${profileData.deliveryLocation === 'insideDhaka' ? 'border-rose-500 bg-rose-500/5' : 'border-gray-200/80 hover:bg-gray-50'}`}>
                        <input 
                          type="radio" 
                          name="deliveryLocation" 
                          checked={profileData.deliveryLocation === 'insideDhaka'}
                          onChange={() => setProfileData({ ...profileData, deliveryLocation: 'insideDhaka' })}
                          className="w-4 h-4 text-rose-500 accent-rose-500 mr-3" 
                        />
                        <div>
                          <span className="block font-bold text-xs text-gray-800">ঢাকার ভেতরে</span>
                          <span className="text-[10px] text-gray-500">হোম ডেলিভারি (৭০৳)</span>
                        </div>
                      </label>
                      <label className={`flex-1 flex items-center p-4 border rounded-2xl cursor-pointer transition ${profileData.deliveryLocation === 'outsideDhaka' ? 'border-rose-500 bg-rose-500/5' : 'border-gray-200/80 hover:bg-gray-50'}`}>
                        <input 
                          type="radio" 
                          name="deliveryLocation" 
                          checked={profileData.deliveryLocation === 'outsideDhaka'}
                          onChange={() => setProfileData({ ...profileData, deliveryLocation: 'outsideDhaka' })}
                          className="w-4 h-4 text-rose-500 accent-rose-500 mr-3" 
                        />
                        <div>
                          <span className="block font-bold text-xs text-gray-800">ঢাকার বাইরে</span>
                          <span className="text-[10px] text-gray-500">হোম ডেলিভারি (১৬০৳)</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {profileData.deliveryLocation === 'outsideDhaka' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl"
                    >
                      <label className="block text-xs font-bold text-amber-900 mb-2">জেলা ও থানা</label>
                      <input 
                        type="text" 
                        placeholder="উদা: চট্টগ্রাম সদর"
                        value={profileData.outsideDhakaLocation}
                        onChange={(e) => setProfileData({ ...profileData, outsideDhakaLocation: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-200/80 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition font-bold text-xs"
                      />
                    </motion.div>
                  )}

                  <div className="border-t border-gray-150/40 pt-6 flex justify-end">
                    <button 
                      type="submit"
                      disabled={savingProfile}
                      className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs px-6 py-3 flex items-center gap-2 shadow-lg shadow-rose-500/20 hover:shadow-rose-600/30 transition disabled:opacity-55 active:scale-95"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          সেভ হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          প্রোফাইল সেভ করুন
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: Orders History and Details Trigger */}
            {activeTab === 'orders' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-extrabold text-gray-850 mb-1 border-b pb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-rose-500" />
                  আমার অর্ডার ইতিহাস
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6 mt-1 font-bold">Your Order History & Statuses</p>

                {ordersLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                    <span className="text-gray-400 font-bold text-xs">অর্ডার লোড হচ্ছে...</span>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map((order) => {
                      const itemCount = (order.cartItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => router.push(`/order-track?orderId=${order.orderId || order.id}`)}
                          className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-rose-200 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                        >
                          {/* Background Accent Decor */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none" />

                          <div>
                            <div className="flex justify-between items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                              <div>
                                <span className="font-extrabold text-gray-900 text-sm tracking-tight group-hover:text-rose-500 transition-colors">
                                  #{toBengaliNumber(order.orderId || order.id)}
                                </span>
                                <span className="text-[9px] text-gray-400 block font-bold font-mono mt-0.5">
                                  {new Date(order.orderDate).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide border ${getStatusColor(order.status)} shrink-0`}>
                                {getStatusText(order.status)}
                              </span>
                            </div>

                            {/* Images of order items */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                {(order.cartItems || []).slice(0, 4).map((item: any, idx: number) => (
                                  <div key={idx} className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-200/80 p-0.5 flex items-center justify-center">
                                    <img 
                                      src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/50'} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover rounded" 
                                    />
                                  </div>
                                ))}
                                {(order.cartItems || []).length > 4 && (
                                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-[9px] font-black text-gray-500">
                                    +{toBengaliNumber((order.cartItems || []).length - 4)}
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                                {toBengaliNumber(itemCount)}টি পণ্য
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 block uppercase tracking-widest">সর্বমোট মূল্য</span>
                              <span className="text-[13px] font-black text-rose-955 tracking-tight">
                                {toBengaliNumber(order.totalAmount)} ৳
                              </span>
                            </div>

                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/order-track?orderId=${order.orderId || order.id}`);
                              }}
                              className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg active:scale-95 transition"
                            >
                              <Eye className="w-3 h-3" />
                              বিস্তারিত
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <p className="text-gray-500 font-bold text-xs">আপনার কোনো পেমেন্ট বা অর্ডার তথ্য পাওয়া যায়নি।</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Notifications Alerts list */}
            {activeTab === 'notifications' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-850 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-rose-500" />
                      আমার নোটিফিকেশনসমূহ
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">Live Order Status Alerts</p>
                  </div>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl font-bold text-[10px] uppercase tracking-wide transition self-start sm:self-center"
                    >
                      সবগুলো পড়া হয়েছে হিসেবে চিহ্নিত করুন
                    </button>
                  )}
                </div>

                <div className="mt-6 space-y-3">
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
                        <Bell className="w-6 h-6" />
                      </div>
                      <p className="text-gray-500 font-bold text-xs">আপনার কোনো নোটিফিকেশন নেই।</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
