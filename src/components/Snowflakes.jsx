import React, { useMemo } from 'react';

const SNOWFLAKE_CHARS = ['❄', '❅', '❆', '✻', '✼', '❊'];

function Snowflakes({ count = 50 }) {
  const snowflakes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      char: SNOWFLAKE_CHARS[Math.floor(Math.random() * SNOWFLAKE_CHARS.length)],
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 20,
      animationDelay: Math.random() * -20,
      fontSize: 10 + Math.random() * 20,
      opacity: 0.4 + Math.random() * 0.6,
      twinkleDelay: Math.random() * 2,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        
        @keyframes twinkle {
          0%, 100% {
            opacity: var(--base-opacity);
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
          }
          50% {
            opacity: calc(var(--base-opacity) * 0.5);
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(173, 216, 230, 0.7);
          }
        }
        
        @keyframes sway {
          0%, 100% {
            margin-left: 0px;
          }
          25% {
            margin-left: 15px;
          }
          75% {
            margin-left: -15px;
          }
        }
        
        .snowflake {
          position: absolute;
          top: -20px;
          color: white;
          animation: 
            snowfall linear infinite,
            twinkle ease-in-out infinite,
            sway ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
        }
      `}</style>

      {snowflakes.map((flake) => (
        <span
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.fontSize}px`,
            '--base-opacity': flake.opacity,
            animationDuration: `${flake.animationDuration}s, ${1.5 + flake.twinkleDelay}s, ${3 + flake.twinkleDelay}s`,
            animationDelay: `${flake.animationDelay}s, ${flake.twinkleDelay}s, ${flake.twinkleDelay * 0.5}s`,
          }}
        >
          {flake.char}
        </span>
      ))}
    </div>
  );
}

export default Snowflakes;
