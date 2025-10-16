"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={hover ? {
        scale: 1.02,
        boxShadow: glow
          ? '0 20px 40px rgba(13, 110, 253, 0.3), 0 0 0 1px rgba(255,255,255,0.1)'
          : '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.05)'
      } : undefined}
      className={`
        relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl
        border border-white/20 overflow-hidden
        before:absolute before:inset-0 before:rounded-2xl
        before:bg-gradient-to-br before:from-white/20 before:to-transparent
        before:pointer-events-none
        ${glow ? 'shadow-[0_8px_32px_rgba(13,110,253,0.37)]' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 transition-opacity duration-300 hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>

      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/5 to-transparent pointer-events-none" />
    </motion.div>
  );
};

export default GlassCard;
