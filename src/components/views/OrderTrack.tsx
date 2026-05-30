import { useEffect, useState, Suspense } from 'react';
import { database, auth, googleProvider } from '@/src/lib/firebase';
import { ref, get } from 'firebase/database';
import { useStore } from '@/src/lib/store';
import { 
  X, Check, Package, Eye, ArrowLeft, Truck, Phone, MapPin, 
  Calendar, ShieldCheck, Clock, Clipboard, Sparkles, ShoppingBag, 
  HelpCircle, ChevronRight, AlertCircle, RefreshCw 
} from 'lucide-react';
import { signInWithRedirect } from 'firebase/auth';
import { useRouter, useSearchParams } from '@/src/lib/navigation';
import LoadingScreen from '@/src/components/LoadingScreen';
import { toBengaliNumber } from '@/src/lib/utils';
import { motion } from 'motion/react';

// Progress estimation helper
const getEstimatedDelivery = (orderDateString: string, isOutside: boolean) => {
  if (!orderDateString) return '';
  const date = new Date(orderDateString);
  const startDays = isOutside ? 3 : 1;
  const endDays = isOutside ? 5 : 3;
  
  const startDate = new Date(date.getTime() + startDays * 24 * 60 * 60 * 1000);
  const endDate = new Date(date.getTime() + endDays * 24 * 60 * 60 * 1000);
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const startStr = startDate.toLocaleDateString('bn-BD', options);
  const endStr = endDate.toLocaleDateString('bn-BD', options);
  
  return `${startStr} থেকে ${endStr}`;
};

