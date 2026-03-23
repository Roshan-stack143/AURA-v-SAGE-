import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'mobile' | 'email'>('mobile');
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Firebase OTP is usually 6 digits
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing recaptcha on unmount:", e);
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const syncUserToFirestore = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
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

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'email') {
      handleEmailLogin();
    } else {
      try {
        setError(null);
        setupRecaptcha();
        const appVerifier = (window as any).recaptchaVerifier;
        const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;
        const confirmation = await signInWithPhoneNumber(auth, formattedMobile, appVerifier);
        setConfirmationResult(confirmation);
        setStep('otp');
      } catch (err: any) {
        console.error("Phone auth error:", err);
        let errorMessage = "Failed to send OTP.";
        if (err.code === 'auth/invalid-phone-number') {
          errorMessage = "Invalid phone number format. Please include country code (e.g., +1).";
        } else if (err.code === 'auth/operation-not-allowed') {
          errorMessage = "Phone login is not enabled in the Firebase Console.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many requests. Please try again later.";
        } else if (err.code === 'auth/internal-error') {
          errorMessage = "Internal error. Please ensure this domain is authorized in Firebase.";
        } else if (err.message && err.message.includes('reCAPTCHA')) {
          errorMessage = "reCAPTCHA error. Please refresh the page and try again.";
        }
        setError(errorMessage);
        
        // Properly clear recaptcha to avoid "already rendered" error on retry
        if ((window as any).recaptchaVerifier) {
          try {
            (window as any).recaptchaVerifier.clear();
          } catch (clearErr) {
            console.error("Error clearing recaptcha:", clearErr);
          }
          (window as any).recaptchaVerifier = null;
          
          // Also clear the DOM element just in case
          const container = document.getElementById('recaptcha-container');
          if (container) {
            container.innerHTML = '';
          }
        }
      }
    }
  };

  const handleEmailLogin = async () => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(userCredential.user);
      setStep('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error("Email login error:", err);
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        errorMessage = "Account not found.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = "Invalid password.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "Email login is not enabled in the system.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later.";
      }
      setError(errorMessage);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    try {
      setError(null);
      const otpCode = otp.join('');
      const result = await confirmationResult.confirm(otpCode);
      await syncUserToFirestore(result.user);
      setStep('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      let errorMessage = "Failed to verify OTP.";
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "Invalid OTP.";
      } else if (err.code === 'auth/code-expired') {
        errorMessage = "OTP expired.";
      }
      setError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserToFirestore(result.user);
      setStep('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div id="recaptcha-container"></div>
      <AnimatedBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-orange to-soft-orange mb-2"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            AURA V-SAGE
          </motion.h1>
          <p className="text-sm text-white/70 font-medium">BudgetTrip Planner</p>
          <p className="text-xs text-white/50 mt-2">"Smart AI Planning for Budget-Friendly Group Trips"</p>
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

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
                <button
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginMethod === 'mobile' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                  onClick={() => setLoginMethod('mobile')}
                >
                  Mobile + OTP
                </button>
                <button
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginMethod === 'email' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                  onClick={() => setLoginMethod('email')}
                >
                  Email
                </button>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                {loginMethod === 'mobile' ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input
                      type="tel"
                      placeholder="Enter Mobile Number"
                      className="glass-input w-full !pl-11"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        className="glass-input w-full !pl-11" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                      <input 
                        type="password" 
                        placeholder="Password" 
                        className="glass-input w-full !pl-11" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                  {loginMethod === 'mobile' ? 'Send OTP' : 'Login'} <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-6">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-white/40 text-xs">OR</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>
                
                <button onClick={handleGoogleSignIn} type="button" className="btn-secondary w-full flex items-center justify-center gap-2 mt-4">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <div className="mt-6 flex justify-between text-sm">
                <button className="text-white/60 hover:text-white transition-colors">Forgot Password?</button>
                <button onClick={() => navigate('/signup')} className="text-accent-orange hover:text-soft-orange font-medium transition-colors">Sign up</button>
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-semibold mb-2">Verify Mobile Number</h2>
              <p className="text-sm text-white/60 mb-6">Enter the 6-digit code sent to {mobile}</p>
              
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="glass-input w-12 h-12 text-center text-2xl font-bold"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && index > 0) {
                          document.getElementById(`otp-${index - 1}`)?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
                <button type="submit" className="btn-primary w-full">Verify & Login</button>
                <button type="button" onClick={() => setStep('input')} className="w-full text-sm text-white/60 hover:text-white">Back to Login</button>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="text-green-400 w-12 h-12" />
              </motion.div>
              <h2 className="text-xl font-semibold text-green-400">Verification Successful</h2>
              <p className="text-sm text-white/60 mt-2">Redirecting to dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
