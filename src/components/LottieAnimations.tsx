import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

interface LottieWrapperProps {
  path: string;
  className?: string;
  style?: React.CSSProperties;
}

const lottieCache: Record<string, any> = {};

const LottieWrapper: React.FC<LottieWrapperProps> = ({ path, className, style }) => {
  const [animationData, setAnimationData] = useState<any>(lottieCache[path] || null);

  useEffect(() => {
    if (lottieCache[path]) {
      setAnimationData(lottieCache[path]);
      return;
    }

    fetch(path)
      .then((res) => res.json())
      .then((data) => {
        lottieCache[path] = data;
        setAnimationData(data);
      })
      .catch((err) => console.error(`Error loading Lottie from ${path}:`, err));
  }, [path]);

  if (!animationData) return null;

  const LottieComponent = (Lottie as any).default || Lottie;

  return (
    <LottieComponent 
      animationData={animationData} 
      loop={true} 
      className={className} 
      style={{
        ...style,
        transform: 'scale(1.6)', // Zoom in to remove whitespace margins
        transformOrigin: 'center center'
      }}
      renderer="canvas"
      rendererSettings={{
        preserveAspectRatio: 'xMidYMid meet',
        clearCanvas: true,
        progressiveLoad: true,
        hideOnTransparent: true
      }}
    />
  );
};

export const LoadingOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease'
      }}
      className="loading-overlay-container"
    >
      <div style={{ width: 600, height: 600 }}>
        <LottieWrapper path="/cat%20Mark%20loading.json" />
      </div>
      <p style={{ 
        color: '#fff', 
        marginTop: '20px', 
        fontSize: '1.2rem', 
        fontWeight: 500,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        opacity: 0.8
      }}>
        Initializing Neural Link...
      </p>
    </div>
  );
};

import { motion } from 'framer-motion';

export const NovaRobot: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        // Smooth wandering path
        x: [0, -40, 30, -20, 0],
        y: [0, -100, -50, -150, 0],
        rotate: [0, 5, -5, 2, 0]
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
        // Wander animation config
        x: { duration: 15, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 10, repeat: Infinity, ease: "easeInOut" }
      }}
      style={{
        position: 'fixed',
        bottom: '60px',
        right: '40px',
        width: '300px',
        height: '300px',
        zIndex: 5000,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 35px rgba(0, 242, 255, 0.4))',
      }}
      className="nova-robot-hover"
    >
      <LottieWrapper path="/Anima%20Bot.json" />
      <motion.div 
        animate={{
          y: [0, -5, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-10px',
          background: 'rgba(0, 24, 40, 0.6)',
          border: '1px solid rgba(0, 242, 255, 0.4)',
          padding: '6px 14px',
          borderRadius: '20px',
          color: '#00f2ff',
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        Nova AI Active
      </motion.div>
    </motion.div>
  );
};