function OrderTrackContent() {
  const { user, setUser } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get('orderId');

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleCloseModal = () => {
    if (urlOrderId) {
      router.push('/order-track');
    } else {
      setSelectedOrder(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let orderKeys: string[] = [];
      
      // 1. Always load local device orders (guest or signed-in fallback)
      const localKeys = JSON.parse(localStorage.getItem('myOrders') || '[]');
      localKeys.forEach((k: string) => {
        if (!orderKeys.includes(k)) {
          orderKeys.push(k);
        }
      });

      // 2. If user is logged in, also get their database linked orders
      if (user) {
        try {
          const userOrdersRef = ref(database, `users/${user.uid}/orders`);
          const userOrdersSnapshot = await get(userOrdersRef);
          if (userOrdersSnapshot.exists()) {
            const dbKeys = Object.keys(userOrdersSnapshot.val());
            dbKeys.forEach((k) => {
              if (!orderKeys.includes(k)) {
                orderKeys.push(k);
              }
            });
          }
        } catch (dbErr) {
          console.warn("Could not query account orders from database:", dbErr);
        }
      }

      // If a specific URL orderId is requested but not in the keys, add it so we fetch it
      if (urlOrderId && !orderKeys.includes(urlOrderId)) {
        orderKeys.push(urlOrderId);
      }

      // 3. Fetch each order key in parallel securely from `orders/${key}`
      const fetchedOrders: any[] = [];
      if (orderKeys.length > 0) {
        const fetchPromises = orderKeys.map(async (key) => {
          try {
            const orderRef = ref(database, `orders/${key}`);
            const orderSnap = await get(orderRef);
            if (orderSnap.exists()) {
              return { id: key, ...orderSnap.val() };
            }
          } catch (err) {
            console.warn(`Could not fetch order ${key}:`, err);
          }
          return null;
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(order => {
          if (order) fetchedOrders.push(order);
        });
      }

      // Apply safe user/local authenticity filter to prevent key enumeration attacks
      const myOrderList = fetchedOrders.filter(o => {
        if (localKeys.includes(o.id) || localKeys.includes(o.orderId)) {
          return true;
        }
        if (user && (o.userId === user.uid || o.customerEmail === user.email || o.userEmail === user.email)) {
          return true;
        }
        if (urlOrderId && (o.orderId === urlOrderId || o.id === urlOrderId)) {
          return true;
        }
        return false;
      });

      myOrderList.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(myOrderList);
    } catch (e) {
      console.error("Error fetching secure orders track list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(fetchOrders, 0);
  }, [user]);

  useEffect(() => {
    if (!loading && orders.length > 0) {
      if (urlOrderId) {
        const order = orders.find(o => o.orderId === urlOrderId || o.id === urlOrderId);
        if (order) {
          setSelectedOrder(order);
        } else {
          setSelectedOrder(null);
        }
      } else {
        setSelectedOrder(null);
      }
    }
  }, [urlOrderId, loading, orders]);

  const handleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Steps matching the actual status keys
  const trackingSteps = [
    { key: 'processing', title: 'প্রসেসিং', desc: 'অর্ডারটি যাচাই করা হচ্ছে', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' },
    { key: 'confirmed', title: 'কনফার্মড', desc: 'অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে', icon: Check, color: 'text-blue-500', bg: 'bg-blue-500' },
    { key: 'packaging', title: 'প্যাকেজিং', desc: 'পণ্য প্যাকিং চলছে এবং ডেলিভারির জন্য প্রস্তুত হচ্ছে', icon: Package, color: 'text-purple-500', bg: 'bg-purple-500' },
    { key: 'shipped', title: 'শিপড', desc: 'কুরিয়ারে পার্সেলটি হস্তান্তর করা হয়েছে', icon: Truck, color: 'text-sky-500', bg: 'bg-sky-500' },
    { key: 'delivered', title: 'ডেলিভার্ড', desc: 'পার্সেলটি আপনার ঠিকানায় সঠিকভাবে পৌঁছেছে', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500' }
  ];

  const getStatusText = (status: string) => {
    const found = trackingSteps.find(s => s.key === status);
    return found ? found.title : 'প্রসেসিং';
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

  // Safe layout motion animation setups
  const pageVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl pb-24 pt-16 text-gray-800 font-sans">
      <LoadingScreen isLoading={loading} />

      {/* Header section when we are NOT viewing deep details of a specific order */}
      {!selectedOrder && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center bg-rose-50 rounded-full p-3 mb-3">
            <Clipboard className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-rose-955 font-serif italic mb-1">অর্ডার ট্র্যাকিং</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Your Order History & Live Tracking Status</p>
        </motion.div>
      )}

      {/* Main Area */}
      {!selectedOrder ? (
        // List View / Login View
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {/* Guest login block */}
          {!user && orders.length === 0 && !loading && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-850">আপনার অর্ডারগুলো ট্র্যাক করুন</h3>
                <p className="text-gray-500 text-xs leading-relaxed mt-2">
                  আপনার অর্ডারের কারেন্ট লাইভ লাইফ-সাইকেল ট্র্যাকিং এবং অতীত অর্ডারের তালিকা দেখতে গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
                </p>
              </div>
              <button 
                onClick={handleLogin} 
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                গুগল দিয়ে লগইন করুন
              </button>
            </div>
          )}

          {/* Render Active Order Cards */}
          {!loading && orders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  মোট অর্ডার: {toBengaliNumber(orders.length)}টি
                </span>
                <button 
                  onClick={fetchOrders} 
                  className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> রিফ্রেশ করুন
                </button>
              </div>

              <motion.div 
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {orders.map((order: any) => {
                  const itemCount = (order.cartItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                  const isOutside = order.deliveryLocation !== 'ঢাকার ভেতরে';
                  return (
                    <motion.div 
                      key={order.id} 
                      variants={cardVariants}
                      onClick={() => router.push(`/order-track?orderId=${order.orderId || order.id}`)}
                      className="bg-white rounded-2xl p-4 border border-gray-100/80 hover:border-rose-200/80 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Ambient Accent Glow */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

                      <div>
                        {/* Summary Header */}
                        <div className="flex justify-between items-start gap-4 mb-3 pb-3 border-b border-gray-50">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Package className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="font-extrabold text-gray-850 text-sm tracking-tight group-hover:text-rose-600 transition-colors">
                                #{toBengaliNumber(order.orderId || order.id)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(order.orderDate).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}</span>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${getStatusColor(order.status)} shrink-0`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>

                        {/* Product Images Preview strip */}
                        <div className="flex items-center justify-between mb-4 mt-2">
                          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            {(order.cartItems || []).slice(0, 4).map((item: any, itemIdx: number) => (
                              <div key={itemIdx} className="relative shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 p-0.5 flex items-center justify-center group-hover:border-rose-100/80 transition-colors">
                                <img 
                                  src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/50'} 
                                  alt={item.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover rounded-lg" 
                                />
                                {item.quantity > 1 && (
                                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-white shadow-xs">
                                    {toBengaliNumber(item.quantity)}
                                  </span>
                                )}
                              </div>
                            ))}
                            {(order.cartItems || []).length > 4 && (
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[9px] font-black text-gray-400">
                                +{toBengaliNumber((order.cartItems || []).length - 4)}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-xl">
                            {toBengaliNumber(itemCount)}টি আইটেম
                          </span>
                        </div>
                      </div>

                      {/* Footer Details */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50/80 mt-auto">
                        <div>
                          <span className="text-[8px] font-extrabold text-gray-400 block uppercase tracking-wider">সর্বমোট মূল্য</span>
                          <span className="text-sm font-black text-rose-955 tracking-tight">
                            {toBengaliNumber(order.totalAmount)} ৳
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-rose-500 group-hover:bg-rose-600 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl shadow-md shadow-rose-500/10 transition-all active:scale-95">
                          <span>ট্র্যাকিং দেখুন</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {user && !loading && orders.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <ShoppingBag className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-gray-500 font-bold text-xs">আপনার কোনো অর্ডার ইতিহাস পাওয়া যায়নি।</p>
            </div>
          )}
        </motion.div>
      ) : (
        // Dedicated Premium Tracking Statement View (Immersive Statement Screen)
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full"
        >
          {/* Back to Order List Controls */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={handleCloseModal}
              className="p-1 px-3 bg-white hover:bg-gray-50 rounded-xl text-gray-650 hover:text-gray-900 border border-gray-150/60 text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-rose-500" /> পিছনে যান
            </button>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400 animate-pulse" /> লাইভ ট্র্যাকিং রসিদ
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mb-8">
            
            {/* Header branding block matching ThankYou aesthetic */}
            <div className="bg-gradient-to-r from-rose-50/90 to-rose-50/10 p-5 md:p-6 border-b border-rose-100 flex flex-wrap gap-5 items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-500 tracking-widest uppercase block mb-1">অর্ডার আইডি</span>
                <span className="font-extrabold text-gray-950 text-base md:text-lg">#{toBengaliNumber(selectedOrder.orderId || selectedOrder.id)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 tracking-widest uppercase block mb-1">তারিখ</span>
                <span className="font-extrabold text-gray-800 text-xs md:text-sm">
                  {new Date(selectedOrder.orderDate).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 tracking-widest uppercase block mb-1">পেমেন্ট পদ্ধতি</span>
                <span className="font-extrabold text-gray-800 text-xs md:text-sm">
                  {selectedOrder.deliveryPaymentMethod === 'bkash' 
                    ? 'বিকাশ (ডেলিভারি চার্জ অগ্রিম)' 
                    : selectedOrder.deliveryPaymentMethod === 'nagad' 
                      ? 'নগদ (ডেলিভারি চার্জ অগ্রিম)' 
                      : 'ক্যাশ অন ডেলিভারি'}
                </span>
              </div>
            </div>

            {/* Estimated Delivery Status Banner */}
            <div className="p-4 bg-emerald-50/40 border-b border-emerald-100/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xs">
                <span className="font-medium text-gray-550">সম্ভাব্য ডেলিভারি তারিখ:</span>{' '}
                <span className="font-extrabold text-emerald-700">
                  {getEstimatedDelivery(selectedOrder.orderDate, selectedOrder.deliveryLocation !== 'ঢাকার ভেতরে')}
                </span>
              </div>
            </div>

            {/* Premium Progress Tracking Timeline Block */}
            <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-50">
              <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-6">লাইভ শিপমেন্ট টাইমলাইন</h4>
              
              {/* Responsive Steps Track: Horizontal on md/desktop, Vertical on mobile */}
              <div className="relative">
                {/* 1. Desktop Horizontal Tracker */}
                <div className="hidden md:flex justify-between items-start gap-4 relative z-10">
                  {trackingSteps.map((step, idx) => {
                    const statuses = trackingSteps.map(s => s.key);
                    const currentIndex = statuses.indexOf(selectedOrder.status || 'processing');
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    const isCompleted = idx < currentIndex;
                    const IconComp = step.icon;

                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 text-center relative">
                        {/* Glow Circle Accent */}
                        <div className="relative mb-2.5">
                          {isCurrent && (
                            <span className="absolute inset-0 bg-rose-400 rounded-full scale-150 animate-ping opacity-25" />
                          )}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                            isActive 
                              ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20' 
                              : 'bg-white text-gray-400 border-gray-200'
                          }`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : <IconComp className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold block mb-0.5 tracking-tight ${isActive ? 'text-rose-600' : 'text-gray-450'}`}>
                          {step.title}
                        </span>
                        <span className="text-[8px] text-gray-400 max-w-[90px] leading-normal font-medium">
                          {isCurrent ? step.desc : ''}
                        </span>
                      </div>
                    );
                  })}

                  {/* Horizontal Line connector */}
                  <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-gray-200 -z-0">
                    <div 
                      className="h-full bg-rose-500 transition-all duration-500 rounded-full" 
                      style={{ 
                        width: `${(trackingSteps.map(s => s.key).indexOf(selectedOrder.status || 'processing') / (trackingSteps.length - 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* 2. Mobile Vertical Tracker */}
                <div className="md:hidden flex flex-col space-y-6 relative pl-6">
                  {/* Vertical connector line */}
                  <div className="absolute top-2 bottom-2 left-[15px] w-[2px] bg-gray-200">
                    <div 
                      className="w-full bg-rose-500 transition-all duration-500 rounded-full origin-top" 
                      style={{ 
                        height: `${(trackingSteps.map(s => s.key).indexOf(selectedOrder.status || 'processing') / (trackingSteps.length - 1)) * 100}%` 
                      }}
                    />
                  </div>

                  {trackingSteps.map((step, idx) => {
                    const statuses = trackingSteps.map(s => s.key);
                    const currentIndex = statuses.indexOf(selectedOrder.status || 'processing');
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    const isCompleted = idx < currentIndex;
                    const IconComp = step.icon;

                    return (
                      <div key={idx} className="flex gap-4 items-start relative z-10 select-none">
                        {/* Circle node wrapper */}
                        <div className="relative">
                          {isCurrent && (
                            <span className="absolute inset-x-0 top-0 bg-rose-400 rounded-full scale-135 animate-ping opacity-25 w-[32px] h-[32px]" />
                          )}
                          <div className={`w-[32px] h-[32px] rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-all duration-300 ${
                            isActive 
                              ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/15' 
                              : 'bg-white text-gray-400 border-gray-200'
                          }`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : <IconComp className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        {/* Status Details */}
                        <div className="flex-1 py-0.5">
                          <h5 className={`text-xs font-black tracking-tight flex items-center gap-1.5 ${isActive ? 'text-gray-850' : 'text-gray-400'}`}>
                            {step.title}
                            {isCurrent && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-rose-500" />
                            )}
                          </h5>
                          {isActive && (
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5 font-medium">
                              {step.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Split layout: Customer info & Ordered items */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              
              {/* Product items statement (7 columns) */}
              <div className="p-5 md:p-6 md:col-span-7">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-4">অর্ডারকৃত প্রসাধন সামগ্রী</span>
                <div className="space-y-3.5 divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                  {(selectedOrder.cartItems || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3.5 items-center pt-3.5 first:pt-0 group">
                      <a href={`#/product/${item.id}`} className="block shrink-0">
                        <img 
                          src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/60'} 
                          alt={item.name} 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-xl border border-gray-100/80 group-hover:scale-105 transition-transform" 
                        />
                      </a>
                      <div className="flex-1 text-xs">
                        <a href={`#/product/${item.id}`}>
                          <h4 className="font-bold text-gray-850 line-clamp-1 group-hover:text-rose-600 transition-colors leading-tight">{item.name}</h4>
                        </a>
                        <p className="text-gray-450 mt-1 font-medium">{toBengaliNumber(item.quantity || 1)}টি × {toBengaliNumber(item.price)} ৳</p>
                      </div>
                      <div className="text-xs font-bold text-gray-950 shrink-0">
                        {toBengaliNumber(((item.quantity || 1) * item.price).toFixed(0))} ৳
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info & cost summary (5 columns) */}
              <div className="p-5 md:p-6 md:col-span-5 bg-rose-50/[5%] flex flex-col justify-between space-y-6">
                
                {/* Details list */}
                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">ডেলিভারি সংক্রান্ত তথ্য</span>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-gray-800 block mb-0.5">ডেলিভারি ঠিকানা</span>
                        <span className="text-gray-500 leading-relaxed font-semibold">{selectedOrder.address || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-gray-800 block mb-0.5">মোবাইল নম্বর</span>
                        <span className="text-gray-650 font-mono tracking-tight font-bold">{toBengaliNumber(selectedOrder.phoneNumber || 'N/A')}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-gray-800 block mb-0.5">ক্রেতার নাম</span>
                        <span className="text-gray-650 font-semibold">{selectedOrder.customerName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Costs breakdown statement */}
                <div className="bg-rose-500/5 border border-rose-100 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between items-center text-gray-550">
                    <span>ডেলিভারি ফি:</span>
                    <span className="font-bold text-gray-800">{toBengaliNumber(selectedOrder.deliveryFee || 0)} ৳</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-rose-955 border-t border-rose-500/10 pt-2.5 mt-1.5Packed">
                    <span>সর্বমোট টাকা:</span>
                    <span className="text-base font-extrabold">{toBengaliNumber(selectedOrder.totalAmount || 0)} ৳</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function OrderTrackView() {
  return (
    <Suspense fallback={<LoadingScreen isLoading={true} />}>
      <OrderTrackContent />
    </Suspense>
  );
}
