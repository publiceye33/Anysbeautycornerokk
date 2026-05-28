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

export default function App() {
  const pathname = usePathname();
  const { setUser } = useStore();

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
