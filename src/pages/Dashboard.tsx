import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Calendar, Wallet, GraduationCap, Users2, Home, Sparkles, ArrowLeft, User, LogOut, History, Clock, Layout, PartyPopper, Youtube, ChevronDown, CheckCircle2 } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const EVENT_SERVICES = [
  { id: 'dj', name: 'DJ Booking', minBudget: 10000, maxBudget: 40000, image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'catering', name: 'Catering Services', minBudget: 300, maxBudget: 900, image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=400', unit: 'per plate' },
  { id: 'makeup', name: 'Makeup Artist', minBudget: 5000, maxBudget: 25000, image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'photography', name: 'Photography', minBudget: 8000, maxBudget: 50000, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'videography', name: 'Videography', minBudget: 10000, maxBudget: 60000, image: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'stage-decoration', name: 'Stage Decoration', minBudget: 10000, maxBudget: 60000, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'balloon-decoration', name: 'Balloon Decoration', minBudget: 2000, maxBudget: 10000, image: 'https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'flower-decoration', name: 'Flower Decoration', minBudget: 5000, maxBudget: 30000, image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'lighting', name: 'Lighting Setup', minBudget: 5000, maxBudget: 25000, image: 'https://images.unsplash.com/photo-1514525253361-bee8718a74a2?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'sound', name: 'Sound System Setup', minBudget: 5000, maxBudget: 20000, image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'invitation', name: 'Invitation Printing', minBudget: 50, maxBudget: 500, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&q=80&w=400', unit: 'per card' },
  { id: 'return-gifts', name: 'Return Gifts', minBudget: 100, maxBudget: 1000, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400', unit: 'per gift' },
  { id: 'cake', name: 'Cake Arrangement', minBudget: 2000, maxBudget: 15000, image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'live-band', name: 'Live Music Band', minBudget: 15000, maxBudget: 80000, image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'anchor', name: 'Event Host / Anchor', minBudget: 5000, maxBudget: 30000, image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'planner', name: 'Wedding Planner', minBudget: 20000, maxBudget: 150000, image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'security', name: 'Security Services', minBudget: 5000, maxBudget: 20000, image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'transport', name: 'Transportation for Guests', minBudget: 5000, maxBudget: 40000, image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400', unit: '' },
  { id: 'accommodation', name: 'Guest Accommodation', minBudget: 2000, maxBudget: 10000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400', unit: 'per room' },
  { id: 'food-stall', name: 'Food Stall Setup', minBudget: 5000, maxBudget: 20000, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400', unit: 'per stall' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [recentEventPlans, setRecentEventPlans] = useState<any[]>([]);
  const [recentVlogs, setRecentVlogs] = useState<any[]>([]);
  const [plannerMode, setPlannerMode] = useState<'travel' | 'event' | 'vlog'>('travel');
  const [formData, setFormData] = useState({
    totalTripBudget: '',
    numberOfPeople: '',
    numberOfDays: '',
    departureCity: '',
    destinationCategory: '',
    destinationPreference: '',
    tripStartTime: ''
  });

  const [eventData, setEventData] = useState({
    eventType: 'wedding',
    budget: '',
    guests: '',
    location: '',
    selectedServices: [] as string[]
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tripPlans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentPlans(plans);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tripPlans');
    });

    const qEvent = query(
      collection(db, 'eventPlans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeEvent = onSnapshot(qEvent, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentEventPlans(plans);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'eventPlans');
    });

    const qVlog = query(
      collection(db, 'vlogHistory'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeVlog = onSnapshot(qVlog, (snapshot) => {
      const vlogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentVlogs(vlogs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'vlogHistory');
    });

    return () => {
      unsubscribe();
      unsubscribeEvent();
      unsubscribeVlog();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEventChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventData(prev => {
      const newData = { ...prev, [name]: value };
      
      // If guests change, recalculate budget if services are selected
      if (name === 'guests' && prev.selectedServices.length > 0) {
        const totalMinBudget = prev.selectedServices.reduce((acc, id) => {
          const service = EVENT_SERVICES.find(s => s.id === id);
          if (service) {
            if (service.unit === 'per plate' || service.unit === 'per card' || service.unit === 'per gift') {
              return acc + (service.minBudget * (parseInt(value) || 1));
            }
            if (service.unit === 'per room') {
              return acc + (service.minBudget * Math.ceil((parseInt(value) || 1) / 2));
            }
            return acc + service.minBudget;
          }
          return acc;
        }, 0);
        newData.budget = totalMinBudget > 0 ? totalMinBudget.toString() : prev.budget;
      }
      
      return newData;
    });
  };

  const toggleService = (serviceId: string) => {
    setEventData(prev => {
      const isSelected = prev.selectedServices.includes(serviceId);
      const newServices = isSelected 
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId];
      
      // Calculate new budget based on selected services
      const totalMinBudget = newServices.reduce((acc, id) => {
        const service = EVENT_SERVICES.find(s => s.id === id);
        if (service) {
          if (service.unit === 'per plate' || service.unit === 'per card' || service.unit === 'per gift') {
            return acc + (service.minBudget * (parseInt(prev.guests) || 1));
          }
          if (service.unit === 'per room') {
            return acc + (service.minBudget * Math.ceil((parseInt(prev.guests) || 1) / 2));
          }
          return acc + service.minBudget;
        }
        return acc;
      }, 0);

      return { 
        ...prev, 
        selectedServices: newServices,
        budget: totalMinBudget > 0 ? totalMinBudget.toString() : prev.budget
      };
    });
  };

  const handleEventSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Navigate to results with event data
    navigate('/results', { state: { ...eventData, mode: 'event' } });
  };

  const handleVlogClick = async (vlog: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'vlogHistory'), {
        userId: user.uid,
        title: vlog.title,
        channel: vlog.channel,
        thumbnail: vlog.thumbnail,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vlogHistory');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Pass data to results page
    navigate('/results', { state: formData });
  };

  return (
    <div className="min-h-screen bg-deep-blue p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-orange to-soft-orange">
                AURA V-SAGE
              </h1>
              <p className="text-sm text-white/60">AI Budget Planner</p>
            </div>
          </div>

          {/* Planner Mode Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/30 rounded-xl hover:bg-white/20 transition-all shadow-lg">
              <Layout size={18} className="text-accent-orange" />
              <span className="text-sm font-bold text-white">
                {plannerMode === 'travel' && 'Travel Budget Planner'}
                {plannerMode === 'event' && 'Event Budget Planner'}
                {plannerMode === 'vlog' && 'Vlog Inspiration'}
              </span>
              <ChevronDown size={16} className="text-white" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-64 bg-deep-blue border border-white/20 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden backdrop-blur-2xl">
              <button 
                onClick={() => setPlannerMode('travel')}
                className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-left hover:bg-white/10 transition-colors border-b border-white/5 ${plannerMode === 'travel' ? 'text-accent-orange bg-white/10' : 'text-white'}`}
              >
                <MapPin size={18} /> Travel Budget Planner
              </button>
              <button 
                onClick={() => setPlannerMode('event')}
                className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-left hover:bg-white/10 transition-colors border-b border-white/5 ${plannerMode === 'event' ? 'text-accent-orange bg-white/10' : 'text-white'}`}
              >
                <PartyPopper size={18} /> Event Budget Planner
              </button>
              <button 
                onClick={() => setPlannerMode('vlog')}
                className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-left hover:bg-white/10 transition-colors ${plannerMode === 'vlog' ? 'text-accent-orange bg-white/10' : 'text-white'}`}
              >
                <Youtube size={18} /> Vlog Inspiration
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.displayName || user?.email}</p>
              <p className="text-xs text-white/50">Explorer</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-white/80" />
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-white/60 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {plannerMode === 'travel' && (
              <motion.div
                key="travel-planner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-10"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold mb-2">Plan Your Next Adventure</h2>
                  <p className="text-white/60">Tell us your budget and preferences, we'll handle the rest.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Total Trip Budget */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Wallet className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Total Trip Budget (₹)</label>
                      </div>
                      <input
                        type="number"
                        name="totalTripBudget"
                        placeholder="e.g. 50000"
                        className="glass-input w-full"
                        value={formData.totalTripBudget}
                        onChange={handleChange}
                        required
                        min="1000"
                      />
                    </div>

                    {/* Number of People */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Users className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Number of People</label>
                      </div>
                      <input
                        type="number"
                        name="numberOfPeople"
                        placeholder="e.g. 40"
                        className="glass-input w-full"
                        value={formData.numberOfPeople}
                        onChange={handleChange}
                        required
                        min="1"
                      />
                    </div>

                    {/* Number of Days */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Calendar className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Number of Days</label>
                      </div>
                      <input
                        type="number"
                        name="numberOfDays"
                        placeholder="e.g. 3"
                        className="glass-input w-full"
                        value={formData.numberOfDays}
                        onChange={handleChange}
                        required
                        min="1"
                        max="30"
                      />
                    </div>

                    {/* Departure City */}
                    <div className="space-y-3 relative">
                      <div className="flex flex-col gap-2">
                        <MapPin className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Departure City</label>
                      </div>
                      <input
                        type="text"
                        name="departureCity"
                        placeholder="e.g. Chennai"
                        className="glass-input w-full"
                        value={formData.departureCity}
                        onChange={handleChange}
                        required
                        list="cities"
                      />
                      <datalist id="cities">
                        <option value="Chennai" />
                        <option value="Bangalore" />
                        <option value="Mumbai" />
                        <option value="Delhi" />
                        <option value="Hyderabad" />
                        <option value="Pune" />
                        <option value="Kolkata" />
                        <option value="Ahmedabad" />
                        <option value="Kochi" />
                        <option value="Coimbatore" />
                      </datalist>
                    </div>

                    {/* Trip Start Time */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Clock className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Trip Start Time</label>
                      </div>
                      <input
                        type="time"
                        name="tripStartTime"
                        className="glass-input w-full"
                        value={formData.tripStartTime}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Destination Preference */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-white">Select Destination Category (Optional)</label>
                    <div className="flex flex-wrap gap-3">
                      {['Pilgrimage', 'Beach', 'Hill Station', 'Adventure', 'Wildlife', 'City Tour'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, destinationCategory: prev.destinationCategory === cat ? '' : cat }))}
                          className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                            formData.destinationCategory === cat
                              ? 'bg-accent-orange border-accent-orange text-white'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3 mt-4 relative">
                      <div className="flex flex-col gap-2">
                        <MapPin className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Specific Destination(s) (Optional)</label>
                      </div>
                      <input
                        type="text"
                        name="destinationPreference"
                        placeholder="e.g. Madurai, Palani, Tiruchendur (comma-separated for round trips)"
                        className="glass-input w-full"
                        value={formData.destinationPreference}
                        onChange={handleChange}
                        list="destinations"
                      />
                      <datalist id="destinations">
                        <option value="Ooty" />
                        <option value="Munnar" />
                        <option value="Goa" />
                        <option value="Manali" />
                        <option value="Shimla" />
                        <option value="Pondicherry" />
                        <option value="Kodaikanal" />
                        <option value="Wayanad" />
                        <option value="Coorg" />
                        <option value="Darjeeling" />
                      </datalist>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4 mt-8">
                    <Sparkles size={24} />
                    Generate AI Trip Plan
                  </button>
                </form>
              </motion.div>
            )}

            {plannerMode === 'event' && (
              <motion.div
                key="event-planner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-10"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold mb-2">Event Budget Planner</h2>
                  <p className="text-white/60">Plan your weddings, parties, or corporate events with AI.</p>
                </div>
                
                <form onSubmit={handleEventSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <PartyPopper className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Event Type</label>
                      </div>
                      <select 
                        name="eventType"
                        value={eventData.eventType}
                        onChange={handleEventChange}
                        className="glass-input w-full"
                      >
                        <option value="wedding">Wedding</option>
                        <option value="birthday">Birthday Party</option>
                        <option value="corporate">Corporate Event</option>
                        <option value="concert">Concert/Show</option>
                        <option value="anniversary">Anniversary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Wallet className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Estimated Budget (₹)</label>
                      </div>
                      <input
                        type="number"
                        name="budget"
                        value={eventData.budget}
                        onChange={handleEventChange}
                        placeholder="e.g. 200000"
                        className="glass-input w-full"
                        required
                        min="5000"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Users2 className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Expected Guests</label>
                      </div>
                      <input
                        type="number"
                        name="guests"
                        value={eventData.guests}
                        onChange={handleEventChange}
                        placeholder="e.g. 150"
                        className="glass-input w-full"
                        required
                        min="1"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <MapPin className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Preferred Location</label>
                      </div>
                      <input
                        type="text"
                        name="location"
                        value={eventData.location}
                        onChange={handleEventChange}
                        placeholder="e.g. Goa, Mumbai"
                        className="glass-input w-full"
                        required
                      />
                    </div>

                    <div className="col-span-full space-y-4 pt-4">
                      <div className="flex flex-col gap-2">
                        <Layout className="text-white" size={20} />
                        <label className="block text-sm font-bold text-white">Select Event Services</label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {EVENT_SERVICES.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            className={`relative group overflow-hidden rounded-xl border-2 transition-all text-left ${
                              eventData.selectedServices.includes(service.id)
                                ? 'border-accent-orange bg-accent-orange/10 shadow-[0_0_15px_rgba(255,107,53,0.3)]'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="aspect-video w-full overflow-hidden">
                              <img 
                                src={service.image} 
                                alt={service.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-3">
                              <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{service.name}</h4>
                              <p className="text-[10px] text-white/50">
                                ₹{service.minBudget.toLocaleString()} - ₹{service.maxBudget.toLocaleString()}
                                {service.unit && <span className="block opacity-60">{service.unit}</span>}
                              </p>
                            </div>
                            {eventData.selectedServices.includes(service.id) && (
                              <div className="absolute top-2 right-2 bg-accent-orange text-white rounded-full p-0.5 shadow-lg">
                                <CheckCircle2 size={14} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 text-center">
                    <Sparkles className="text-accent-orange mx-auto mb-4" size={32} />
                    <h3 className="text-lg font-bold mb-2">AI Event Analysis</h3>
                    <p className="text-sm text-white/70 mb-4">Our AI will analyze your requirements to provide a detailed vendor and cost breakdown.</p>
                    <button type="submit" className="btn-primary px-8 py-3 w-full md:w-auto flex items-center justify-center gap-2 mx-auto">
                      {loading ? 'Analyzing...' : 'Generate Event Dashboard'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {plannerMode === 'vlog' && (
              <motion.div
                key="vlog-inspiration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-10"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold mb-2">Vlog Inspiration</h2>
                  <p className="text-white/60">Trending travel content ideas and storytelling angles.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "24 Hours in a Hidden Paradise", category: "Adventure", views: "Trending", color: "from-red-500/20", channel: "Wanderlust Travel", thumbnail: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80" },
                    { title: "Budget vs Luxury: The Ultimate Comparison", category: "Budget", views: "High Demand", color: "from-blue-500/20", channel: "Budget Backpacker", thumbnail: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80" },
                    { title: "Solo Female Travel: Safety & Secrets", category: "Solo", views: "Viral Potential", color: "from-purple-500/20", channel: "Solo Explorer", thumbnail: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&q=80" },
                    { title: "The Unseen Side of Popular Cities", category: "Culture", views: "Niche", color: "from-emerald-500/20", channel: "Urban Nomad", thumbnail: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&q=80" }
                  ].map((vlog, i) => (
                    <a 
                      key={i} 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(vlog.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleVlogClick(vlog)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-all"
                    >
                      <div className={`aspect-video bg-gradient-to-br ${vlog.color} to-black flex items-center justify-center relative`}>
                        <Youtube className="text-white/20 group-hover:text-red-500 transition-colors" size={48} />
                        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                          12:45
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-sm group-hover:text-red-500 transition-colors line-clamp-2 mb-2">{vlog.title}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">{vlog.category}</span>
                          <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{vlog.views}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-accent-orange" />
                    AI Content Strategy
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Based on current travel trends, viewers are looking for "Authentic Experiences" over "Perfect Aesthetics". Focus on raw storytelling and real budget breakdowns in your next vlog.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <History className="text-accent-orange" size={20} />
                <h3 className="text-lg font-bold">
                  {plannerMode === 'event' ? 'Recent Event Plans' : plannerMode === 'vlog' ? 'Recent Vlog History' : 'Recent Trip Plans'}
                </h3>
              </div>

              <div className="space-y-4">
                {plannerMode === 'vlog' ? (
                  recentVlogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Youtube className="text-white/20 mx-auto mb-2" size={32} />
                      <p className="text-sm text-white/40">No recent vlog history yet.</p>
                    </div>
                  ) : (
                    recentVlogs.map((vlog) => (
                      <a
                        key={vlog.id}
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(vlog.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-white/10 relative">
                          {vlog.thumbnail ? (
                            <img src={vlog.thumbnail} alt={vlog.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Youtube className="absolute inset-0 m-auto text-white/40" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white group-hover:text-red-500 transition-colors truncate">
                            {vlog.title}
                          </h4>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-white/50 truncate pr-2">{vlog.channel}</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-wider shrink-0">
                              {vlog.createdAt?.toDate ? new Date(vlog.createdAt.toDate()).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </a>
                    ))
                  )
                ) : plannerMode === 'event' ? (
                  recentEventPlans.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="text-white/20 mx-auto mb-2" size={32} />
                      <p className="text-sm text-white/40">No recent event plans yet.</p>
                    </div>
                  ) : (
                    recentEventPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => navigate('/results', { state: { 
                          ...plan, 
                          budget: plan.budget?.toString() || '',
                          guests: plan.guests?.toString() || '',
                          mode: 'event' 
                        }})}
                        className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white group-hover:text-accent-orange transition-colors capitalize">
                            {plan.eventType} Plan
                          </h4>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">
                            {plan.createdAt?.toDate ? new Date(plan.createdAt.toDate()).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1"><Users size={12} /> {plan.guests}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {plan.location}</span>
                          <span className="flex items-center gap-1 text-green-400">₹{plan.budget}</span>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  recentPlans.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="text-white/20 mx-auto mb-2" size={32} />
                      <p className="text-sm text-white/40">No recent plans yet.</p>
                    </div>
                  ) : (
                    recentPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => navigate('/results', { state: {
                          totalTripBudget: plan.totalTripBudget?.toString() || '',
                          numberOfPeople: plan.numberOfPeople?.toString() || '',
                          numberOfDays: plan.numberOfDays?.toString() || '',
                          departureCity: plan.departureCity || '',
                          destinationPreference: plan.destinationPreference || '',
                          destinationCategory: plan.destinationCategory || '',
                          tripStartTime: plan.tripStartTime || ''
                        }})}
                        className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white group-hover:text-accent-orange transition-colors">
                            {plan.plan?.destinations?.[0]?.name || 'Trip Plan'}
                          </h4>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">
                            {plan.createdAt?.toDate ? new Date(plan.createdAt.toDate()).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1"><Users size={12} /> {plan.numberOfPeople}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} /> {plan.numberOfDays}d</span>
                          <span className="flex items-center gap-1 text-green-400">₹{plan.totalTripBudget}</span>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 bg-gradient-to-br from-accent-orange/10 to-transparent border-accent-orange/20"
            >
              <h3 className="text-lg font-bold mb-2">Community Feed</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                See what other explorers are planning and share your own moments!
              </p>
              <button 
                onClick={() => navigate('/community')}
                className="w-full bg-accent-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <Users2 size={18} /> Explore Feed
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Group trips are cheaper! AURA V-SAGE automatically optimizes transport and stay costs when you increase the number of people.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
