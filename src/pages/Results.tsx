import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, MapPin, Calendar, Users, Wallet, 
  Download, Share2, AlertTriangle, ShieldAlert, 
  PlayCircle, FileText, FileSpreadsheet, Star,
  TrendingUp, Navigation, Clock, Hotel, Utensils,
  CheckSquare, ListTodo, ClipboardList, Briefcase, UserPlus,
  Youtube, Sparkles
} from 'lucide-react';
import { generateTripPlan, TripPlan, generateEventPlan, EventPlan } from '../services/geminiService';
import { exportToPDF, exportToExcel, exportIVApprovalPDF, exportEventToPDF } from '../utils/exportUtils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const formData = location.state || {
    mode: 'travel',
    totalTripBudget: '50000',
    numberOfPeople: '1',
    numberOfDays: '3',
    departureCity: 'Chennai',
    destinationCategory: '',
    destinationPreference: 'Hill Station',
    tripStartTime: ''
  };

  const mode = formData.mode || 'travel';
  const [activeTab, setActiveTab] = useState(mode === 'travel' ? 'destinations' : 'event-overview');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [eventPlan, setEventPlan] = useState<EventPlan | null>(null);

  const savePlanToFirestore = async (plan: any) => {
    if (!auth.currentUser) return;
    
    try {
      if (mode === 'travel') {
        await addDoc(collection(db, 'tripPlans'), {
          userId: auth.currentUser.uid,
          totalTripBudget: parseInt(formData.totalTripBudget),
          numberOfPeople: parseInt(formData.numberOfPeople),
          numberOfDays: parseInt(formData.numberOfDays),
          departureCity: formData.departureCity,
          destinationPreference: formData.destinationPreference,
          destinationCategory: formData.destinationCategory,
          plan: plan,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'eventPlans'), {
          userId: auth.currentUser.uid,
          eventType: formData.eventType,
          budget: parseInt(formData.budget),
          guests: parseInt(formData.guests),
          location: formData.location,
          plan: plan,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, mode === 'travel' ? 'tripPlans' : 'eventPlans');
    }
  };

  const totalBudget = mode === 'travel' ? parseInt(formData.totalTripBudget) : parseInt(formData.budget);
  const numberOfPeople = mode === 'travel' ? parseInt(formData.numberOfPeople) : parseInt(formData.guests);
  const isSolo = mode === 'travel' && numberOfPeople === 1;
  const perHeadBudget = totalBudget / numberOfPeople;
  
  const transportCost = totalBudget * 0.4;
  const stayCost = totalBudget * 0.25;
  const foodCost = totalBudget * 0.2;
  const ticketsCost = totalBudget * 0.1;
  const emergencyBuffer = totalBudget * 0.05;
  const isLowBudget = perHeadBudget < 5000;
  
  useEffect(() => {
    let isMounted = true;
    const fetchPlan = async () => {
      try {
        if (mode === 'travel') {
          const plan = await generateTripPlan(
            parseInt(formData.totalTripBudget),
            parseInt(formData.numberOfPeople),
            parseInt(formData.numberOfDays),
            formData.departureCity,
            formData.destinationPreference,
            formData.destinationCategory,
            formData.tripStartTime
          );
          if (isMounted) {
            setTripPlan(plan);
            setLoading(false);
            triggerConfetti();
            savePlanToFirestore(plan);
          }
        } else {
          const plan = await generateEventPlan(
            formData.eventType,
            parseInt(formData.budget),
            parseInt(formData.guests),
            formData.location,
            formData.selectedServices || []
          );
          if (isMounted) {
            setEventPlan(plan);
            setLoading(false);
            triggerConfetti();
            savePlanToFirestore(plan);
            setActiveTab('event-overview');
          }
        }
      } catch (error) {
        console.error("Failed to generate plan:", error);
      }
    };
    fetchPlan();
    return () => { isMounted = false; };
  }, [formData]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleExportPDF = () => {
    if (mode === 'travel' && tripPlan) {
      exportToPDF(tripPlan, formData, totalBudget);
    } else if (mode === 'event' && eventPlan) {
      exportEventToPDF(eventPlan, formData);
    }
  };

  const handleExportExcel = () => {
    if (tripPlan) {
      exportToExcel(tripPlan, formData);
    }
  };

  const handleExportIVApproval = () => {
    if (tripPlan) {
      exportIVApprovalPDF(tripPlan, formData);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AURA V-SAGE Trip Plan',
        text: `Check out this trip plan to ${tripPlan?.destinations[0]?.name}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (loading || (mode === 'travel' && !tripPlan) || (mode === 'event' && !eventPlan)) {
    return (
      <div className="min-h-screen bg-deep-blue flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-white/20 border-t-accent-orange rounded-full mb-8"
        />
        <motion.h2 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl font-bold text-white mb-2"
        >
          {mode === 'travel' ? 'Optimizing Your Trip...' : 'Planning Your Event...'}
        </motion.h2>
        <p className="text-white/60 text-center max-w-md">
          {mode === 'travel' 
            ? 'AURA V-SAGE is calculating the best routes, finding budget stays, and generating your master itinerary.'
            : 'AURA V-SAGE is curating vendor lists, optimizing your budget, and building your event checklist.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-blue text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-deep-blue/80 backdrop-blur-xl border-b border-white/10 p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-white/60 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-orange to-soft-orange hidden md:block">
              AURA V-SAGE
            </h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
              <Share2 size={16} /> Share
            </button>
            {mode === 'travel' ? (
              <>
                <button onClick={handleExportExcel} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                  <Download size={16} /> Export Excel
                </button>
                <button onClick={handleExportPDF} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                  <Download size={16} /> Download Trip PDF
                </button>
              </>
            ) : (
              <button onClick={handleExportPDF} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                <Download size={16} /> Download Event PDF
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Success Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="text-green-400" size={24} />
          </div>
          <div>
            <h3 className="text-green-400 font-semibold">
              {mode === 'travel' ? 'Trip Optimized Successfully!' : 'Event Planned Successfully!'}
            </h3>
            <p className="text-sm text-green-400/80">
              {mode === 'travel' 
                ? `Your ${isSolo ? 'Solo Travel' : 'Group'} plan is ready within your budget.`
                : `Your ${formData.eventType} plan is ready for ${formData.guests} guests.`}
            </p>
          </div>
        </motion.div>

        {isSolo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-accent-orange/20 border border-accent-orange/30 rounded-2xl p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-orange/20 rounded-full flex items-center justify-center">
                <ShieldAlert className="text-accent-orange" size={28} />
              </div>
              <div>
                <h3 className="text-accent-orange font-bold text-lg">SOLO TRAVEL MODE ACTIVE</h3>
                <p className="text-white/70 text-sm">Optimized for safety, viewpoints, and biker-friendly routes.</p>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="px-4 py-1 rounded-full bg-accent-orange text-white text-xs font-bold uppercase tracking-wider">
                Safe & Secure
              </span>
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard 
            icon={Wallet} 
            label="Total Budget" 
            value={`₹${(mode === 'travel' ? totalBudget : formData.budget).toLocaleString()}`} 
          />
          <SummaryCard 
            icon={Users} 
            label={mode === 'travel' ? "Group Size" : "Guests"} 
            value={mode === 'travel' ? `${formData.numberOfPeople} People` : `${formData.guests} People`} 
          />
          <SummaryCard 
            icon={Calendar} 
            label={mode === 'travel' ? "Duration" : "Event Type"} 
            value={mode === 'travel' ? `${formData.numberOfDays} Days` : formData.eventType} 
          />
          <SummaryCard 
            icon={MapPin} 
            label={mode === 'travel' ? "From" : "Location"} 
            value={mode === 'travel' ? formData.departureCity : formData.location} 
          />
        </div>

        {/* Budget Alert (if applicable) */}
        {isLowBudget && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-4">
            <AlertTriangle className="text-yellow-400 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-yellow-400 font-semibold">Budget Optimization Active</h3>
              <p className="text-sm text-yellow-400/80 mt-1">
                Your per-head budget is tight (₹{Math.round(perHeadBudget)}). We've optimized the plan to include affordable options to ensure you stay within limits.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Tabs */}
        <div className="glass-card overflow-hidden">
          <div className="flex overflow-x-auto border-b border-white/10 hide-scrollbar">
            {mode === 'travel' ? (
              <>
                <TabButton active={activeTab === 'destinations'} onClick={() => setActiveTab('destinations')} label="Trip Overview" />
                <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')} label="Budget Breakdown" />
                <TabButton active={activeTab === 'hotels'} onClick={() => setActiveTab('hotels')} label="Hotels & Food" />
                <TabButton active={activeTab === 'itinerary'} onClick={() => setActiveTab('itinerary')} label="Master Itinerary" />
                <TabButton 
                  active={activeTab === 'vlog'} 
                  onClick={() => setActiveTab('vlog')} 
                  label={
                    <span className="flex items-center gap-2">
                      Vlog Engine
                      <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
                    </span>
                  } 
                />
                <TabButton active={activeTab === 'safety'} onClick={() => setActiveTab('safety')} label="Safety & Approvals" />
              </>
            ) : (
              <>
                <TabButton active={activeTab === 'event-overview'} onClick={() => setActiveTab('event-overview')} label="Event Overview" />
                <TabButton active={activeTab === 'event-budget'} onClick={() => setActiveTab('event-budget')} label="Budget Breakdown" />
                <TabButton active={activeTab === 'event-checklist'} onClick={() => setActiveTab('event-checklist')} label="Checklist" />
                <TabButton active={activeTab === 'event-itinerary'} onClick={() => setActiveTab('event-itinerary')} label="Event Schedule" />
              </>
            )}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {mode === 'travel' ? (
                <>
                  {activeTab === 'destinations' && tripPlan && (
                    <motion.div
                      key="destinations"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <h2 className="text-2xl font-bold mb-6">Places Covered</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tripPlan.destinations.map((dest, index) => (
                          <DestinationCard 
                            key={index}
                            type={dest.type} 
                            name={dest.name} 
                            cost={dest.cost} 
                            distance={dest.distance} 
                            score={dest.score} 
                            rating={dest.rating}
                            image={`https://picsum.photos/seed/${dest.imageKeyword}/600/400`}
                            vlogTitle={dest.vlogTitle}
                          />
                        ))}
                      </div>

                      {/* Transport Discovery Section */}
                      <div className="mt-12">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold">Transport Discovery</h2>
                          {formData.tripStartTime && (
                            <span className="text-sm text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                              Departing after {formData.tripStartTime}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {tripPlan.transportOptions.map((transport, index) => (
                            <TransportCard key={index} transport={transport} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'budget' && tripPlan && (
                    <motion.div
                      key="budget"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Budget Intelligence</h2>
                        <button onClick={handleExportExcel} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                          <FileSpreadsheet size={16} /> Download Excel
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <BudgetItem label="Transport (40%)" amount={transportCost} desc={isLowBudget ? "Non-AC Bus Rental" : "AC Sleeper Bus"} />
                          <BudgetItem label="Stay (25%)" amount={stayCost} desc={isLowBudget ? "Dormitories (6-sharing)" : "Hotel Rooms (3-sharing)"} />
                          <BudgetItem label="Food (20%)" amount={foodCost} desc="3 Meals/Day (Budget Restaurants)" />
                          <BudgetItem label="Tickets & Entry (10%)" amount={ticketsCost} desc="Sightseeing & Activities" />
                          <BudgetItem label="Emergency Buffer (5%)" amount={emergencyBuffer} desc="Reserved for unexpected costs" />
                        </div>
                        
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col justify-center items-center text-center">
                          <div className="w-48 h-48 rounded-full border-8 border-white/10 flex items-center justify-center relative mb-6">
                            <div className="absolute inset-0 rounded-full border-8 border-accent-orange border-t-transparent border-r-transparent transform -rotate-45"></div>
                            <div className="absolute inset-0 rounded-full border-8 border-ocean-blue border-b-transparent border-l-transparent transform rotate-45"></div>
                            <div>
                              <p className="text-sm text-white font-bold">Total Pool</p>
                              <p className="text-2xl font-bold text-accent-orange">₹{totalBudget.toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-sm text-white font-medium max-w-xs">
                            This allocation ensures all major expenses are covered while keeping a 5% buffer for safety.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'hotels' && tripPlan && (
                    <motion.div
                      key="hotels"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-12"
                    >
                      <section>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                          <Hotel className="text-accent-orange" /> Recommended Stays
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {tripPlan.hotels && tripPlan.hotels.length > 0 ? (
                            tripPlan.hotels.map((hotel, index) => (
                              <HotelCard key={index} hotel={hotel} />
                            ))
                          ) : (
                            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-white/10">
                              <Hotel className="mx-auto mb-4 text-white/40" size={48} />
                              <p className="text-white font-medium">No specific hotel recommendations found for this route.</p>
                            </div>
                          )}
                        </div>
                      </section>

                      <section>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                          <Utensils className="text-accent-orange" /> Restaurant Suggestions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {tripPlan.restaurants && tripPlan.restaurants.length > 0 ? (
                            tripPlan.restaurants.map((restaurant, index) => (
                              <RestaurantCard key={index} restaurant={restaurant} />
                            ))
                          ) : (
                            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-white/10">
                              <Utensils className="mx-auto mb-4 text-white/40" size={48} />
                              <p className="text-white font-medium">No specific restaurant suggestions found for this route.</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'itinerary' && tripPlan && (
                    <motion.div
                      key="itinerary"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Master Itinerary</h2>
                        <button 
                          onClick={() => {
                            if (!tripPlan) return;
                            const origin = encodeURIComponent(formData.departureCity);
                            // Get all location queries from the itinerary
                            const allLocations = tripPlan.itinerary.flatMap(day => 
                              day.activities.map(a => a.locationQuery || a.desc)
                            ).filter(Boolean);
                            
                            if (allLocations.length === 0) return;
                            
                            const destination = encodeURIComponent(allLocations[allLocations.length - 1]);
                            const waypoints = allLocations.slice(0, -1).map(loc => encodeURIComponent(loc)).join('|');
                            
                            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
                            window.open(mapsUrl, '_blank');
                          }}
                          className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                        >
                          <Navigation size={16} /> View Full Route on Maps
                        </button>
                      </div>
                      
                      <div className="space-y-8">
                        {tripPlan.itinerary.map((dayPlan) => (
                          <div key={dayPlan.day} className="mb-8">
                            <h3 className="text-xl font-bold text-accent-orange mb-4">Day {dayPlan.day}</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/20">
                                    <th className="p-3 font-bold text-white">Time</th>
                                    <th className="p-3 font-bold text-white">Activity</th>
                                    <th className="p-3 font-bold text-white">Location</th>
                                    <th className="p-3 font-bold text-white">Distance</th>
                                    <th className="p-3 font-bold text-white">Budget</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayPlan.activities.map((activity, idx) => (
                                    <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-sm text-white font-medium whitespace-nowrap">{activity.time}</td>
                                      <td className="p-3 text-sm font-bold text-white">{activity.title}</td>
                                      <td className="p-3 text-sm text-white font-medium">
                                        <div className="flex items-center gap-2">
                                          {activity.desc}
                                          {(activity.locationQuery || activity.desc) && (
                                            <a 
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.locationQuery || activity.desc)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-accent-orange hover:text-soft-orange"
                                              title="View on Maps"
                                            >
                                              <MapPin size={14} />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3 text-sm text-white font-bold">{activity.distanceFromPrevious || '-'}</td>
                                      <td className="p-3 text-sm text-green-400 font-bold">₹{activity.cost}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'vlog' && tripPlan && (
                    <motion.div
                      key="vlog"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          <Youtube className="text-red-500" /> Vlog Content Strategy
                        </h2>
                        <div className="text-xs text-white font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20">
                          AI Generated Concepts
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {tripPlan.vlogIdeas.map((idea, index) => (
                          <div key={index} className="glass-card overflow-hidden border-white/10 hover:border-red-500/50 transition-all group">
                            {/* Thumbnail Placeholder */}
                            <div className="aspect-video bg-gradient-to-br from-red-600/20 to-black relative flex items-center justify-center overflow-hidden">
                              <Youtube className="text-red-600/20 absolute scale-[3]" size={64} />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                              <div className="relative z-10 text-center p-4">
                                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Thumbnail Concept</p>
                                <p className="text-sm text-white/90 font-medium line-clamp-2 px-4 italic">"{idea.thumbnailIdea}"</p>
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-white">
                                10:00
                              </div>
                            </div>

                            <div className="p-6 space-y-4">
                              <div className="flex justify-between items-start gap-4">
                                <h3 className="text-lg font-bold text-white group-hover:text-red-500 transition-colors leading-tight">{idea.title}</h3>
                                <a 
                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(idea.title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 p-2 bg-red-500/10 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                  title="Research on YouTube"
                                >
                                  <Youtube size={16} />
                                </a>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-white/10 border border-white/10">
                                  <p className="text-[10px] text-white font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Sparkles size={10} className="text-red-500" /> The Hook (First 10s)
                                  </p>
                                  <p className="text-sm text-white font-medium italic leading-relaxed">"{idea.hook}"</p>
                                </div>
                                
                                <div>
                                  <p className="text-[10px] text-white font-bold uppercase tracking-wider mb-1">Content Strategy</p>
                                  <p className="text-sm text-white font-medium leading-relaxed">{idea.description}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                          <Sparkles size={18} className="text-red-500" />
                          Pro Creator Tip
                        </h3>
                        <p className="text-sm text-white font-medium leading-relaxed">
                          For the best engagement, focus on "Budget vs. Reality" comparisons. Viewers love seeing the actual costs and hidden gems that aren't in the usual tourist guides.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'safety' && tripPlan && (
                    <motion.div
                      key="safety"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Safety & Emergency</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="text-red-400" size={24} />
                            <h3 className="text-lg font-semibold text-red-400">Emergency Contacts</h3>
                          </div>
                          <ul className="space-y-3 text-sm text-white font-medium">
                            <li className="flex justify-between border-b border-white/10 pb-2">
                              <span>Nearest Hospital</span>
                              <span className="font-bold text-right max-w-[60%]">{tripPlan.emergencyContacts.hospital}</span>
                            </li>
                            <li className="flex justify-between border-b border-white/10 pb-2">
                              <span>Police Station</span>
                              <span className="font-bold text-right max-w-[60%]">{tripPlan.emergencyContacts.police}</span>
                            </li>
                            <li className="flex justify-between border-b border-white/10 pb-2">
                              <span>Emergency Helpline</span>
                              <span className="font-bold text-right max-w-[60%] text-accent-orange">{tripPlan.emergencyContacts.helpline}</span>
                            </li>
                            <li className="flex justify-between border-b border-white/10 pb-2">
                              <span>Local Helpline</span>
                              <span className="font-medium">108 / 100</span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                          <h3 className="text-lg font-semibold mb-4">Safety Guidelines</h3>
                          <div className="space-y-3 text-sm text-white font-medium">
                            <p><strong className="text-white">Solo Safety:</strong> Always share your live location with family/friends.</p>
                            <p><strong className="text-white">Travel:</strong> Avoid traveling late at night in unfamiliar areas.</p>
                            <p><strong className="text-white">Health:</strong> Keep a basic first-aid kit and essential medicines.</p>
                            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-xs italic text-white/80">"Your safety is our priority. AURA V-SAGE has selected verified safe locations."</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  {activeTab === 'event-overview' && eventPlan && (
                    <motion.div
                      key="event-overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <h2 className="text-2xl font-bold mb-6">Recommended Vendors</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {eventPlan.vendors.map((vendor, index) => (
                          <VendorCard key={index} vendor={vendor} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'event-budget' && eventPlan && (
                    <motion.div
                      key="event-budget"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Budget Breakdown</h2>
                        <div className="text-right">
                          <p className="text-sm text-white font-bold">Cost Per Guest</p>
                          <p className="text-xl font-bold text-accent-orange">₹{Math.round(totalBudget / numberOfPeople).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          {eventPlan.budgetBreakdown.map((item, index) => (
                            <BudgetProgress 
                              key={index}
                              label={item.category}
                              amount={item.allocatedAmount}
                              percentage={item.percentage}
                              total={totalBudget}
                            />
                          ))}
                        </div>

                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 flex flex-col justify-center">
                          <h3 className="text-xl font-bold mb-6">Budget Summary</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-white/10 rounded-xl">
                              <span className="text-white font-bold">Total Budget</span>
                              <span className="font-bold text-white">₹{totalBudget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-accent-orange/10 rounded-xl border border-accent-orange/20">
                              <span className="text-accent-orange font-bold">Allocated</span>
                              <span className="font-bold text-accent-orange">₹{eventPlan.budgetBreakdown.reduce((acc, curr) => acc + curr.allocatedAmount, 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                              <span className="text-green-400 font-bold">Savings/Buffer</span>
                              <span className="font-bold text-green-400">₹{(totalBudget - eventPlan.budgetBreakdown.reduce((acc, curr) => acc + curr.allocatedAmount, 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'event-checklist' && eventPlan && (
                    <motion.div
                      key="event-checklist"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-6">Planning Checklist</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {eventPlan.checklist.map((item, index) => (
                          <ChecklistItem key={index} item={item} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'event-itinerary' && eventPlan && (
                    <motion.div
                      key="event-itinerary"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-6">Event Day Schedule</h2>
                      <div className="relative border-l-2 border-accent-orange/30 ml-4 pl-8 space-y-8">
                        {eventPlan.itinerary.map((item, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-accent-orange border-4 border-deep-blue"></div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-accent-orange font-bold font-mono">{item.time}</span>
                                <span className="text-xs text-white/40 uppercase tracking-widest">Activity</span>
                              </div>
                              <h3 className="text-lg font-bold mb-1">{item.activity}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: any) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="text-accent-orange" size={24} />
      </div>
      <div>
        <p className="text-xs text-white font-bold uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active 
          ? 'border-accent-orange text-accent-orange' 
          : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}

function DestinationCard({ type, name, cost, distance, score, rating, image, vlogTitle }: any) {
  const isMain = type.toUpperCase().includes('MAIN');
  
  return (
    <div className={`glass-card overflow-hidden flex flex-col relative ${isMain ? 'ring-2 ring-accent-orange shadow-[0_0_30px_rgba(255,122,24,0.2)]' : ''}`}>
      {isMain && (
        <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-accent-orange to-soft-orange text-center text-xs font-bold py-1 z-10">
          MAIN DESTINATION
        </div>
      )}
      <div className="h-48 relative">
        <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-blue to-transparent"></div>
        <div className="absolute bottom-4 left-4">
          <p className="text-xs font-bold text-accent-orange mb-1">{type}</p>
          <h3 className="text-2xl font-bold">{name}</h3>
        </div>
      </div>
      
      <div className="p-5 flex-grow flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/70 text-xs font-bold">Est. Cost/Head</p>
            <p className="font-bold text-lg text-white">₹{Math.round(cost).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold">Distance</p>
            <p className="font-bold text-white">{distance}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold">Popularity Score</p>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-green-400" />
              <span className="font-bold text-white">{score}/10</span>
            </div>
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold">Trip Rating</p>
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-white">{rating}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
          <p className="text-xs text-white font-bold mb-2 uppercase tracking-wider">Virtual Preview</p>
          <a 
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(vlogTitle + ' travel vlog')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center gap-3 transition-colors text-left"
          >
            <PlayCircle className="text-red-500 shrink-0" size={24} />
            <span className="text-xs font-medium truncate">{vlogTitle}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function HotelCard({ hotel }: { hotel: any }) {
  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <div className="h-40 relative">
        <img 
          src={`https://picsum.photos/seed/${hotel.imageKeyword}/600/400`} 
          alt={hotel.name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-blue/80 to-transparent"></div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold">{hotel.rating}</span>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg mb-1 text-white">{hotel.name}</h3>
        <p className="text-xs text-white/80 mb-3 line-clamp-2 font-medium">{hotel.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1 text-white/70">
            <MapPin size={12} />
            <span className="text-[10px] font-bold truncate max-w-[100px]">{hotel.location}</span>
          </div>
          <p className="font-bold text-accent-orange">₹{hotel.costPerNight}<span className="text-[10px] font-bold text-white/70">/night</span></p>
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: any }) {
  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <div className="h-40 relative">
        <img 
          src={`https://picsum.photos/seed/${restaurant.imageKeyword}/600/400`} 
          alt={restaurant.name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-blue/80 to-transparent"></div>
        <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium">
          {restaurant.cuisine}
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-white">{restaurant.name}</h3>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-white">{restaurant.rating}</span>
          </div>
        </div>
        <p className="text-xs text-white/80 mb-3 line-clamp-2 font-medium">{restaurant.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1 text-white/70">
            <MapPin size={12} />
            <span className="text-[10px] font-bold truncate max-w-[100px]">{restaurant.location}</span>
          </div>
          <p className="font-bold text-green-400">₹{restaurant.avgCostPerPerson}<span className="text-[10px] font-bold text-white/70">/head</span></p>
        </div>
      </div>
    </div>
  );
}

function TransportCard({ transport }: { transport: any }) {
  const isTrain = transport.type === 'Train';
  const isGovtBus = transport.type === 'Government Bus';
  const isBudget = isTrain || isGovtBus;

  return (
    <div className={`glass-card p-5 relative overflow-hidden ${isBudget ? 'border-accent-orange/30 bg-accent-orange/5' : ''}`}>
      {isBudget && (
        <div className="absolute top-0 right-0 bg-accent-orange text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
          Budget Choice
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isTrain ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
          {isTrain ? <Navigation size={20} /> : <MapPin size={20} />}
        </div>
        <div>
          <h4 className="font-bold text-white">{transport.type}</h4>
          <p className="text-xs text-white/80 font-bold">
            {isTrain ? `${transport.name} (${transport.number})` : transport.busType}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-white font-bold uppercase tracking-wider">Departure</p>
          <p className="text-sm font-bold text-white">{transport.departureTime}</p>
          {!isTrain && <p className="text-[10px] text-white/70 font-bold truncate">{transport.departureLocation}</p>}
        </div>
        <div>
          <p className="text-[10px] text-white font-bold uppercase tracking-wider">Arrival</p>
          <p className="text-sm font-bold text-white">{transport.arrivalTime}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div>
          {isTrain && (
            <div className="flex items-center gap-1 text-[10px] text-white font-bold">
              <Clock size={10} />
              <span>{transport.duration}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white font-bold uppercase tracking-wider">Fare</p>
          <p className="text-lg font-bold text-green-400">₹{transport.cost}</p>
        </div>
      </div>
    </div>
  );
}

function BudgetItem({ label, amount, desc }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl border border-white/20">
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="text-xs text-white/80 font-medium mt-1">{desc}</p>
      </div>
      <p className="font-bold text-lg text-white">₹{Math.round(amount).toLocaleString()}</p>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: any }) {
  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <div className="h-40 relative">
        <img 
          src={`https://picsum.photos/seed/${vendor.type}/600/400`} 
          alt={vendor.name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-blue/80 to-transparent"></div>
        <div className="absolute top-3 right-3 bg-accent-orange/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-accent-orange uppercase tracking-wider">
          {vendor.type}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold">{vendor.rating}</span>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg mb-1 text-white">{vendor.name}</h3>
        <p className="text-xs text-white/80 mb-3 line-clamp-2 font-medium">{vendor.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1 text-white/70">
            <Briefcase size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Estimated Cost</span>
          </div>
          <p className="font-bold text-accent-orange">₹{vendor.estimatedCost.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function BudgetProgress({ label, amount, percentage, total }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white font-bold">{label}</span>
        <span className="font-bold text-white">₹{amount.toLocaleString()} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-accent-orange"
        />
      </div>
    </div>
  );
}

function ChecklistItem({ item }: { item: any }) {
  const priorityColors: any = {
    'High': 'text-red-400 bg-red-400/10',
    'Medium': 'text-yellow-400 bg-yellow-400/10',
    'Low': 'text-green-400 bg-green-400/10'
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4 hover:bg-white/10 transition-colors">
      <div className="w-6 h-6 rounded border-2 border-white/20 flex items-center justify-center shrink-0 mt-1">
        <CheckSquare size={14} className="text-transparent" />
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-white">{item.task}</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${priorityColors[item.priority]}`}>
            {item.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/80 font-bold">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {item.timeline}
          </span>
        </div>
      </div>
    </div>
  );
}

function ItineraryItem({ time, title, desc, icon: Icon }: any) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-deep-blue text-accent-orange shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
        <Icon size={18} />
      </div>
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-accent-orange">{title}</h4>
          <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-md">{time}</span>
        </div>
        <p className="text-sm text-white font-medium">{desc}</p>
      </div>
    </div>
  );
}
