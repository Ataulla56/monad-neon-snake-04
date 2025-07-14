import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import monadLogo from '@/assets/monad-logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaderboardEntry {
  address: string;
  moonPoints: number;
  rank: number;
}

const generateMockLeaderboard = (): LeaderboardEntry[] => {
  const addresses = [
    "0x1a2b3c4d5e6f789012345678901234567890abcd",
    "0x2b3c4d5e6f789012345678901234567890abcdef",
    "0x3c4d5e6f789012345678901234567890abcdef12",
    "0x4d5e6f789012345678901234567890abcdef1234",
    "0x5e6f789012345678901234567890abcdef123456",
    "0x6f789012345678901234567890abcdef12345678",
    "0x789012345678901234567890abcdef123456789a",
    "0x89012345678901234567890abcdef123456789ab",
    "0x9012345678901234567890abcdef123456789abc",
    "0xa012345678901234567890abcdef123456789bcd"
  ];

  return addresses.map((address, index) => ({
    address,
    moonPoints: Math.floor(Math.random() * 50000000) + 10000000, // 10M to 60M points
    rank: index + 1
  })).sort((a, b) => b.moonPoints - a.moonPoints);
};

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setLeaderboard(generateMockLeaderboard());
  }, []);

  const formatPoints = (points: number) => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    }
    return points.toLocaleString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return <Trophy className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <motion.div
            className="absolute top-0 left-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={monadLogo} 
              alt="Monad Logo" 
              className="w-16 h-16 md:w-20 md:h-20 rounded-lg shadow-lg shadow-purple-500/30"
            />
          </motion.div>
          
          <Link to="/">
            <Button variant="ghost" className="absolute top-2 right-0 text-purple-300 hover:text-white">
              <Home className="w-5 h-5 mr-2" />
              Back to Game
            </Button>
          </Link>
          
          <motion.h1 
            className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            LEADERBOARD
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Top Moon Token Holders
          </motion.p>
        </div>

        {/* Leaderboard Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-purple-500/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-300 text-2xl">
                <Trophy className="w-6 h-6" />
                Top Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.address}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    entry.rank === 1 
                      ? 'bg-yellow-500/10 border-yellow-400/50' 
                      : entry.rank === 2 
                        ? 'bg-gray-500/10 border-gray-400/50'
                        : entry.rank === 3
                          ? 'bg-orange-500/10 border-orange-400/50'
                          : 'bg-gray-800/30 border-gray-600/30'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="text-lg font-bold text-gray-300">#{entry.rank}</span>
                    </div>
                    <div>
                      <p className="font-mono text-sm text-gray-400">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-cyan-400">
                      {formatPoints(entry.moonPoints)}
                    </p>
                    <p className="text-sm text-gray-400">MOON</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-purple-500/50 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatPoints(leaderboard[0]?.moonPoints || 0)}
                  </p>
                  <p className="text-sm text-gray-400">Highest Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">
                    {leaderboard.length}
                  </p>
                  <p className="text-sm text-gray-400">Total Players</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatPoints(leaderboard.reduce((sum, entry) => sum + entry.moonPoints, 0))}
                  </p>
                  <p className="text-sm text-gray-400">Total Moon Tokens</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;