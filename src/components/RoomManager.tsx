import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Share, Copy, Play, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface RoomManagerProps {
  onCreateRoom: () => string;
  onJoinRoom: (roomId: string) => void;
  currentRoom: string | null;
  isConnected: boolean;
  playerCount: number;
  canStartGame: boolean;
  onStartGame: () => void;
  isRoomCreator: boolean;
  roomFull: boolean;
  showJoinConfirmation: boolean;
  onConfirmJoin: () => void;
  onCancelJoin: () => void;
  autoStartCountdown: number | null;
}

const RoomManager = ({ 
  onCreateRoom, 
  onJoinRoom, 
  currentRoom, 
  isConnected, 
  playerCount,
  canStartGame,
  onStartGame,
  isRoomCreator,
  roomFull,
  showJoinConfirmation,
  onConfirmJoin,
  onCancelJoin,
  autoStartCountdown
}: RoomManagerProps) => {
  const { toast } = useToast();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreateRoom = () => {
    const roomId = onCreateRoom();
    const roomLink = `${window.location.origin}?room=${roomId}`;
    
    navigator.clipboard.writeText(roomLink);
    toast({
      title: "Room Created! 🚀",
      description: "Room link copied to clipboard. Share with your friend!",
      className: "border-green-500 bg-green-500/10"
    });
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId.trim());
      setShowJoinInput(false);
      setJoinRoomId('');
    }
  };

  const handleShareRoom = () => {
    if (currentRoom) {
      const roomLink = `${window.location.origin}?room=${currentRoom}`;
      navigator.clipboard.writeText(roomLink);
      toast({
        title: "Room Link Copied! 📋",
        description: "Share this link with your friend to join the game",
        className: "border-blue-500 bg-blue-500/10"
      });
    }
  };

  // Join confirmation modal
  if (showJoinConfirmation) {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="bg-gradient-to-br from-purple-900 via-black to-indigo-900 border-2 border-purple-500 max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center text-purple-300">
                Join Multiplayer Room?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-300">
                You're about to join a multiplayer snake game!
              </p>
              <p className="text-sm text-gray-400">
                Room: {currentRoom?.slice(0, 8)}...
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={onConfirmJoin}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Game
                </Button>
                <Button 
                  onClick={onCancelJoin}
                  variant="outline"
                  className="flex-1 border-gray-500"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (roomFull) {
    return (
      <Card className="bg-red-900/30 border-red-500/50 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold text-red-400 mb-2">Room Full! 🚫</h3>
          <p className="text-gray-300 mb-4">This room already has 2 players.</p>
          <Button 
            onClick={() => window.location.href = window.location.origin}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Create New Room
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentRoom) {
    return (
      <Card className="bg-black/50 border-purple-500/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-300">
            <Users className="w-5 h-5" />
            Multiplayer Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCreateRoom}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
          
          <div className="text-center text-gray-400">or</div>
          
          <AnimatePresence>
            {!showJoinInput ? (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button 
                  onClick={() => setShowJoinInput(true)}
                  variant="outline"
                  className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/20"
                >
                  Join Existing Room
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <input
                  type="text"
                  placeholder="Enter room ID..."
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-purple-500/50 rounded text-white placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleJoinRoom}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!joinRoomId.trim()}
                  >
                    Join
                  </Button>
                  <Button 
                    onClick={() => setShowJoinInput(false)}
                    variant="outline"
                    className="flex-1 border-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/50 border-purple-500/50 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-300">
          <Users className="w-5 h-5" />
          Room: {currentRoom.slice(0, 8)}...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <p className="text-lg font-bold text-cyan-400">
            {playerCount}/2 Players
          </p>
        </div>

        {playerCount < 2 && (
          <Button 
            onClick={handleShareRoom}
            variant="outline"
            className="w-full border-blue-500 text-blue-300 hover:bg-blue-500/20"
          >
            <Share className="w-4 h-4 mr-2" />
            Share Room Link
          </Button>
        )}

        {autoStartCountdown !== null && (
          <div className="text-center p-4 bg-green-900/30 border border-green-500/50 rounded">
            <p className="text-2xl font-bold text-green-300 mb-2">{autoStartCountdown}</p>
            <p className="text-green-400 text-sm">Game starting soon...</p>
          </div>
        )}

        {playerCount === 2 && isRoomCreator && autoStartCountdown === null && (
          <Button 
            onClick={onStartGame}
            disabled={!canStartGame}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Game
          </Button>
        )}

        {playerCount === 2 && !isRoomCreator && autoStartCountdown === null && (
          <div className="text-center p-3 bg-yellow-900/30 border border-yellow-500/50 rounded">
            <p className="text-yellow-300">Waiting for host to start...</p>
          </div>
        )}

        {playerCount < 2 && (
          <div className="text-center p-3 bg-blue-900/30 border border-blue-500/50 rounded">
            <p className="text-blue-300">Waiting for another player...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoomManager;