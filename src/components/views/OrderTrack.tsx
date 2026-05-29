import { useEffect, useState, Suspense } from 'react';
import { database, auth, googleProvider } from '@/src/lib/firebase';
import { ref, get } from 'firebase/database';
import { useStore } from '@/src/lib/store';
import { X, Check, Package, Eye } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from '@/src/lib/navigation';
import LoadingScreen from '@/src/components/LoadingScreen';
import { toBengaliNumber } from '@/src/lib/utils';

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
          console.warn("Could not query account orders from database (normal if permissions pending):", dbErr);
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
        // If order belongs to this browser session locally
        if (localKeys.includes(o.id) || localKeys.includes(o.orderId)) {
          return true;
        }
        // If there's a logged-in user and it belongs to them
        if (user && (o.userId === user.uid || o.customerEmail === user.email || o.userEmail === user.email)) {
          return true;
        }
        // If specifically requested in URL (having the exact track link counts as permission)
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
      const result = await signInWithPopup(auth, googleProvider);
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    } catch (error) {
      alert('লগইন ব্যর্থ হয়েছে।');
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

  return (
    <div className="container mx-auto p-4 max-w-4xl pb-16 pt-16 text-gray-800">
      <LoadingScreen isLoading={loading} />
      <h1 className="text-2xl font-bold text-center mb-0 text-rose-955 font-serif italic">আপনার অর্ডারসমূহ</h1>
      <p className="text-center text-[10px] text-gray-400 mt-1 mb-6 tracking-widest uppercase">Order History & Tracking</p>
      
      {!user && orders.length === 0 && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-sm mx-auto text-center">
          <p className="text-gray-650 mb-4 text-sm font-medium">আপনার অতীত অর্ডারগুলো দেখতে এবং ট্র্যাক করতে অনুগ্রহ করে লগইন করুন।</p>
          <button onClick={handleLogin} className="bg-rose-500 text-white px-5 py-2 rounded-lg font-bold w-full hover:bg-rose-600 transition shadow-sm text-xs">
            লগইন করুন
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"></div>
      ) : orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order: any) => {
            const itemCount = (order.cartItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
            return (
              <div 
                key={order.id} 
                onClick={() => router.push(`/order-track?orderId=${order.orderId || order.id}`)}
                className="bg-white rounded-xl p-3.5 border border-gray-100 hover:border-rose-200 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Background Accent Decor */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

                <div>
                  {/* Order Top Bar & Info */}
                  <div className="flex justify-between items-center gap-4 mb-2 pb-2 border-b border-gray-100/50">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Package className="w-3.5 h-3.5 text-rose-500" />
                        <span className="font-extrabold text-gray-900 text-sm tracking-tight group-hover:text-rose-500 transition-colors">
                          #{toBengaliNumber(order.orderId || order.id)}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-450 block font-medium">
                        {new Date(order.orderDate).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide border ${getStatusColor(order.status)} shrink-0`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  {/* Items list preview inline with count */}
                  <div className="flex items-center justify-between mb-3 mt-1.5">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {(order.cartItems || []).slice(0, 4).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="relative shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 p-0.5 flex items-center justify-center group-hover:border-rose-100 transition-colors">
                          <img 
                            src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/50'} 
                            alt={item.name} 
                            className="w-full h-full object-cover rounded shadow-0" 
                          />
                          {item.quantity > 1 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-xs">
                              {toBengaliNumber(item.quantity)}
                            </span>
                          )}
                        </div>
                      ))}
                      {(order.cartItems || []).length > 4 && (
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-[9px] font-bold text-gray-500">
                          +{toBengaliNumber((order.cartItems || []).length - 4)}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                      {toBengaliNumber(itemCount)}টি পণ্য
                    </span>
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100/60 mt-auto">
                  <div>
                    <span className="text-[8px] font-bold text-gray-400 block uppercase tracking-wider font-sans">সর্বমোট পরিশোধ</span>
                    <span className="text-sm font-black text-rose-955 tracking-tight">
                      {toBengaliNumber(order.totalAmount)} ৳
                    </span>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/order-track?orderId=${order.orderId || order.id}`);
                    }}
                    className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg shadow-xs active:scale-95 transition-all text-nowrap"
                  >
                    <Eye className="w-2.5 h-2.5" />
                    বিস্তারিত ট্র্যাকিং
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        user && <p className="text-center text-gray-500 mt-10 font-medium text-sm">আপনার কোনো অর্ডার খুঁজে পাওয়া যায়নি।</p>
      )}

      {/* Modal matching original logic but smaller/nicer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in" onClick={handleCloseModal}>
          <div 
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-3.5 border-b flex justify-between items-center z-10">
              <h2 className="text-sm font-extrabold text-gray-850">অর্ডার ট্র্যাকিং ও বিস্তারিত</h2>
              <button onClick={handleCloseModal} className="p-1 px-2 hover:bg-gray-105 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Tracker */}
              <div className="flex justify-between items-center mb-6 relative">
                {(() => {
                  const statuses = ['processing', 'confirmed', 'packaging', 'shipped', 'delivered'];
                  const currentIndex = statuses.indexOf(selectedOrder.status || 'processing');
                  return statuses.map((status, index) => {
                    const isActive = index <= currentIndex;
                    const isCompleted = index < currentIndex;
                    return (
                      <div key={status} className="flex flex-col items-center relative z-10 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-xs' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                          {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-bold text-center ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                    );
                  })
                })()}
                {/* Progress bar background */}
                <div className="absolute top-3 left-[10%] right-[10%] h-0.5 bg-gray-100 -z-0">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ 
                      width: `${(['processing', 'confirmed', 'packaging', 'shipped', 'delivered'].indexOf(selectedOrder.status || 'processing') / 4) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 mb-4 space-y-1.5 text-xs text-gray-650">
                <p><strong className="text-gray-900">অর্ডার আইডি:</strong> {selectedOrder.orderId || selectedOrder.id}</p>
                <p><strong className="text-gray-900">তারিখ:</strong> {new Date(selectedOrder.orderDate).toLocaleString('bn-BD')}</p>
                <p><strong className="text-gray-900">ক্রেতার নাম:</strong> {selectedOrder.customerName}</p>
                <p><strong className="text-gray-900">মোবাইল নম্বর:</strong> {selectedOrder.phoneNumber}</p>
                <p><strong className="text-gray-900">ঠিকানা:</strong> {selectedOrder.address}</p>
              </div>

              {/* Items */}
              <h3 className="font-bold text-xs text-gray-800 mb-2 border-b pb-1">পণ্য তালিকা</h3>
              <div className="space-y-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
                {(selectedOrder.cartItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100 items-center group">
                    <a href={`#/product/${item.id}`} onClick={handleCloseModal} className="block shrink-0">
                      <img src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/45'} alt={item.name} className="w-10 h-10 object-cover rounded border border-gray-200 group-hover:scale-105 transition-transform" />
                    </a>
                    <div className="flex-1 text-xs">
                      <a href={`#/product/${item.id}`} onClick={handleCloseModal} className="block">
                        <p className="font-bold text-gray-850 line-clamp-1 group-hover:text-rose-600 transition-colors">{item.name}</p>
                      </a>
                      <p className="text-gray-550 mt-0.5">{toBengaliNumber(item.quantity || 1)} x {toBengaliNumber(item.price)} ৳</p>
                    </div>
                    <div className="font-bold text-xs text-gray-900 shrink-0">
                      {toBengaliNumber((item.quantity * item.price).toFixed(0))} ৳
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-xs flex flex-col gap-1 text-right">
                <p className="text-gray-600">ডেলিভারি ফি: <span className="font-bold text-gray-800 ml-4">{toBengaliNumber(selectedOrder.deliveryFee || 0)} ৳</span></p>
                <p className="text-sm font-black text-rose-955 mt-1 border-t border-rose-500/20 pt-1.5">সর্বমোট মূল্য: <span className="ml-4">{toBengaliNumber(selectedOrder.totalAmount || 0)} ৳</span></p>
              </div>
            </div>
          </div>
        </div>
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
