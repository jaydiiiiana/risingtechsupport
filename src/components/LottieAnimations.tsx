import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

interface LottieWrapperProps {
  path: string;
  className?: string;
  style?: React.CSSProperties;
}

const LottieWrapper: React.FC<LottieWrapperProps> = ({ path, className, style }) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch(path)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error(`Error loading Lottie from ${path}:`, err));
  }, [path]);

  if (!animationData) return null;

  // Handle potential default export differences in some environments
  const LottieComponent = (Lottie as any).default || Lottie;

  return <LottieComponent animationData={animationData} loop={true} className={className} style={style} />;
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
      <div style={{ width: 300, height: 300 }}>
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

export const NovaRobot: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        width: '200px',
        height: '200px',
        zIndex: 5000,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 20px rgba(0, 242, 255, 0.4))',
        animation: 'novaFloat 4s ease-in-out infinite'
      }}
      className="nova-robot-hover"
    >
      <style>{`
        @keyframes novaFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
      <LottieWrapper path="/Anima%20Bot.json" />
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '0',
        background: 'rgba(0, 242, 255, 0.1)',
        border: '1px solid rgba(0, 242, 255, 0.3)',
        padding: '8px 12px',
        borderRadius: '12px',
        color: '#00f2ff',
        fontSize: '0.75rem',
        backdropFilter: 'blur(4px)',
        whiteSpace: 'nowrap',
        pointerEvents: 'auto'
      }}>
        Admin Assistant Active
      </div>
    </div>
  );
};
