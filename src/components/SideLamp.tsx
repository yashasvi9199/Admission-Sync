import React, { useState } from 'react';

interface SideLampProps {
  lampOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function SideLamp({ lampOn, onToggle, disabled = false }: SideLampProps) {
  const [isPulling, setIsPulling] = useState(false);

  const playSwitchSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Classic mechanical toggle double-click sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.setValueAtTime(290, ctx.currentTime + 0.03);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio switch sound not supported or blocked by browser policy.', e);
    }
  };

  const handlePull = (e: React.MouseEvent) => {
    if (disabled || isPulling) return;
    e.stopPropagation();
    setIsPulling(true);
    playSwitchSound();
    onToggle();

    // Reset cord pulling animation after 250ms
    setTimeout(() => {
      setIsPulling(false);
    }, 250);
  };

  return (
    <div 
      className={`relative flex flex-col items-center select-none w-full max-w-[220px] mx-auto h-full transition-all duration-300 ${
        disabled ? 'opacity-80' : 'active:scale-[0.98]'
      }`}
    >
      {/* Click Proximity Area Overlay - Tapping anywhere on the stage triggers the toggle */}
      <button 
        type="button"
        onClick={handlePull}
        disabled={disabled}
        className={`absolute inset-0 w-full h-full cursor-pointer z-20 rounded-2xl border-0 focus:outline-none bg-transparent ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
        title={lampOn ? 'Click thread to Turn Off / Punch Out' : 'Click thread to Turn On / Punch In'}
        aria-label="Click cord to toggle shift attendance"
      />

      {/* SVG Drawing the Standing Floor Lamp */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 200 440" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none drop-shadow-2xl"
      >
        {/* Ambient Light Halo on the Floor and Wall Backing */}
        {lampOn && (
          <ellipse 
            cx="60" 
            cy="420" 
            rx="90" 
            ry="18" 
            fill="url(#floorGlow)" 
            opacity="0.45"
            className="transition-opacity duration-500"
          />
        )}

        {/* Heavy Circular Metallic Base at bottom */}
        <ellipse 
          cx="100" 
          cy="424" 
          rx="45" 
          ry="9" 
          fill={lampOn ? '#312E81' : '#1E293B'} 
          stroke={lampOn ? '#4F46E5' : '#475569'} 
          strokeWidth="2.5" 
        />
        {/* Inner base details for metallic reflection */}
        <ellipse 
          cx="100" 
          cy="422" 
          rx="32" 
          ry="6" 
          fill={lampOn ? '#4338CA' : '#334155'} 
        />

        {/* Tall Sleek Metallic Standing Vertical Pole */}
        <line 
          x1="100" 
          y1="422" 
          x2="100" 
          y2="50" 
          stroke={lampOn ? '#818CF8' : '#475569'} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />

        {/* Horizontal Modern Support Arm at top */}
        <line 
          x1="100" 
          y1="50" 
          x2="60" 
          y2="50" 
          stroke={lampOn ? '#818CF8' : '#475569'} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />

        {/* Shade Fixture Holder */}
        <rect 
          x="52" 
          y="50" 
          width="16" 
          height="12" 
          rx="2" 
          fill={lampOn ? '#6366F1' : '#334155'} 
          stroke={lampOn ? '#818CF8' : '#475569'}
          strokeWidth="1"
        />

        {/* Dynamic Light Cone Beam (Illumination effect cascading downwards) */}
        {lampOn && (
          <polygon 
            points="30,85 90,85 190,420 -70,420" 
            fill="url(#lightConeGrad)" 
            opacity="0.22"
            className="transition-opacity duration-500 animate-pulse"
            style={{ animationDuration: '4s' }}
          />
        )}

        {/* Glowing bulb back corona */}
        {lampOn && (
          <circle 
            cx="60" 
            cy="95" 
            r="45" 
            fill="url(#glowGrad)" 
            opacity="0.7"
            className="transition-opacity duration-300"
          />
        )}

        {/* Modern Scandinavian Minimalist Lamp Shade (Dome) */}
        <path 
          d="M 30 85 C 30 62, 90 62, 90 85 Z" 
          fill={lampOn ? '#4F46E5' : '#334155'} 
          stroke={lampOn ? '#818CF8' : '#475569'} 
          strokeWidth="2.5" 
        />

        {/* Light Bulb */}
        <circle 
          cx="60" 
          cy="95" 
          r="13" 
          fill={lampOn ? '#FDE047' : '#94A3B8'} 
          stroke={lampOn ? '#FEF08A' : '#64748B'}
          strokeWidth="1.5"
          className="transition-colors duration-200"
        />
        
        {/* Bulb filament detail */}
        {lampOn && (
          <path 
            d="M 55 95 Q 60 88 65 95" 
            stroke="#F59E0B" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
          />
        )}

        {/* Hanging Pull-Thread (Cord) with responsive pull-down animation */}
        <line 
          x1="76" 
          y1="82" 
          x2="76" 
          y2={isPulling ? '205' : '175'} 
          stroke={lampOn ? '#F59E0B' : '#64748B'} 
          strokeWidth="2.5" 
          strokeLinecap="round"
          className="transition-all duration-150 ease-out"
        />

        {/* Pull Bead / Ring at end of the cord */}
        <circle 
          cx="76" 
          cy={isPulling ? '205' : '175'} 
          r="7.5" 
          fill={lampOn ? '#F59E0B' : '#1E293B'} 
          stroke={lampOn ? '#FEF08A' : '#94A3B8'} 
          strokeWidth="2.5"
          className="transition-all duration-150 ease-out"
        />

        {/* Dynamic definitions for advanced color gradients */}
        <defs>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id="lightConeGrad" x1="60" y1="85" x2="60" y2="420">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#FEF08A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
