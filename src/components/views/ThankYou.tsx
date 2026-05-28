import React, { useEffect, useState, Suspense } from 'react';
import { database } from '@/src/lib/firebase';
import { ref, get } from 'firebase/database';
import { useSearchParams } from '@/src/lib/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, ShoppingBag, ArrowRight, Truck, Phone, MessageSquare, MapPin, Calendar, Heart } from 'lucide-react';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const orderRef = ref(database, `orders/${orderId}`);
        const snapshot = await get(orderRef);
        if (snapshot.exists()) {
          setOrder(snapshot.val());
        }
      } catch (err) {
        console.error('Error fetching order in thank you page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Calculate estimated delivery date
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl pb-24 pt-16 text-gray-800">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        {/* Top Success Badge Column */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-emerald-50 rounded-full p-4 mb-4 relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 bg-emerald-100 rounded-full -m-2 z-0"
            />
            <CheckCircle2 className="w-12 h-12 text-emerald-500 relative z-10" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-extrabold text-rose-950 font-serif italic mb-2">অর্ডার সফল হয়েছে!</h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আপনার পছন্দের প্রসাধনীগুলো দ্রুততম সময়ে আপনার ঠিকানায় পৌঁছে দিতে আমরা এখনই কাজ শুরু করে দিয়েছি।</p>
        </motion.div>

        {order ? (
          <div className="space-y-6">
            {/* Quick Summary Receipts Block */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-rose-50 to-rose-50/20 p-4 border-b border-rose-100 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase block mb-0.5">অর্ডার নম্বর</span>
                  <span className="font-extrabold text-gray-950 text-base">#{toBengaliNumber(order.orderId || orderId)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase block mb-0.5">তারিখ</span>
                  <span className="font-semibold text-gray-700 text-xs">
                    {new Date(order.orderDate).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase block mb-0.5">পেমেন্ট পদ্ধতি</span>
                  <span className="font-semibold text-gray-750 text-xs">
                    {order.deliveryPaymentMethod ? (order.deliveryPaymentMethod === 'bkash' ? 'বিকাশ (অগ্রিম)' : 'নগদ (অগ্রিম)') : 'ক্যাশ অন ডেলিভারি'}
                  </span>
                </div>
              </div>

              {/* Delivery ETA Alert banner */}
              <div className="p-4 bg-emerald-50/40 border-b border-emerald-100/40 flex items-center gap-3">
                <Truck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-medium text-gray-600">সম্ভাব্য ডেলিভারি তারিখ:</span>{' '}
                  <span className="font-bold text-emerald-700">
                    {getEstimatedDelivery(order.orderDate, order.deliveryLocation !== 'ঢাকার ভেতরে')}
                  </span>
                </div>
              </div>

              {/* Products in the order */}
              <div className="p-5 border-b border-gray-50">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-3">পণ্য তালিকা</span>
                <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto pr-1">
                  {(order.cartItems || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-center py-3 first:pt-0 last:pb-0">
                      <img 
                        src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/60'} 
                        alt={item.name} 
                        className="w-11 h-11 object-cover rounded-lg border border-gray-100 shrink-0" 
                      />
                      <div className="flex-1 text-xs">
                        <h4 className="font-bold text-gray-805 line-clamp-1">{item.name}</h4>
                        <p className="text-gray-450 mt-0.5">{toBengaliNumber(item.quantity || 1)} x {toBengaliNumber(item.price)} ৳</p>
                      </div>
                      <div className="text-xs font-bold text-gray-900 shrink-0">
                        {toBengaliNumber(((item.quantity || 1) * item.price).toFixed(0))} ৳
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing line-items summary */}
              <div className="bg-gray-50/50 p-5 text-xs space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>পণ্যের মূল্য</span>
                  <span className="font-medium text-gray-800">{toBengaliNumber(Number(order.subTotal || 0).toFixed(0))} ৳</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ডেলিভারি চার্জ</span>
                  <span className="font-medium text-gray-800">{toBengaliNumber(Number(order.deliveryFee || 0).toFixed(0))} ৳</span>
                </div>
                <div className="flex justify-between text-gray-900 border-t border-gray-150 pt-2.5 mt-2.5 font-bold text-sm">
                  <span>সর্বমোট পরিশোধ</span>
                  <span className="font-extrabold text-rose-955">{toBengaliNumber(Number(order.totalAmount || 0).toFixed(0))} ৳</span>
                </div>
              </div>
            </motion.div>

            {/* Delivery address & info details block */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">ডেলিভারি সংক্রান্ত তথ্য</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-400 block mb-0.5">ডেলিভারির ঠিকানা</span>
                    <p className="font-semibold text-gray-800 leading-relaxed">
                      {order.customerName} <br />
                      {order.address} <br />
                      এলাকা: {order.deliveryLocation} {order.outsideDhakaLocation !== 'N/A' && `(${order.outsideDhakaLocation})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-400 block mb-0.5">মোবাইল ও যোগাযোগ</span>
                    <p className="font-bold text-gray-800 text-[13px]">{toBengaliNumber(order.phoneNumber)}</p>
                    {order.customerEmail && order.customerEmail !== 'guest@checkout.com' && (
                      <p className="text-gray-500 text-xs mt-0.5">{order.customerEmail}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Fallback generic view if order loading somehow had an issue or visited directly without parameters */
          <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <Heart className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <p className="text-gray-650 font-medium text-sm mb-2">আপনি কি আপনার সাম্প্রতিক অর্ডারটি খুঁজছেন?</p>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">অর্ডার ট্র্যাকিং পেজে গিয়ে আপনার সমস্ত পূর্ববর্তী অর্ডারগুলোর রিয়েল-টাইম স্ট্যাটাস এবং বিবরণ বিস্তারিতভাবে দেখে নিতে পারেন।</p>
          </motion.div>
        )}

        {/* Action Button Navigation block */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          {orderId && (
            <a 
              href={`#/order-track?orderId=${orderId}`} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
            >
              আজকের অর্ডারটি ট্র্যাক করুন
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
          <a 
            href="#/" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold text-xs px-6 py-3 rounded-xl border border-gray-250/60 transition-all text-center"
          >
            <ShoppingBag className="w-4 h-4" />
            আরো কেনাকাটা করুন
          </a>
        </motion.div>

        {/* Support Section */}
        <motion.div variants={itemVariants} className="mt-8 text-center bg-gray-50/50 rounded-xl p-4 border border-gray-100 max-w-md mx-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">সাহায্য প্রয়োজন?</p>
          <div className="flex flex-col gap-1.5 justify-center text-xs text-gray-650 items-center">
            <a href="tel:01931866636" className="flex items-center gap-1.5 hover:text-rose-600 font-semibold transition-colors">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              ০১৯৩১৮৬৬৬৩৬
            </a>
            <span className="text-gray-300">অথবা</span>
            <p className="flex items-center gap-1.5 justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              ফেইসবুক পেইজে মেসেজ করতে পারেন
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ThankYouView() {
  return (
    <Suspense fallback={<LoadingScreen isLoading={true} />}>
      <ThankYouContent />
    </Suspense>
  );
}
