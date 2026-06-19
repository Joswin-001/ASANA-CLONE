import React from 'react';
import { useAsana } from '../context/AsanaContext';

export const Celebration: React.FC = () => {
  const { celebrating } = useAsana();

  if (!celebrating) return null;

  return (
    <div className="celebration-overlay">
      <div className="unicorn-container">
        {/* Beautiful SVG Unicorn */}
        <svg 
          viewBox="0 0 100 80" 
          className="unicorn-svg"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Unicorn Wings */}
          <path 
            d="M25 45 C 10 30, 5 15, 12 10 C 20 5, 25 15, 30 30 Z" 
            fill="#ff7654" 
            opacity="0.8" 
          />
          <path 
            d="M20 42 C 5 28, 0 12, 8 7 C 15 2, 20 12, 25 27 Z" 
            fill="#ff5d6c" 
            opacity="0.9" 
          />
          
          {/* Unicorn Body */}
          <path 
            d="M30 45 C 30 35, 45 35, 55 40 C 65 45, 75 45, 80 50 C 85 55, 80 65, 70 65 C 55 65, 45 60, 35 58 C 30 57, 28 50, 30 45 Z" 
            fill="#ffffff" 
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />

          {/* Legs */}
          <rect x="38" y="56" width="4" height="15" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
          <rect x="46" y="58" width="4" height="15" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
          <rect x="66" y="58" width="4" height="15" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
          <rect x="72" y="55" width="4" height="15" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
          
          {/* Neck and Head */}
          <path 
            d="M60 42 C 65 35, 70 25, 78 22 C 85 19, 90 24, 88 30 C 86 35, 78 40, 70 44 Z" 
            fill="#ffffff" 
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          
          {/* Nose/Snout */}
          <path 
            d="M85 24 C 88 24, 91 26, 90 29 C 89 31, 86 32, 83 30 Z" 
            fill="#fda4af" 
          />
          
          {/* Unicorn Horn (Golden Gradient look) */}
          <path 
            d="M80 20 L 92 5 L 85 18 Z" 
            fill="#f59e0b" 
          />
          
          {/* Mane and Tail (Rainbow colors) */}
          <path d="M55 40 C 53 30, 48 20, 50 15 C 52 10, 58 12, 60 25 Z" fill="#3b82f6" />
          <path d="M58 41 C 58 32, 55 25, 58 20 C 60 15, 64 17, 65 28 Z" fill="#10b981" />
          <path d="M62 42 C 64 35, 62 28, 66 23 C 68 18, 71 20, 70 32 Z" fill="#fbbf24" />
          
          {/* Tail */}
          <path d="M30 48 C 20 48, 10 52, 12 58 C 14 62, 22 58, 28 53 Z" fill="#8b5cf6" />
          <path d="M29 51 C 18 53, 8 59, 10 64 C 12 68, 20 63, 26 56 Z" fill="#ec4899" />
          
          {/* Eye */}
          <circle cx="82" cy="25" r="1.5" fill="#1e293b" />
        </svg>

        {/* Trail sparkles */}
        <div className="sparkle sp-1">✦</div>
        <div className="sparkle sp-2">✨</div>
        <div className="sparkle sp-3">✦</div>
        <div className="sparkle sp-4">✨</div>
      </div>

      <style>{`
        .celebration-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .unicorn-container {
          position: absolute;
          width: 140px;
          height: 120px;
          bottom: -150px;
          left: -150px;
          animation: flyUnicorn 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .unicorn-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15));
        }

        /* Sparkle trail elements */
        .sparkle {
          position: absolute;
          font-size: 20px;
          opacity: 0;
          animation: sparkleFade 1.5s ease-out infinite;
        }

        .sp-1 { top: 60px; left: -20px; color: #ff007f; animation-delay: 0.2s; }
        .sp-2 { top: 80px; left: -40px; color: #ffaa00; animation-delay: 0.4s; }
        .sp-3 { top: 90px; left: -10px; color: #00ffaa; animation-delay: 0.1s; }
        .sp-4 { top: 110px; left: -30px; color: #00aaff; animation-delay: 0.5s; }

        @keyframes sparkleFade {
          0% { transform: scale(0.5) translate(0, 0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1.2) translate(-30px, 30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
