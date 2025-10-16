"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faUsers, faStar, faArrowRight, faRefresh } from '@fortawesome/free-solid-svg-icons';
import GlassCard from './GlassCard';
import LoadingSpinner from './LoadingSpinner';

// Shared category color function
const getCategoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    'Organizer': 'from-orange-400 to-red-500',
    'VIP': 'from-purple-400 to-pink-500',
    'Speaker': 'from-green-400 to-emerald-500',
    'Exhibitor': 'from-blue-400 to-cyan-500',
    'Media': 'from-yellow-400 to-orange-500',
    'Hosted Buyer': 'from-indigo-400 to-purple-500',
    'Agent': 'from-gray-400 to-slate-500',
  };
  return colors[cat] || 'from-blue-400 to-blue-600';
};

interface Match {
  id: string;
  name: string;
  role: string;
  company: string;
  category: string;
  score: number;
  reason: string;
}

interface AIMatchmakingProps {
  userId: string;
  userProfile: {
    name: string;
    role: string;
    company: string;
    category: string;
    interests?: string[];
  };
}

const AIMatchmaking: React.FC<AIMatchmakingProps> = ({ userId, userProfile }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateMatches = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/matchmaking/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userProfile,
          minScore: 0.3
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMatches(data.matches || []);
      } else {
        console.error('Matchmaking failed:', data.error);
      }
    } catch (error) {
      console.error('Error generating matches:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-blue-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Great Match';
    if (score >= 0.4) return 'Good Match';
    return 'Fair Match';
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <FontAwesomeIcon icon={faBrain} className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Matchmaking</h3>
              <p className="text-white/70 text-sm">Find your perfect networking connections</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateMatches}
            disabled={generating}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
          >
            {generating ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <>
                <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
                Generate Matches
              </>
            )}
          </motion.button>
        </div>

        {/* Loading State */}
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <LoadingSpinner size="lg" color="gradient" text="Analyzing profiles and finding matches..." />
          </motion.div>
        )}

        {/* Matches List */}
        <AnimatePresence>
          {!generating && matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-white/80">
                <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                <span className="font-semibold">Recommended Connections ({matches.length})</span>
              </div>

              {matches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-semibold truncate">{match.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(match.category)} text-white`}>
                          {match.category}
                        </span>
                      </div>

                      <p className="text-white/70 text-sm mb-1">{match.role}</p>
                      {match.company && (
                        <p className="text-white/60 text-sm mb-2">{match.company}</p>
                      )}

                      <p className="text-white/80 text-sm italic">"{match.reason}"</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(match.score)}`}>
                          {Math.round(match.score * 100)}%
                        </div>
                        <div className="text-xs text-white/60">
                          {getScoreLabel(match.score)}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg"
                      >
                        <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score * 100}%` }}
                        transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
                        className={`h-2 rounded-full ${
                          match.score >= 0.8 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                          match.score >= 0.6 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                          match.score >= 0.4 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!generating && matches.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={faStar} className="text-purple-400 text-2xl" />
            </div>
            <h4 className="text-white font-semibold mb-2">No matches generated yet</h4>
            <p className="text-white/70 text-sm mb-4">
              Click "Generate Matches" to find networking opportunities based on your profile and interests.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateMatches}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <FontAwesomeIcon icon={faBrain} className="w-5 h-5" />
              Generate AI Matches
            </motion.button>
          </motion.div>
        )}
      </div>
    </GlassCard>
  );
};

export default AIMatchmaking;
