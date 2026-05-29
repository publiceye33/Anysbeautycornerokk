import React, { useState, useEffect } from 'react';
import { database, auth, googleProvider } from '@/src/lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useStore } from '@/src/lib/store';
import { useRouter } from '@/src/lib/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Phone, 
  LogOut, 
  Loader2, 
  Save, 
  CheckCircle, 
  ArrowLeft,
  Info
} from 'lucide-react';
import LoadingScreen from '@/src/components/LoadingScreen';

export default function ProfileView() {
  const { user, setUser } = useStore();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile fields state
  const [profileData, setProfileData] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    deliveryLocation: 'insideDhaka',
    outsideDhakaLocation: '',
  });

  // Status state for alerts/toasts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
  }, [user]);

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

  return (
    <div className="container mx-auto p-4 max-w-4xl pt-16 pb-12 text-gray-800 font-sans">
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
              আপনার প্রোফাইল তথ্য পরিচালনা ও সেভ করতে অনুগ্রহ করে গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Details Left Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100/80 shadow-sm flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-rose-500/20 shadow-xs group-hover:border-rose-500 transition-colors">
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
              <p className="text-[10px] text-gray-400 font-medium truncate max-w-full mb-6">{user.email}</p>
              
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                লগআউট করুন
              </button>
            </div>
          </div>

          {/* Edit Profile Info Right Panel */}
          <div className="md:col-span-2 space-y-6">
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

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-extrabold text-gray-850 mb-1 border-b pb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-rose-500" />
                প্রোফাইল সংশোধন করুন
              </h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6 mt-1 font-bold">Personal & Billing Details</p>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          </div>
        </div>
      )}
    </div>
  );
}
