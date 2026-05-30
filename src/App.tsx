import { useEffect, useState } from 'react';
import { usePathname } from '@/src/lib/navigation';
import { useStore } from '@/src/lib/store';
import { auth, database } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get, set } from 'firebase/database';

// Layout & UI components
import Header from '@/src/components/Header';
import CartSidebar from '@/src/components/CartSidebar';
import Footer from '@/src/components/Footer';

// Views
import HomeView from '@/src/components/views/Home';
import ProductDetail from '@/src/components/views/ProductDetail';
import OrderFormView from '@/src/components/views/OrderForm';
import OrderTrackView from '@/src/components/views/OrderTrack';
import ThankYouView from '@/src/components/views/ThankYou';
import ProfileView from '@/src/components/views/Profile';
import NotificationsView from '@/src/components/views/Notifications';

export default function App() {
  const pathname = usePathname();
  const { setUser, setCategories, setLogoUrl, rtdbError, setRtdbError } = useStore();

  // Listen to logoUrl in Firebase RTDB
  useEffect(() => {
    if (!setLogoUrl) return;
    const logoRef = ref(database, 'settings/logoUrl');
    const unsubLogo = onValue(logoRef, (snapshot) => {
      if (snapshot.exists()) {
        setLogoUrl(snapshot.val());
      } else {
        setLogoUrl('');
      }
    });

    return () => {
      unsubLogo();
    };
  }, [setLogoUrl]);

  // Listen to categories in Firebase RTDB
  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const unsubCats = onValue(categoriesRef, (snapshot) => {
      try {
        if (setRtdbError) {
          setRtdbError(null);
        }
        if (snapshot.exists()) {
          const val = snapshot.val();
          let list: any[] = [];
          if (Array.isArray(val)) {
            list = val.map((item, idx) => {
              if (item && typeof item === 'object') {
                return { ...item, id: item.id || String(idx) };
              }
              return { id: String(idx), name: String(item) };
            }).filter(Boolean);
          } else if (typeof val === 'object' && val !== null) {
            list = Object.keys(val).map(k => {
              const item = val[k];
              if (item && typeof item === 'object') {
                return { ...item, id: item.id || k };
              }
              return { id: k, name: String(item) };
            });
          }
          // Filter out categories that don't have a valid name
          list = list.filter(item => item && item.name && typeof item.name === 'string' && item.name.trim() !== '');
          console.log("Categories successfully loaded from RTDB:", list);
          setCategories(list);
        } else {
          console.info("Categories node is empty in RTDB");
          setCategories([]);
        }
      } catch (err) {
        console.error("Error parsing categories snapshot:", err);
      }
    }, (error) => {
      console.error("Firebase read error categoriesRef:", error);
      if (setRtdbError) {
        setRtdbError(error.message || String(error));
      }
    });

    return () => {
      unsubCats();
    };
  }, [setCategories, setRtdbError]);

  // Scroll Restoration Manager
  useEffect(() => {
    // Ensure initial entry has index
    if (!window.history.state || typeof window.history.state.customIdx !== 'number') {
      window.history.replaceState({ customIdx: 0 }, '', window.location.href);
    }

    let lastIdx = window.history.state?.customIdx ?? 0;

    // Passive scroll listener with debounced position tracking
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentIdx = window.history.state?.customIdx;
        if (typeof currentIdx === 'number') {
          sessionStorage.setItem(`scroll_pos_${currentIdx}`, window.scrollY.toString());
        }
      }, 50);
    };

    const handleHashChange = () => {
      const currentState = window.history.state;
      let newIdx = currentState?.customIdx;

      if (typeof newIdx !== 'number') {
        newIdx = lastIdx + 1;
        window.history.replaceState({ customIdx: newIdx }, '', window.location.href);
      }

      if (newIdx < lastIdx) {
        // Back navigation - restore scroll
        const savedScroll = sessionStorage.getItem(`scroll_pos_${newIdx}`);
        if (savedScroll !== null) {
          setTimeout(() => {
            window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'auto' });
          }, 80); // Slight delay for React DOM to render and layout
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else {
        // Forward navigation - scroll to top
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      lastIdx = newIdx;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    // Initial scroll-to-top for default load
    window.scrollTo({ top: 0, behavior: 'auto' });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Handle baseline user authentication state tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Also ensure user exists in database when auth state triggers
        const userRef = ref(database, `users/${user.uid}`);
        get(userRef).then((snapshot) => {
          if (!snapshot.exists()) {
            set(userRef, {
              name: user.displayName || 'N/A',
              email: user.email || 'N/A',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
            });
          }
        }).catch((err) => {
          console.warn("DB user sync warning (might be offline/restricted):", err);
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  // Dynamic document.title update based on pathname route changes
  useEffect(() => {
    if (pathname === '/') {
      document.title = "Any's Beauty Corner | ১০০% অথেন্টিক বিউটি প্রোডাক্ট";
    } else if (pathname === '/order-form') {
      document.title = "অর্ডার করুন | Any's Beauty Corner";
    } else if (pathname === '/order-track') {
      document.title = "অর্ডার ট্র্যাক করুন | Any's Beauty Corner";
    } else if (pathname === '/profile') {
      document.title = "আমার প্রোফাইল | Any's Beauty Corner";
    } else if (pathname === '/notifications') {
      document.title = "নোটিফিকেশন | Any's Beauty Corner";
    } else if (pathname === '/thank-you') {
      document.title = "ধন্যবাদ! | Any's Beauty Corner";
    } else if (pathname.startsWith('/product/')) {
      document.title = "প্রোডাক্ট বিবরণ | Any's Beauty Corner";
    }
  }, [pathname]);

  // Handle client SPA router views routing
  const renderView = () => {
    if (pathname === '/order-form') {
      return <OrderFormView />;
    } else if (pathname === '/order-track') {
      return <OrderTrackView />;
    } else if (pathname === '/thank-you') {
      return <ThankYouView />;
    } else if (pathname === '/profile') {
      return <ProfileView />;
    } else if (pathname === '/notifications') {
      return <NotificationsView />;
    } else if (pathname.startsWith('/product/')) {
      const productId = pathname.substring('/product/'.length);
      return <ProductDetail id={productId} />;
    } else {
      return <HomeView />;
    }
  };

  const [showRulesAlert, setShowRulesAlert] = useState(true);
  const [copiedRules, setCopiedRules] = useState(false);

  const rulesText = `{
  "rules": {
    "products": {
      ".read": "true",
      ".write": "auth != null && auth.token.email === 'mdnahidislam6714@gmail.com'"
    },
    "categories": {
      ".read": "true",
      ".write": "auth != null && auth.token.email === 'mdnahidislam6714@gmail.com'"
    },
    "settings": {
      ".read": "true",
      ".write": "auth != null && auth.token.email === 'mdnahidislam6714@gmail.com'"
    },
    "events": {
      ".read": "true",
      ".write": "auth != null && auth.token.email === 'mdnahidislam6714@gmail.com'"
    },
    "reviews": {
      "$productId": {
        ".read": "true",
        "$reviewId": {
          ".write": "true" 
        }
      }
    },
    "orders": {
      ".read": "auth != null && auth.token.email === 'mdnahidislam6714@gmail.com'",
      "$orderId": {
        ".read": "true", 
        ".write": "data.val() == null || (auth != null && auth.token.email === 'mdnahidislam6714@gmail.com')" 
      }
    },
    "users": {
      "$userId": {
        ".read": "auth != null && (auth.uid === $userId || auth.token.email === 'mdnahidislam6714@gmail.com')",
        ".write": "auth != null && (auth.uid === $userId || auth.token.email === 'mdnahidislam6714@gmail.com')"
      }
    },
    "counters": {
      ".read": "true",
      ".write": "true"
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(rulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-rose-50/10">
      <Header />
      
      {rtdbError && showRulesAlert && (
        <div className="bg-amber-50 border-y border-amber-200 text-amber-900 p-4 md:p-6 transition-all duration-300">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-4 justify-between">
            <div className="flex-1">
              <h3 className="text-base md:text-lg font-bold text-amber-800 flex items-center gap-2 mb-1.5 md:mb-2">
                <span>⚠️</span> ফায়ারবেস পারমিশন ডিনাইড (Firebase Permission Denied)
              </h3>
              <p className="text-xs md:text-sm text-amber-950 mb-4 max-w-3xl leading-relaxed">
                আপনার ফায়ারবেস রিয়েলটাইম ডাটাবেসে <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono font-bold text-xs">/categories</code> নোডটি রিড করার পারমিশন ব্লকড রয়েছে। সমাধান করতে, আপনার <strong>Firebase Console</strong>-এ গিয়ে <strong>Realtime Database &gt; Rules</strong> ট্যাবটি ওপেন করুন এবং নিচের কোডটি পেস্ট করে <strong>Publish</strong> বাটনে ক্লিক করুন।
              </p>
              
              <div className="relative mt-2 rounded-xl bg-gray-900 text-gray-100 p-4 font-mono text-[11px] md:text-xs overflow-x-auto max-h-[220px] shadow-inner">
                <button 
                  onClick={handleCopyRules}
                  className="absolute top-2.5 right-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold py-1 px-2.5 rounded text-[10px] uppercase transition-colors"
                >
                  {copiedRules ? 'কপি হয়েছে!' : 'কোড কপি করুন'}
                </button>
                <pre>{rulesText}</pre>
              </div>
            </div>
            <button 
              onClick={() => setShowRulesAlert(false)}
              className="text-amber-500 hover:text-amber-800 font-bold text-xs bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg shrink-0 transition-colors"
            >
              বন্ধ করুন (Dismiss)
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16">
        {renderView()}
      </main>
      
      <CartSidebar />
      <Footer />
    </div>
  );
}
