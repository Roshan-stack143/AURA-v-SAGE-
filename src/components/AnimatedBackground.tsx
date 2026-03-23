import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, MapPin, Mountain, Briefcase } from 'lucide-react';

const scenes = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80',
    alt: 'Group Travel Planning'
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=80',
    alt: 'Bus Journey'
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1920&q=80',
    alt: 'Hill Station Destination'
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1920&q=80',
    alt: 'Event Organization'
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1920&q=80',
    alt: 'Sightseeing Moments'
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1920&q=80',
    alt: 'Budget Planning'
  }
];

export default function AnimatedBackground() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    // Preload images to prevent flickering
    scenes.forEach(scene => {
      const img = new Image();
      img.src = scene.url;
    });

    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % scenes.length);
    }, 5000); // 5 seconds per scene
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-deep-blue">
      {/* Image Slider with Parallax and Zoom */}
      <AnimatePresence>
        <motion.img
          key={currentScene}
          src={scenes[currentScene].url}
          alt={scenes[currentScene].alt}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.05, x: '0%' }}
          animate={{ opacity: 1, scale: 1.1, x: '-2%' }}
          exit={{ opacity: 0, scale: 1.15, x: '-4%' }}
          transition={{ 
            opacity: { duration: 1.5, ease: 'easeInOut' },
            scale: { duration: 6.5, ease: 'linear' },
            x: { duration: 6.5, ease: 'linear' }
          }}
        />
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(120deg, rgba(10,31,68,0.6), rgba(255,122,24,0.4))'
        }}
      />

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingIcon Icon={Bus} delay={0} x="15%" y="25%" size={48} />
        <FloatingIcon Icon={MapPin} delay={2} x="80%" y="20%" size={56} />
        <FloatingIcon Icon={Mountain} delay={4} x="75%" y="75%" size={64} />
        <FloatingIcon Icon={Briefcase} delay={1} x="20%" y="70%" size={40} />
      </div>
    </div>
  );
}

function FloatingIcon({ Icon, delay, x, y, size, opacity = 0.3 }: any) {
  return (
    <motion.div
      className="absolute text-white"
      style={{ left: x, top: y, opacity }}
      animate={{
        y: ['-20px', '20px', '-20px'],
        x: ['-10px', '10px', '-10px'],
        rotate: [-5, 5, -5],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      <Icon size={size} strokeWidth={1.5} />
    </motion.div>
  );
}
