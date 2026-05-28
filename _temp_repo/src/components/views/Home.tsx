import { useEffect, useState, Suspense } from 'react';
import { database } from '@/src/lib/firebase';
import { ref, onValue } from 'firebase/database';
import ProductCard from '@/src/components/ProductCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { useSearchParams, useRouter } from '@/src/lib/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ArrowRight, Sparkles, ShoppingBag, CreditCard, ShoppingCart } from 'lucide-react';
import { useStore } from '@/src/lib/store';
import { toBengaliNumber } from '@/src/lib/utils';
import LoadingScreen from '@/src/components/LoadingScreen';

function HomeContent() {
  const router = useRouter();
  const { cart, setIsCartOpen } = useStore();
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const filterCat = searchParams.get('filter');
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    const productsRef = ref(database, 'products/');
    const eventsRef = ref(database, 'events');

    const unsubProducts = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const prods = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setProducts(prods);
      }
      setLoading(false);
    });

    const unsubEvents = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const evts = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(e => e.isActive)
          .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
          .slice(0, 3);
        setEvents(evts);
      }
    });

    return () => {
      unsubProducts();
      unsubEvents();
    };
  }, []);

  let displayProducts = products;
  if (filterCat && filterCat !== 'all') {
    displayProducts = products.filter(p => p.category === filterCat);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    displayProducts = displayProducts.filter(p => 
      p.name.toLowerCase().includes(query) || (p.tags && p.tags.toLowerCase().includes(query))
    );
  }

  const sliderProducts = products.filter(p => p.isInSlider).sort((a, b) => (a.sliderOrder || 99) - (b.sliderOrder || 99));

  return (
    <div className="container mx-auto p-4 md:p-8 pb-32">
      <LoadingScreen isLoading={loading} />
      
      {/* Search Result Indicator */}
      <AnimatePresence>
        {searchQuery && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-rose-500/5 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-rose-500/10"
          >
            <div>
              <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest mb-1">সার্চ রেজাল্ট</p>
              <h2 className="text-xl md:text-3xl font-black text-gray-950 leading-none">
                &quot;{searchQuery}&quot;
              </h2>
            </div>
            <a href="#/" className="bg-rose-500 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-rose-500/10 hover:scale-105 transition-transform w-max">
              সব প্রোডাক্ট দেখুন
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Slider */}
      {!filterCat && !searchQuery && sliderProducts.length > 0 && (
        <section className="mb-10 rounded-[1.5rem] overflow-hidden shadow-xl shadow-rose-500/5 border border-gray-100 h-[280px] md:h-[350px] relative">
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            effect="fade"
            loop={sliderProducts.length > 1}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="w-full h-full"
          >
            {sliderProducts.map((product) => {
              const image = product.image ? product.image.split(',')[0].trim() : 'https://via.placeholder.com/1200x800';
              return (
                <SwiperSlide key={product.id}>
                  <div className="relative w-full h-full group">
                    <img src={image} alt={product.name} className="w-full h-full object-cover sm:object-contain md:object-cover transform group-hover:scale-105 transition-transform duration-[10s] ease-linear" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-transparent flex flex-col justify-center p-6 md:p-14">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      >
                         <span className="inline-block bg-white/20 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] mb-3 border border-white/30">Luxe Choice</span>
                        <h3 className="text-white text-2xl md:text-4xl font-serif italic font-medium mb-3 leading-[1] tracking-tight max-w-lg">{product.name}</h3>
                        <div className="flex items-center gap-3 mb-6">
                          <span className="text-white text-lg md:text-2xl font-serif">{product.price} ৳</span>
                          {product.oldPrice && <span className="text-white/40 text-sm md:text-lg line-through font-light italic">{product.oldPrice} ৳</span>}
                        </div>
                        <a 
                          href={`#/product/${product.id}`}
                          className="group bg-white text-rose-950 hover:bg-rose-500 hover:text-white py-2.5 px-8 rounded-full font-bold text-[9px] uppercase tracking-widest transition-all shadow-xl flex items-center w-max"
                        >
                          Explore Now
                          <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </motion.div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      )}

      {/* Events Slider Upgrade */}
      {!filterCat && !searchQuery && events.length > 0 && (
        <section className="mb-16">
          <div className="flex flex-col items-center mb-6">
            <span className="text-rose-950 font-bold tracking-[0.3em] uppercase text-[8px] mb-1 opacity-50">Special Updates</span>
            <h2 className="text-xl md:text-3xl font-serif italic text-gray-900 tracking-tight">ইভেন্ট ও অফার</h2>
          </div>
          <Swiper
            modules={[Autoplay, Pagination]}
            loop={events.length > 1}
            autoplay={{ delay: 6000 }}
            pagination={{ clickable: true }}
            spaceBetween={15}
            className="rounded-[1.5rem] h-[140px] md:h-[180px]"
          >
            {events.map((event) => (
              <SwiperSlide key={event.id}>
                {event.imageUrl ? (
                  <div 
                    className="w-full h-full bg-cover bg-center rounded-[2rem] shadow-lg relative overflow-hidden group" 
                    style={{ backgroundImage: `url(${event.imageUrl})` }}
                  >
                    <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-6 md:p-10">
                      <h3 className="text-2xl md:text-4xl font-serif italic text-white mb-2 tracking-tight">{event.title}</h3>
                      <p className="text-white/90 text-xs md:text-base font-light max-w-lg line-clamp-2">{event.description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-white flex flex-col justify-center items-center text-center p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                    <Sparkles className="absolute -top-4 -right-4 text-rose-500/5 w-32 h-32 rotate-12" />
                    <span className="text-rose-950/40 font-serif italic text-xs mb-2">Featured Highlight</span>
                    <h3 className="text-2xl md:text-4xl font-serif italic text-gray-900 mb-3 tracking-tight">{event.title}</h3>
                    <p className="text-gray-500 font-medium max-w-xl text-xs md:text-lg leading-relaxed">{event.description}</p>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      )}

      {/* Main Content Info */}
      <section id="categories">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-8 md:mb-12 gap-3">
          <div className="text-left">
            <span className="text-rose-950 font-bold tracking-[0.4em] uppercase text-[8px] md:text-[9px] mb-1 md:mb-2 block opacity-60 ml-px md:ml-1">Curation</span>
            <h2 className="text-2xl md:text-5xl font-serif font-medium text-gray-900 leading-[1] tracking-tight italic">
              {filterCat ? (filterCat === 'skincare' ? 'স্কিনকেয়ার' : filterCat === 'cosmetics' ? 'মেকআপ' : filterCat === 'haircare' ? 'হেয়ারকেয়ার' : filterCat) : 'সকল কালেকশন'}
            </h2>
          </div>
          {filterCat && (
            <a href="#/" className="group text-rose-950 font-bold flex items-center hover:text-rose-550 transition-colors text-xs md:text-sm uppercase tracking-widest">
              সব দেখুন
              <ChevronRight className="ml-1 w-3.5 h-3.5 md:ml-2 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          )}
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-[1rem] md:rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-gray-100 w-full mb-2 md:mb-3"></div>
                <div className="p-3 md:p-4 space-y-2">
                  <div className="h-2.5 md:h-3 bg-gray-100 rounded-full w-3/4"></div>
                  <div className="h-2.5 md:h-3 bg-gray-100 rounded-full w-1/2"></div>
                  <div className="h-8 md:h-10 bg-gray-100 rounded-lg md:rounded-xl w-full mt-3 md:mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-8"
          >
            {displayProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
            <div className="text-7xl mb-6">🏜️</div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">কোনো প্রোডাক্ট পাওয়া যায়নি!</h3>
            <p className="text-gray-400 font-bold max-w-sm mx-auto mb-10">আপনার সার্চ বা ফিল্টারের সাথে মিলে যায় এমন কোনো পণ্য বর্তমানে নেই।</p>
            <a href="#/" className="inline-block px-10 py-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-rose-500/20">
              সব প্রোডাক্ট দেখুন
            </a>
          </div>
        )}
      </section>

      {/* Floating Cart Bar for Home Page */}
      <AnimatePresence>
        {cartItems > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-40 lg:hidden"
          >
            <div className="bg-black/95 backdrop-blur-2xl rounded-[15px] p-1.5 shadow-xl flex items-center gap-2 border border-white/10">
              <div className="px-3 border-r border-white/10">
                <div className="flex flex-col font-sans">
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-0.5">সর্বমোট</span>
                  <span className="text-white text-base font-black italic">{toBengaliNumber(cartTotal.toLocaleString('en-US'))}৳</span>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-[13px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center transition-all border border-white/5"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                কার্ট
              </button>
              
              <button 
                type="button"
                onClick={() => router.push('/order-form')}
                className="flex-[1.5] bg-rose-500 text-white py-2 rounded-[13px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center shadow-lg shadow-rose-500/20 active:scale-95 transition-all hover:bg-rose-600 border border-rose-400/40 relative overflow-hidden group"
              >
                <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-white/95 group-hover:scale-110 transition-transform" />
                কিনুন
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomeView() {
  return (
    <Suspense fallback={<LoadingScreen isLoading={true} />}>
      <HomeContent />
    </Suspense>
  );
}
