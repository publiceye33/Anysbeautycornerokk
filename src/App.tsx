import { useEffect } from 'react';
import { usePathname } from '@/src/lib/navigation';
import { useStore } from '@/src/lib/store';
import { auth } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
  const { setUser } = useStore();

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
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

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

  return (
    <div className="flex flex-col min-h-screen bg-rose-50/10">
      <Header />
      
      <main className="flex-1 pb-16">
        {renderView()}
      </main>
      
      <CartSidebar />
      <Footer />
    </div>
  );
}
