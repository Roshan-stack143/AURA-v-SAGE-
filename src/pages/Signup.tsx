import { useState, ChangeEvent, FormEvent } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Building2, Lock, ArrowRight } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    college: '',
    password: '',
    confirmPassword: '',
    agree: false
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const syncUserToFirestore = async (user: any, additionalData: any = {}) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          phoneNumber: user.phoneNumber || additionalData.mobile || '',
          displayName: user.displayName || additionalData.fullName || '',
          photoURL: user.photoURL || '',
          college: additionalData.college || '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!formData.agree) {
      setError("Please agree to the travel safety guidelines");
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Update profile with name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.fullName
        });
      }
      
      await syncUserToFirestore(userCredential.user, {
        fullName: formData.fullName,
        mobile: formData.mobile,
        college: formData.college
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Signup error:", err);
      let errorMessage = "Failed to create account.";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Email is already in use.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/password accounts are not enabled.";
      }
      setError(errorMessage);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserToFirestore(result.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google sign-up error:", err);
      setError("Failed to sign up with Google. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative py-12">
      <AnimatedBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-sm text-white/60">Join AURA V-SAGE BudgetTrip Planner</p>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs"
            >
              {error}
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              className="glass-input w-full !pl-11"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="tel"
              name="mobile"
              placeholder="Mobile Number"
              className="glass-input w-full !pl-11"
              value={formData.mobile}
              onChange={handleChange}
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="glass-input w-full !pl-11"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="text"
              name="college"
              placeholder="College / Organization (Optional)"
              className="glass-input w-full !pl-11"
              value={formData.college}
              onChange={handleChange}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="glass-input w-full !pl-11"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="glass-input w-full !pl-11"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <label className="flex items-start gap-3 mt-4 cursor-pointer">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                name="agree"
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-accent-orange focus:ring-accent-orange/50 focus:ring-offset-0 transition-all cursor-pointer appearance-none checked:bg-accent-orange checked:border-transparent"
                checked={formData.agree}
                onChange={handleChange}
                required
              />
              {formData.agree && (
                <svg className="absolute w-3 h-3 text-white left-1 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-white/70 leading-tight">
              I agree to the <a href="#" className="text-accent-orange hover:underline">travel safety guidelines</a> and terms of service.
            </span>
          </label>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-6">
            Create Account <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/40 text-xs">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>
          
          <button onClick={handleGoogleSignUp} type="button" className="btn-secondary w-full flex items-center justify-center gap-2 mt-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-white/60">Already have an account? </span>
          <button onClick={() => navigate('/')} className="text-accent-orange hover:text-soft-orange font-medium transition-colors">Login</button>
        </div>
      </motion.div>
    </div>
  );
}
