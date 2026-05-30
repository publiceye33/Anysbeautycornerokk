import React, { useEffect, useState } from 'react';
import { database } from '@/src/lib/firebase';
import { ref, get, onValue, set, push, query, orderByChild, equalTo } from 'firebase/database';
import { useStore } from '@/src/lib/store';
import { ShoppingCart, CreditCard, Minus, Plus, Share2, ShieldCheck, Truck, RefreshCcw, Star, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { useRouter } from '@/src/lib/navigation';
import ProductCard from '@/src/components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';

export default function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const { cart, addToCart, updateQuantity } = useStore();
  const cartItem = cart.find((item) => item.id === id);
  const [product, setProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState('');
  const [activeTab, setActiveTab] = useState('description');

  // Review states
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewPhone, setNewReviewPhone] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productRef = ref(database, `products/${id}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          const data = { id: snapshot.key, ...snapshot.val() };
          setProduct(data);
          if (data.image) {
            setMainImage(data.image.split(',')[0].trim());
          }

          // Dynamic SEO Meta updates
          document.title = `${data.name || 'পণ্য'} | Any's Beauty Corner`;
          
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute('content', `${data.name} | Any's Beauty Corner`);
          }
          
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) {
            ogDesc.setAttribute('content', data.description || 'Any\'s Beauty Corner ১০০% অথেন্টিক মেকআপ, স্কিনকেয়ার এবং কসমেটিকস প্রোডাক্টের বিশ্বস্ত অনলাইন বিউটি শপ।');
          }
          
          const ogImg = document.querySelector('meta[property="og:image"]');
          if (ogImg) {
            const firstImg = data.image ? data.image.split(',')[0].trim() : 'https://anysbeautycorner.netlify.app/og-image.jpg';
            ogImg.setAttribute('content', firstImg);
          }

          const twitterTitle = document.querySelector('meta[property="twitter:title"]');
          if (twitterTitle) {
            twitterTitle.setAttribute('content', `${data.name} | Any's Beauty Corner`);
          }

          const twitterDesc = document.querySelector('meta[property="twitter:description"]');
          if (twitterDesc) {
            twitterDesc.setAttribute('content', data.description || 'Any\'s Beauty Corner ১০০% অথেন্টিক মেকআপ, স্কিনকেয়ার এবং কসমেটিকস প্রোডাক্টের বিশ্বস্ত অনলাইন বিউটি শপ।');
          }

          const twitterImg = document.querySelector('meta[property="twitter:image"]');
          if (twitterImg) {
            const firstImg = data.image ? data.image.split(',')[0].trim() : 'https://anysbeautycorner.netlify.app/og-image.jpg';
            twitterImg.setAttribute('content', firstImg);
          }
        } else {
          setError('প্রোডাক্ট পাওয়া যায়নি!');
        }
      } catch (err: any) {
        setError(err.message || 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে!');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    // Fetch all products for related section
    const productsRef = ref(database, 'products/');
    const unsubProducts = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const prods = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setProducts(prods);
      }
    }, (error) => {
      console.error("Firebase read error productsRef in ProductDetail:", error);
    });

    // Fetch reviews
    const reviewsRef = ref(database, `reviews/${id}`);
    const unsubReviews = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reviewsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        reviewsList.sort((a, b) => b.timestamp - a.timestamp);
        setReviews(reviewsList);
      } else {
        setReviews([]);
      }
    }, (error) => {
      console.error("Firebase read error reviewsRef in ProductDetail:", error);
    });

    return () => {
      unsubProducts();
      unsubReviews();
    };
  }, [id]);

  const images = product?.image ? product.image.split(',').map((img: string) => img.trim()).filter(Boolean) : [];

  const [isClickable, setIsClickable] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe || isRightSwipe) {
      if (images.length <= 1) return;
      if (isLeftSwipe) {
        const idx = images.indexOf(mainImage);
        setMainImage(images[(idx + 1) % images.length]);
      } else if (isRightSwipe) {
        const idx = images.indexOf(mainImage);
        setMainImage(images[(idx - 1 + images.length) % images.length]);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClickable(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: images[0] || '',
      quantity,
    });
    setQuantity(1);
    const { setIsCartOpen } = useStore.getState();
    setIsCartOpen(true);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) return;
    const tempCart = [{
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: images[0] || '',
      quantity: quantity
    }];
    const cartData = encodeURIComponent(JSON.stringify(tempCart));
    router.push(`/order-form?cart=${cartData}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('লিঙ্কটি কপি করা হয়েছে!');
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewPhone.trim() || !newReviewComment.trim()) {
      setReviewError('দয়া করে আপনার নাম, ফোন নম্বর এবং মন্তব্য লিখুন!');
      return;
    }

    const phonePattern = /^01[3-9]\d{8}$/;
    if (!phonePattern.test(newReviewPhone.trim())) {
      setReviewError('দয়া করে একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)!');
      return;
    }

    setIsPostingReview(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      const phoneInput = newReviewPhone.trim();
      
      // 1. Verify if this phone number has purchased this product
      const ordersRef = ref(database, 'orders');
      const orderQuery = query(ordersRef, orderByChild('phoneNumber'), equalTo(phoneInput));
      const orderSnapshot = await get(orderQuery);
      
      let hasPurchased = false;
      if (orderSnapshot.exists()) {
        const ordersData = orderSnapshot.val();
        for (const orderKey of Object.keys(ordersData)) {
          const order = ordersData[orderKey];
          if (order.cartItems && Array.isArray(order.cartItems)) {
            const boughtThisProduct = order.cartItems.some((item: any) => String(item.id) === String(id));
            if (boughtThisProduct) {
              hasPurchased = true;
              break;
            }
          }
        }
      }
      
      if (!hasPurchased) {
        setReviewError('দুঃখিত, এই মোবাইল নম্বর থেকে এই প্রোডাক্টটি অর্ডার করা হয়নি!');
        setIsPostingReview(false);
        return;
      }

      // 2. Post the review
      const reviewsRef = ref(database, `reviews/${id}`);
      const newReviewRef = push(reviewsRef);
      await set(newReviewRef, {
        name: newReviewName.trim(),
        phoneNumber: phoneInput,
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        timestamp: Date.now()
      });
      setNewReviewName('');
      setNewReviewPhone('');
      setNewReviewComment('');
      setNewReviewRating(5);
      setReviewSuccess('আপনার রিভিউটি সফলভাবে সাবমিট হয়েছে। আপনাকে ধন্যবাদ!');
    } catch (err: any) {
      setReviewError(err.message || 'রিভিউ পোস্ট করার সময় সমস্যা হয়েছে!');
    } finally {
      setIsPostingReview(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return { avg: '5.0', count: 0 };
    const total = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
    return { avg: (total / reviews.length).toFixed(1), count: reviews.length };
  };

  const { avg: ratingAvg, count: ratingCount } = getAverageRating();

  const isOutOfStock = product?.stockStatus === 'out_of_stock';
  const relatedProducts = products
    .filter(p => p.id !== product?.id && (product?.category ? p.category === product.category : true))
    .slice(0, 4);

  return (
    <div className="container mx-auto p-4 max-w-7xl pb-32 pt-24 text-gray-800">
      <LoadingScreen isLoading={loading} />
      
      {loading ? (
        <div className="min-h-screen"></div>
      ) : error || !product ? (
        <div className="text-center mt-20">
          <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{error || 'পণ্য পাওয়া যায়নি'}</h2>
            <button 
              onClick={() => router.push('/')} 
              className="w-full bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all transform active:scale-95"
            >
              হোম পেজে ফিরে যান
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex text-xs md:text-sm text-gray-400 mb-8 px-1 overflow-x-auto no-scrollbar whitespace-nowrap"
          >
            <a href="#/" className="hover:text-rose-500 transition-colors">হোম</a>
            <span className="mx-2 text-gray-300">/</span>
            <a href={`#/?filter=${product.category || ''}`} className="hover:text-rose-500 transition-colors capitalize">{product.category || 'পণ্য'}</a>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </motion.nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-16">
            {/* Left: Gallery */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-7 space-y-4 md:space-y-6"
            >
              <div 
                className="relative group bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-gray-205/40 aspect-square flex items-center justify-center p-4"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={mainImage}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    src={mainImage || 'https://via.placeholder.com/800'} 
                    alt={product.name} 
                    className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                    draggable={false}
                  />
                </AnimatePresence>
                
                {images.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const idx = images.indexOf(mainImage);
                        setMainImage(images[(idx - 1 + images.length) % images.length]);
                      }}
                      className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg text-gray-800 hover:bg-rose-500 hover:text-white transition-all transform active:scale-90"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => {
                        const idx = images.indexOf(mainImage);
                        setMainImage(images[(idx + 1) % images.length]);
                      }}
                      className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg text-gray-800 hover:bg-rose-500 hover:text-white transition-all transform active:scale-90"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1 scroll-smooth">
                  {images.map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setMainImage(img)}
                      className={`flex-shrink-0 w-24 h-24 rounded-3xl overflow-hidden border-2 transition-all p-1 bg-white ${mainImage === img ? 'border-rose-500 shadow-lg shadow-rose-500/10' : 'border-transparent hover:border-rose-500/40 grayscale hover:grayscale-0'}`}
                    >
                      <img src={img} className="w-full h-full object-cover rounded-2xl" alt={`${product.name} thumbnail ${idx+1}`} />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Right: Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-5 flex flex-col pt-2"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-medium text-gray-900 leading-tight md:leading-[1.1]">{product.name}</h1>
                  <button 
                    onClick={handleShare} 
                    className="p-2.5 md:p-3 bg-white border border-gray-100 rounded-xl md:rounded-2xl hover:bg-gray-50 transition shadow-sm text-gray-500 hover:text-rose-500 flex-shrink-0"
                  >
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-yellow-50/50 px-3 py-1.5 rounded-full border border-yellow-105/50">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-xs font-semibold text-yellow-800 tracking-tight">
                      {toBengaliNumber(ratingAvg)} ({toBengaliNumber(ratingCount)} রিভিউ)
                    </span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                  {isOutOfStock ? (
                    <span className="bg-red-50/50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-100/50">স্টকে নেই</span>
                  ) : (
                    <span className="bg-emerald-50/50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100/50">স্টকে আছে</span>
                  )}
                </div>

                <div className="flex items-baseline gap-3 md:gap-4 pt-2 md:pt-4 pb-2">
                  <span className="text-3xl md:text-5xl font-black text-rose-950 tracking-tighter">{toBengaliNumber(product.price)} ৳</span>
                  {product.oldPrice && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-lg md:text-xl text-gray-300 line-through font-medium">{toBengaliNumber(product.oldPrice)} ৳</span>
                      <span className="text-[10px] md:text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">{toBengaliNumber(Math.round((1 - parseInt(product.price) / parseInt(product.oldPrice)) * 100))}% ছাড়</span>
                    </div>
                  )}
                </div>

                <div className="py-2">
                  <p className="text-gray-500 leading-relaxed text-sm md:text-base line-clamp-3">
                    {product.description || 'বিলাসবহুল ও কার্যকর ফিনিশিংয়ের জন্য এই প্রোডাক্টটি বিশেষভাবে তৈরি করা হয়েছে।'}
                  </p>
                </div>

                <div className="h-px bg-gray-100 w-full my-6"></div>

                {!isOutOfStock ? (
                  <div className="space-y-8 pt-4">
                    <div className="flex items-center gap-8">
                      <span className="text-gray-950 font-black uppercase tracking-wider text-base md:text-lg">পরিমাণ:</span>
                      <div className="flex items-center border border-gray-200 rounded-[13px] bg-gray-50 p-1.5 shadow-sm max-w-max">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-500 hover:text-rose-500 rounded-[11px] shadow-sm active:scale-90 transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg text-gray-950 px-1">{toBengaliNumber(quantity)}</span>
                        <button 
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-500 hover:text-rose-500 rounded-[11px] shadow-sm active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5">
                      <AnimatePresence mode="wait">
                        {cartItem ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key="cartItemQty"
                            className="flex-1 bg-rose-550/5 border-2 border-rose-500/10 rounded-[13px] font-black flex items-center justify-between p-1.5 h-[58px]"
                          >
                            <button 
                              type="button"
                              onClick={() => {
                                if (cartItem.id) {
                                  updateQuantity(cartItem.id, -1);
                                }
                              }} 
                              className="w-11 h-11 flex items-center justify-center text-rose-600 bg-white border border-rose-500/5 rounded-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-base text-rose-950 font-black">{toBengaliNumber(cartItem.quantity)} টি কার্টে আছে</span>
                            <button 
                              type="button"
                              onClick={() => {
                                if (cartItem.id) {
                                  updateQuantity(cartItem.id, 1);
                                }
                              }} 
                              className="w-11 h-11 flex items-center justify-center text-rose-600 bg-white border border-rose-500/5 rounded-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key="addToCartBtn"
                            type="button"
                            onClick={handleAddToCart}
                            disabled={!isClickable}
                            className="flex-1 group relative bg-white text-rose-500 border-2 border-rose-500 py-4 px-8 rounded-[13px] font-black flex items-center justify-center overflow-hidden transition-all hover:bg-rose-500 hover:text-white disabled:opacity-70 disabled:cursor-not-allowed h-[58px]"
                          >
                            <ShoppingCart className="w-6 h-6 mr-3 relative z-10 text-rose-500 group-hover:text-white transition-colors" />
                            <span className="relative z-10">কার্টে যোগ করুন</span>
                            <div className="absolute inset-0 bg-white group-hover:bg-rose-500 transition-all scale-x-0 group-hover:scale-x-100 origin-left"></div>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <button 
                        type="button"
                        onClick={handleBuyNow}
                        disabled={!isClickable}
                        className="flex-[1.2] bg-rose-500 text-white py-4 px-8 rounded-[13px] font-black flex items-center justify-center hover:bg-rose-600 transition-all shadow-2xl shadow-rose-500/20 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed h-[58px]"
                      >
                        <CreditCard className="w-5 h-5 mr-3 text-white" />
                        অর্ডার করুন
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 text-center border-dashed mt-6">
                    <p className="text-gray-400 font-bold">দুঃখিত, এই পণ্যটি সাময়িকভাবে আউট অফ স্টক আছে।</p>
                  </div>
                )}

                {/* Trust Points */}
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-12 py-6 md:py-8 border-y border-gray-100">
                  <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    <div className="p-3 md:p-4 bg-blue-50 rounded-2xl md:rounded-3xl">
                      <ShieldCheck className="w-5 h-5 md:w-7 md:h-7 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-[9px] md:text-xs font-black text-gray-900 uppercase tracking-wider">100% আসল</h4>
                      <p className="text-[8px] md:text-[10px] text-gray-400">Authentic</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    <div className="p-3 md:p-4 bg-emerald-50 rounded-2xl md:rounded-3xl">
                      <Truck className="w-5 h-5 md:w-7 md:h-7 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-[9px] md:text-xs font-black text-gray-900 uppercase tracking-wider">ডেলিভারি</h4>
                      <p className="text-[8px] md:text-[10px] text-gray-400">Fast</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    <div className="p-3 md:p-4 bg-orange-50 rounded-2xl md:rounded-3xl">
                      <RefreshCcw className="w-5 h-5 md:w-7 md:h-7 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-[9px] md:text-xs font-black text-gray-900 uppercase tracking-wider">রিটার্ন</h4>
                      <p className="text-[8px] md:text-[10px] text-gray-400">Policy</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            <div className="flex gap-6 md:gap-12 border-b border-gray-100 mb-8 md:mb-10 overflow-x-auto no-scrollbar scroll-smooth">
              {['description', 'delivery', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 md:pb-5 px-1 md:px-2 text-xs md:text-lg font-serif font-medium uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-rose-950 font-black opacity-100' : 'text-gray-400 opacity-60 hover:opacity-100'}`}
                >
                  {tab === 'description' ? 'বিবরণ' : tab === 'delivery' ? 'ডেলিভারি' : `রিভিউ (${toBengaliNumber(reviews.length)})`}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 w-full h-1 bg-rose-950 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm min-h-[300px]"
            >
              {activeTab === 'description' && (
                <div className="prose prose-lg prose-pink max-w-none">
                  <div className="text-gray-650 leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base">
                    {product.description || 'এই প্রোডাক্ট সম্পর্কে বিস্তারিত কোনো তথ্য এখনো দেওয়া হয়নি। আমরা শীঘ্রই এটি আপডেট করার চেষ্টা করছি।'}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    {[
                      { title: 'উচ্চমানের ফর্মুলা', icon: '✨' },
                      { title: 'প্যারাবেন মুক্ত', icon: '🌿' },
                      { title: 'দীর্ঘস্থায়ী ফলাফল', icon: '⏳' },
                      { title: 'সব ধরণের ত্বকের জন্য', icon: '💁‍♀️' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-bold text-gray-800 text-sm md:text-base">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'delivery' && (
                <div className="space-y-8">
                  <div className="bg-rose-500/5 p-8 rounded-3xl border border-rose-500/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                      <Truck className="w-32 h-32 text-rose-950" />
                    </div>
                    <h4 className="text-2xl font-black text-rose-950 mb-6 flex items-center">
                      <div className="w-3 h-3 rounded-full bg-rose-950 mr-3"></div>
                      শিপিং ডিটেইলস
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3">
                        <h5 className="font-black text-gray-900 border-b border-gray-200 pb-2 flex justify-between">
                          <span>ঢাকার ভেতরে</span>
                          <span className="text-rose-500">70 ৳</span>
                        </h5>
                        <p className="text-sm text-gray-500 font-medium">ডেলিভারি সময়: ২৪ - ৪৮ ঘণ্টা (হোম ডেলিভারি)</p>
                      </div>
                      <div className="space-y-3">
                        <h5 className="font-black text-gray-950 border-b border-gray-200 pb-2 flex justify-between">
                          <span>ঢাকার বাইরে</span>
                          <span className="text-rose-500">১৬০ ৳</span>
                        </h5>
                        <p className="text-sm text-gray-500 font-medium">ডেলিভারি সময়: ২ - ৪ দিন (কুরিয়ার সার্ভিস)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div className="space-y-12">
                  {/* Summary & Form Header */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-b border-gray-100 pb-10">
                    <div className="flex flex-col justify-center bg-rose-50/20 p-8 rounded-3xl border border-rose-100/50">
                      <h4 className="text-xl font-serif text-gray-950 font-bold mb-4">গ্রাহকদের মন্তব্য ও রেটিং</h4>
                      <div className="flex items-baseline gap-4 mb-2">
                        <span className="text-5xl font-black text-rose-950 leading-none">{toBengaliNumber(ratingAvg)}</span>
                        <div className="flex flex-col">
                          <div className="flex text-yellow-500 gap-0.5 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-5 h-5 ${i < Math.round(Number(ratingAvg)) ? 'fill-current' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400 font-bold tracking-tight">মোট {toBengaliNumber(ratingCount)}টি রিভিউ</span>
                        </div>
                      </div>
                    </div>

                    {/* Review Form */}
                    <form onSubmit={handlePostReview} className="space-y-4 bg-white p-6 rounded-3xl border border-gray-150/60 shadow-sm">
                      <h5 className="font-serif italic text-base text-rose-950 font-bold mb-2">আপনার মূল্যবান রিভিউ লিখুন</h5>
                      {reviewError && (
                        <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100/50 font-bold">{reviewError}</p>
                      )}
                      {reviewSuccess && (
                        <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100/50 font-bold">{reviewSuccess}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-bold">আপনার নাম</label>
                          <input
                            type="text"
                            required
                            placeholder="যেমন: আফরিন সুলতানা"
                            value={newReviewName}
                            onChange={(e) => setNewReviewName(e.target.value)}
                            className="w-full text-sm font-semibold px-4 py-2.5 border border-gray-205 rounded-xl focus:outline-none focus:border-rose-500 bg-gray-50/30"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-bold">ফোন নম্বর (যে নম্বর দিয়ে অর্ডার করেছিলেন)</label>
                          <input
                            type="tel"
                            required
                            pattern="01[3-9][0-9]{8}"
                            placeholder="যেমন: 01XXXXXXXXX"
                            value={newReviewPhone}
                            onChange={(e) => setNewReviewPhone(e.target.value)}
                            className="w-full text-sm font-semibold px-4 py-2.5 border border-gray-205 rounded-xl focus:outline-none focus:border-rose-500 bg-gray-50/30"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 py-1">
                        <span className="text-xs text-gray-500 font-bold">রেটিং:</span>
                        <div className="flex gap-1 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const starValue = i + 1;
                            return (
                              <button
                                type="button"
                                key={i}
                                onClick={() => setNewReviewRating(starValue)}
                                className="transform active:scale-90 transition-transform"
                              >
                                <Star 
                                  className={`w-6 h-6 ${starValue <= newReviewRating ? 'fill-current text-yellow-500' : 'text-gray-200'}`} 
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-bold">মন্তব্য লিখুন</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="প্রোডাক্টটি কেমন ছিল বলুন..."
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          className="w-full text-sm font-semibold px-4 py-2.5 border border-gray-205 rounded-xl focus:outline-none focus:border-rose-500 bg-gray-50/30"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPostingReview}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center transition-all disabled:opacity-50"
                      >
                        {isPostingReview ? 'পোস্ট করা হচ্ছে...' : 'রিভিউ পোস্ট করুন'}
                      </button>
                    </form>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-serif text-gray-950 font-bold">গ্রাহক রিভিউসমূহ ({toBengaliNumber(reviews.length)})</h4>
                    
                    {reviews.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl">📝</div>
                        <p className="text-gray-400 font-medium mt-3">এই প্রোডাক্টের প্রথম রিভিউয়ার হোন!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reviews.map((rev) => (
                          <div key={rev.id} className="p-6 bg-rose-50/5 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex justify-between items-start gap-4 mb-3">
                              <div>
                                <h5 className="font-bold text-gray-900 text-sm">{rev.name}</h5>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 font-sans">
                                  {new Date(rev.timestamp || Date.now()).toLocaleDateString('bn-BD', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="flex text-yellow-500 gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3.5 h-3.5 ${i < (rev.rating || 5) ? 'fill-current animate-pulse' : 'text-gray-200'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-650 leading-relaxed text-sm font-medium whitespace-pre-wrap">{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-32">
              <div className="flex flex-col md:flex-row justify-between items-baseline mb-8 md:mb-12 gap-3">
                <div className="text-left">
                  <h2 className="text-2xl md:text-5xl lg:text-6xl font-serif font-medium text-gray-900 mb-2 tracking-tight">আপনার ভালো লাগতে পারে</h2>
                  <p className="text-gray-400 text-xs md:text-base font-medium">Elevate your collection with our curation</p>
                </div>
                <a 
                  href={`#/?filter=${product.category || ''}`} 
                  className="group text-rose-950 font-bold flex items-center hover:text-rose-600 transition-colors"
                >
                  সব দেখুন
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {relatedProducts.map((p) => (
                  // @ts-ignore
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            </div>
          )}

          {/* Sticky Bottom Bar for Mobile */}
          {!isOutOfStock && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="lg:hidden fixed bottom-6 left-4 right-4 z-40"
            >
              <div className="bg-rose-500/95 backdrop-blur-2xl rounded-[18px] p-2 shadow-xl flex items-center gap-2 border border-white/20 overflow-hidden">
                <div className="px-3 border-r border-white/20 flex flex-col justify-center">
                  <div className="flex flex-col font-sans">
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-0.5 whitespace-nowrap">সবমোট</span>
                    <span className="text-white text-base font-black italic">{toBengaliNumber((Number(product.price) * (cartItem ? cartItem.quantity : quantity)).toLocaleString('en-US'))}৳</span>
                  </div>
                </div>

                {/* Call Support Quick Access */}
                <a 
                  href="tel:+8801931866636"
                  className="w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-[12px] flex items-center justify-center border border-white/10 transition-all shrink-0 active:scale-95"
                  title="কল সাপোর্ট"
                >
                  <Phone className="w-4 h-4 text-white" />
                </a>

                {cartItem ? (
                  <div className="flex-1 bg-white/10 border border-white/10 rounded-[12px] flex items-center justify-between px-1 h-11">
                    <button 
                      type="button"
                      onClick={() => updateQuantity(id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-white bg-white/10 rounded-[10px] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-white font-bold leading-none">{toBengaliNumber(cartItem.quantity)}টি</span>
                    <button 
                      type="button"
                      onClick={() => updateQuantity(id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-white bg-white/10 rounded-[10px] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!isClickable}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white h-11 rounded-[12px] font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all border border-white/10 disabled:opacity-50 gap-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-white" />
                    <span>কার্ট</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!isClickable}
                  className="flex-[1.4] bg-white text-rose-700 h-11 rounded-[12px] font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-rose-50 border border-white relative overflow-hidden group disabled:opacity-50 gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>کینুন</span>
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
