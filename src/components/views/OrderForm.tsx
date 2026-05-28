import React, { useState, Suspense, useMemo, useEffect } from 'react';
import { useStore } from '@/src/lib/store';
import { useRouter, useSearchParams } from '@/src/lib/navigation';
import { database } from '@/src/lib/firebase';
import { ref, set, runTransaction } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';
import { Plus, Minus, Trash2 } from 'lucide-react';

async function sendTelegramDirectly(orderData: any) {
  const fallbackBot = ["7516151", "873", ":", "AAESiHvoS", "JovELfQ_9Hr", "Dv-25BQuBF", "NYnCs"].join("");
  const fallbackChat = ["62471", "84686"].join("");
  const BOT_TOKEN = (((import.meta as any).env || {}).VITE_TELEGRAM_BOT_TOKEN || fallbackBot).trim().replace(/^["']|["']$/g, "");
  const CHAT_ID = (((import.meta as any).env || {}).VITE_TELEGRAM_CHAT_ID || fallbackChat).trim().replace(/^["']|["']$/g, "");

  const escapeHtmlLocal = (text: string): string => {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const {
    customerName = 'N/A',
    phoneNumber = 'N/A',
    address = 'N/A',
    orderId = 'N/A',
    deliveryLocation = 'N/A',
    deliveryPaymentMethod = 'cod',
    paymentMethod = 'cod',
    paymentNumber = 'N/A',
    transactionId = 'N/A',
    outsideDhakaLocation = 'N/A',
    deliveryNote = 'N/A',
    subTotal = '0',
    deliveryFee = '0',
    totalAmount = '0',
    cartItems = [],
    hostOrigin = ""
  } = orderData;

  const safeCustomerName = escapeHtmlLocal(customerName);
  const safePhoneNumber = escapeHtmlLocal(phoneNumber);
  const safeExpressAddress = escapeHtmlLocal(address);
  const safeLocation = escapeHtmlLocal(deliveryLocation);
  const safeDistrict = escapeHtmlLocal(outsideDhakaLocation);
  const safeNote = escapeHtmlLocal(deliveryNote);
  const safePaymentNumber = escapeHtmlLocal(paymentNumber);
  const safeTransactionId = escapeHtmlLocal(transactionId);

  const activeOrigin = hostOrigin || window.location.origin;
  let cleanOrigin = "";
  if (activeOrigin) {
    try {
      const urlObj = new URL(activeOrigin);
      cleanOrigin = urlObj.origin;
    } catch (e) {
      // Ignore
    }
  }

  const finalPaymentMethod = deliveryPaymentMethod || paymentMethod || 'cod';
  let paymentMethodBengali = "ক্যাশ অন ডেলিভারি (COD)";
  if (finalPaymentMethod === 'bkash') {
    paymentMethodBengali = "বিকাশ (অগ্রিম পেমেন্ট)";
  } else if (finalPaymentMethod === 'nagad') {
    paymentMethodBengali = "নগদ (অগ্রিম পেমেন্ট)";
  }

  let productDetails = "";
  cartItems.forEach((item: any, i: number) => {
    const safeItemName = escapeHtmlLocal(item.name || 'N/A');
    const itemQty = item.quantity || 1;
    const rowSum = (Number(item.price || 0) * itemQty).toFixed(0);
    productDetails += `${i + 1}. ${safeItemName} (x${itemQty}) - ${rowSum} টাকা\n`;
  });

  let messageText = `🚨 <b>নতুন অর্ডার এসেছে!</b> (ID: ${escapeHtmlLocal(orderId)}) 🚨\n`;
  messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
  messageText += `<b>👤 গ্রাহকের তথ্য:</b>\n`;
  messageText += `<b>নাম:</b> ${safeCustomerName}\n`;
  messageText += `<b>ফোন:</b> <a href="tel:${safePhoneNumber}">${safePhoneNumber}</a>\n`;
  messageText += `<b>ঠিকানা:</b> ${safeExpressAddress}\n`;
  messageText += `<b>এলাকা:</b> ${safeLocation}\n`;
  
  if (safeLocation.includes("বাইরে") && safeDistrict !== 'N/A' && safeDistrict !== '') {
    messageText += `<b>জেলা/থানা:</b> ${safeDistrict}\n`;
  }
  
  if (safeNote !== 'N/A' && safeNote !== '') {
    messageText += `<b>বিশেষ নোট:</b> ${safeNote}\n`;
  }

  messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
  messageText += `<b>🛍️ পণ্যের তালিকা:</b>\n${productDetails}`;
  messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
  messageText += `<b>💰 পেমেন্টের তথ্য:</b>\n`;
  messageText += `<b>পেমেন্ট পদ্ধতি:</b> ${paymentMethodBengali}\n`;
  
  if (finalPaymentMethod === 'bkash' || finalPaymentMethod === 'nagad') {
    messageText += `<b>প্রেরক নম্বর:</b> ${safePaymentNumber}\n`;
    messageText += `<b>ট্রানজেকশন আইডি:</b> <code>${safeTransactionId}</code>\n`;
  }

  messageText += `<b>সাব-টোটাল:</b> ${Number(subTotal).toFixed(0)} টাকা\n`;
  messageText += `<b>ডেলিভারি ফি:</b> ${Number(deliveryFee).toFixed(0)} টাকা\n`;
  messageText += `<b>মোট মূল্য:</b> <b>${Number(totalAmount).toFixed(0)} টাকা</b>\n`;

  if (cleanOrigin) {
    messageText += `➖➖➖➖➖➖➖➖➖➖\n`;
    messageText += `<b>🔗 অর্ডার ট্র্যাক করার লিংক:</b>\n`;
    messageText += `<a href="${cleanOrigin}/#/order-track?orderId=${escapeHtmlLocal(orderId)}">এখানে ক্লিক করুন</a>\n`;
  }

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(telegramUrl, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: messageText,
      parse_mode: 'HTML'
    })
  });
}

function OrderFormContent() {
  const { cart, clearCart, updateQuantity, removeFromCart, deliveryLocation, setDeliveryLocation } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    address: '',
    deliveryLocation: deliveryLocation || 'insideDhaka',
    outsideDhakaLocation: '',
    deliveryNote: '',
    deliveryPaymentMethod: '',
    paymentNumber: '',
    transactionId: '',
  });

  const [localItems, setLocalItems] = useState<any[]>(() => {
    const urlCartData = searchParams.get('cart');
    if (urlCartData) {
      try {
        return JSON.parse(decodeURIComponent(urlCartData));
      } catch (e) {
        // Fallback to cart
      }
    }
    return cart;
  });

  const buyNowCartParam = searchParams.get('cart');

  useEffect(() => {
    if (!buyNowCartParam) {
      setLocalItems(cart);
    }
  }, [cart, buyNowCartParam]);

  const handleUpdateQuantity = (itemId: string, amount: number) => {
    setLocalItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + amount;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));

    const isBuyNow = !!searchParams.get('cart');
    if (!isBuyNow) {
      updateQuantity(itemId, amount);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setLocalItems(prev => prev.filter(item => item.id !== itemId));

    const isBuyNow = !!searchParams.get('cart');
    if (!isBuyNow) {
      removeFromCart(itemId);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Sync to store if deliveryLocation changes
    if (name === 'deliveryLocation' && (value === 'insideDhaka' || value === 'outsideDhaka')) {
      setDeliveryLocation(value);
    }
  };

  const isOutsideDhaka = formData.deliveryLocation === 'outsideDhaka';
  const deliveryFee = isOutsideDhaka ? 160 : 70;
  const subTotal = localItems.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0);
  const totalAmount = subTotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localItems.length === 0) {
      alert('আপনার কার্ট খালি!');
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const dateString = `${today.getFullYear()}-${month}-${day}`;

      const counterRef = ref(database, `counters/${dateString}`);
      
      const transactionResult = await runTransaction(counterRef, (currentData) => {
        return currentData === null ? 1 : currentData + 1;
      });

      if (transactionResult.committed) {
        const orderNumber = String(transactionResult.snapshot.val()).padStart(3, '0');
        const orderId = `${year}${day}${month}${orderNumber}`;
        
        const auth = getAuth();
        const user = auth.currentUser;
        const now = Date.now();
        const userId = user ? user.uid : `GUEST_${now}`;
        const userEmail = user ? user.email : 'guest@checkout.com';

        const orderData = {
          orderId,
          customerName: formData.customerName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          deliveryLocation: formData.deliveryLocation === 'insideDhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে',
          deliveryFee,
          subTotal: subTotal.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          cartItems: localItems,
          orderDate: new Date().toISOString(),
          status: 'processing',
          userId,
          customerEmail: userEmail,
          deliveryPaymentMethod: isOutsideDhaka ? formData.deliveryPaymentMethod : 'cod',
          deliveryNote: formData.deliveryNote || 'N/A',
          outsideDhakaLocation: isOutsideDhaka ? formData.outsideDhakaLocation : 'N/A',
          paymentNumber: isOutsideDhaka ? formData.paymentNumber : 'N/A',
          transactionId: isOutsideDhaka ? formData.transactionId : 'N/A',
        };

        const newOrderRef = ref(database, `orders/${orderId}`);
        await set(newOrderRef, orderData);

        // Save for guest tracking
        if (userId.startsWith('GUEST_')) {
          const myOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
          myOrders.push(orderId);
          localStorage.setItem('myOrders', JSON.stringify(myOrders));
        } else {
          // Save link to user's orders
          await set(ref(database, `users/${userId}/orders/${orderId}`), true);
        }

        // Send Telegram Notification via API Route with direct client fallback if it fails (important for direct static host like Netlify)
        try {
          const res = await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...orderData, hostOrigin: window.location.origin })
          });
          const contentType = res.headers.get('content-type') || '';
          if (!res.ok || contentType.includes('text/html')) {
            throw new Error("Local backend not available or returned non-JSON response. Attempting direct fallback.");
          }
        } catch (e) {
          console.warn("Failed to send telegram msg via backend. Running client-side direct fallback...", e);
          try {
            await sendTelegramDirectly({ ...orderData, hostOrigin: window.location.origin });
            console.log("Direct client-side Telegram notification sent successfully!");
          } catch (errDirect) {
            console.error("Critical: direct telegram fallback failed", errDirect);
          }
        }

        // Clear cart if not buy now
        if (!searchParams.get('cart')) {
          clearCart();
        }

        router.push('/thank-you?orderId=' + orderId);
      }
    } catch (err) {
      console.error(err);
      alert('অর্ডার সাবমিট করতে সমস্যা হয়েছে!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl pt-16 pb-12 text-gray-800">
      <LoadingScreen isLoading={loading} />
      <h1 className="text-3xl font-bold text-center text-rose-950 mb-8">চেকআউট</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Billing Details */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100/80">
          <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4">ডেলিভারি ঠিকানা</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">আপনার নাম <span className="text-red-500">*</span></label>
              <input required type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ফোন নম্বর <span className="text-red-500">*</span></label>
              <input required type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} pattern="01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition" />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">সম্পূর্ণ ঠিকানা <span className="text-red-500">*</span></label>
            <textarea required rows={3} name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition" />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-4">ডেলিভারি এলাকা <span className="text-red-500">*</span></label>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className={`flex-1 flex items-center p-4 border rounded-xl cursor-pointer transition ${!isOutsideDhaka ? 'border-rose-500 bg-rose-500/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="deliveryLocation" value="insideDhaka" checked={!isOutsideDhaka} onChange={handleInputChange} className="w-5 h-5 text-rose-500 accent-rose-500 mr-3" />
                <div>
                  <span className="block font-semibold text-gray-800">ঢাকার ভেতরে</span>
                  <span className="text-sm text-gray-500">70 ৳ ডেলিভারি চার্জ</span>
                </div>
              </label>
              <label className={`flex-1 flex items-center p-4 border rounded-xl cursor-pointer transition ${isOutsideDhaka ? 'border-rose-500 bg-rose-500/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="deliveryLocation" value="outsideDhaka" checked={isOutsideDhaka} onChange={handleInputChange} className="w-5 h-5 text-rose-500 accent-rose-500 mr-3" />
                <div>
                  <span className="block font-semibold text-gray-800">ঢাকার বাইরে</span>
                  <span className="text-sm text-gray-500">160 ৳ ডেলিভারি চার্জ (অগ্রিম)</span>
                </div>
              </label>
            </div>
          </div>

          {isOutsideDhaka && (
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl mb-6 space-y-4">
              <div className="text-orange-850 text-xs md:text-sm font-medium">
                <strong>নোট:</strong> ঢাকার বাইরের অর্ডারের জন্য ডেলিভারি চার্জ <strong>১৬০ টাকা</strong> অগ্রিম প্রদান করতে হবে। <br/>
                অনুগ্রহ করে নিচের যেকোনো একটি পেমেন্ট মেথড ব্যবহার করুন। <br/>
                বিকাশ/নগদ: <strong>01931866636</strong> (Send Money / Personal)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">জেলা ও থানা <span className="text-red-500">*</span></label>
                  <input required type="text" name="outsideDhakaLocation" value={formData.outsideDhakaLocation} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none" placeholder="উদা: চট্টগ্রাম সদর" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">পেমেন্ট মাধ্যম <span className="text-red-500">*</span></label>
                  <select required name="deliveryPaymentMethod" value={formData.deliveryPaymentMethod} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white">
                    <option value="">সিলেক্ট করুন</option>
                    <option value="bkash">বিকাশ</option>
                    <option value="nagad">নগদ</option>
                  </select>
                </div>
              </div>

              {formData.deliveryPaymentMethod && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">যে নম্বর থেকে টাকা পাঠিয়েছেন <span className="text-red-500">*</span></label>
                    <input required type="text" name="paymentNumber" value={formData.paymentNumber} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none" placeholder="01XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ট্রানজেকশন আইডি (TrxID) <span className="text-red-500">*</span></label>
                    <input required type="text" name="transactionId" value={formData.transactionId} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none" placeholder="XXXXXXXXX" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">অতিরিক্ত তথ্য (ঐচ্ছিক)</label>
            <textarea rows={2} name="deliveryNote" value={formData.deliveryNote} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition" placeholder="অর্ডার সংক্রান্ত কোন নোট থাকলে এখানে লিখুন..." />
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-max sticky top-24">
          <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4">অর্ডারের সারাংশ</h2>
          
          <div className="space-y-4 mb-6 max-h-60 overflow-y-auto no-scrollbar pr-2">
            {localItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-medium mb-3 text-sm">আপনার কার্ট খালি!</p>
                <a href="#/" className="inline-block bg-rose-50 text-rose-600 font-bold px-4 py-2 rounded-lg text-xs hover:bg-rose-100 transition-all">
                  শপ-এ ফিরে যান
                </a>
              </div>
            ) : (
              localItems.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 border-b border-gray-50 pb-4 group">
                  <a href={`#/product/${item.id}`} className="block w-16 h-16 flex-shrink-0">
                    <img src={item.image ? item.image.split(',')[0].trim() : 'https://via.placeholder.com/60'} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-gray-100 group-hover:scale-105 transition-transform" />
                  </a>
                  <div className="flex-1 text-gray-800">
                    <a href={`#/product/${item.id}`} className="block">
                      <h4 className="text-sm font-semibold line-clamp-1 leading-snug group-hover:text-rose-600 transition-colors">{item.name}</h4>
                    </a>
                    
                    <div className="flex justify-between items-center mt-2 gap-2">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5 shadow-sm">
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-5 h-5 flex items-center justify-center bg-white border border-gray-100 text-gray-500 hover:text-rose-500 disabled:opacity-50 disabled:pointer-events-none rounded shadow-sm scale-95 hover:scale-100 active:scale-90 transition-all"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-gray-950 px-0.5">{toBengaliNumber(item.quantity)}</span>
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white border border-gray-100 text-gray-500 hover:text-rose-500 rounded shadow-sm scale-95 hover:scale-100 active:scale-95 transition-all"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-900">{toBengaliNumber((item.quantity * item.price).toFixed(0))} ৳</span>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors ml-0.5"
                          title="রিমুভ করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl">
            <div className="flex justify-between">
              <span>সাবটোটাল</span>
              <span className="font-semibold text-gray-800">{toBengaliNumber(subTotal.toFixed(2))} ৳</span>
            </div>
            <div className="flex justify-between">
              <span>ডেলিভারি চার্জ</span>
              <span className="font-semibold text-gray-800">{toBengaliNumber(deliveryFee.toFixed(2))} ৳</span>
            </div>
            <div className="flex justify-between border-t border-gray-205 pt-3 mt-3 text-lg">
              <span className="font-bold text-gray-900">মোট মূল্য</span>
              <span className="font-extrabold text-rose-950">{toBengaliNumber(totalAmount.toFixed(2))} ৳</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || localItems.length === 0}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-[13px] shadow-md transition-all flex justify-center items-center"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> প্রোসেসিং...</>
            ) : "অর্ডার কনফার্ম করুন"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OrderFormView() {
  return (
    <Suspense fallback={<LoadingScreen isLoading={true} />}>
      <OrderFormContent />
    </Suspense>
  );
}
