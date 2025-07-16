import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Zap, Play, Pause, RotateCcw, Copy, Gauge, Trophy, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import monadLogo from '@/assets/monad-logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import JoystickControl from '@/components/JoystickControl';
import RoomManager from '@/components/RoomManager';
import MultiplayerSnakeGame from '@/components/MultiplayerSnakeGame';

interface Position {
  x: number;
  y: number;
}

interface Ball {
  position: Position;
  type: 'green' | 'damage';
  id: string;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const SPEED_SETTINGS = {
  '0.5X': 200,
  'Low 1X': 120,
  '2X': 90,
  '3X': 60,
  '4X': 40,
  '5X': 25
};
const FAUCET_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

const Index = () => {
  const { toast } = useToast();
  const wallet = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Single player state
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Position>({ x: 0, y: -1 });
  const [balls, setBalls] = useState<Ball[]>([]);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastFaucetTime, setLastFaucetTime] = useState(0);
  const [gameSpeed, setGameSpeed] = useState<keyof typeof SPEED_SETTINGS>('Low 1X');
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // Multiplayer state
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [playerId] = useState(() => Math.random().toString(36).substr(2, 9));
  
  // Initialize multiplayer if room in URL
  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl && roomFromUrl !== currentRoom) {
      console.log('Joining room from URL:', roomFromUrl);
      setCurrentRoom(roomFromUrl);
      setIsMultiplayer(true);
    }
  }, [searchParams, currentRoom]);
  
  const { 
    isConnected, 
    gameState, 
    isRoomCreator, 
    startGame: startMultiplayerGame,
    resetGame: resetMultiplayerGame,
    changeDirection: changeMultiplayerDirection,
    cleanup: cleanupMultiplayer
  } = useMultiplayer(currentRoom);

  // Load faucet data from localStorage
  useEffect(() => {
    const savedFaucetTime = localStorage.getItem('lastFaucetTime');
    if (savedFaucetTime) setLastFaucetTime(parseInt(savedFaucetTime));
    
    // Check if this is first time connecting wallet
    const hasSeenHint = localStorage.getItem('hasSeenArrowHint');
    if (!hasSeenHint && wallet.isConnected) {
      setShowFirstTimeHint(true);
    }
  }, [wallet.isConnected]);

  // Save faucet data to localStorage
  useEffect(() => {
    localStorage.setItem('lastFaucetTime', lastFaucetTime.toString());
  }, [lastFaucetTime]);

  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  }, []);

  const isPositionOccupied = useCallback((pos: Position, snakeBody: Position[]): boolean => {
    return snakeBody.some(segment => segment.x === pos.x && segment.y === pos.y);
  }, []);

  const generateBalls = useCallback((currentSnake: Position[]) => {
    const newBalls: Ball[] = [];
    const targetBallCount = Math.min(5, Math.floor(Math.random() * 4) + 2);
    
    // Ensure at least one green ball
    let hasGreenBall = false;
    
    for (let i = 0; i < targetBallCount; i++) {
      let position: Position;
      let attempts = 0;
      
      do {
        position = generateRandomPosition();
        attempts++;
      } while (
        (isPositionOccupied(position, currentSnake) || 
         newBalls.some(ball => ball.position.x === position.x && ball.position.y === position.y)) &&
        attempts < 100
      );
      
      if (attempts < 100) {
        let ballType: 'green' | 'damage';
        
        // Force first ball to be green if we don't have one yet
        if (i === 0 && !hasGreenBall) {
          ballType = 'green';
          hasGreenBall = true;
        } else if (i === targetBallCount - 1 && !hasGreenBall) {
          // Ensure last ball is green if we still don't have one
          ballType = 'green';
          hasGreenBall = true;
        } else {
          ballType = Math.random() < 0.6 ? 'green' : 'damage';
          if (ballType === 'green') hasGreenBall = true;
        }
        
        newBalls.push({
          position,
          type: ballType,
          id: `ball-${i}-${Date.now()}`
        });
      }
    }
    
    return newBalls;
  }, [generateRandomPosition, isPositionOccupied]);

  const moveSnake = useCallback(() => {
    setSnake(currentSnake => {
      const newSnake = [...currentSnake];
      const head = { ...newSnake[0] };
      
      head.x += direction.x;
      head.y += direction.y;
      
      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        setGameRunning(false);
        return currentSnake;
      }
      
      // Check self collision
      if (isPositionOccupied(head, newSnake)) {
        setGameOver(true);
        setGameRunning(false);
        return currentSnake;
      }
      
      newSnake.unshift(head);
      
      // Check ball collision
      const hitBall = balls.find(ball => 
        ball.position.x === head.x && ball.position.y === head.y
      );
      
      if (hitBall) {
        if (hitBall.type === 'green') {
          const newBalance = wallet.balance + 1.5;
          wallet.updateBalance(newBalance);
          toast({
            title: "Green Ball Collected! 🌙",
            description: "+1.5 Moon tokens",
            className: "border-green-500 bg-green-500/10"
          });
        } else {
          const newBalance = Math.max(0, wallet.balance - 1.0);
          wallet.updateBalance(newBalance);
          toast({
            title: "Damage Ball Hit! ⚠️",
            description: "-1.0 Moon token",
            variant: "destructive"
          });
        }
        
        // Remove hit ball and generate new ones
        setBalls(currentBalls => {
          const remainingBalls = currentBalls.filter(ball => ball.id !== hitBall.id);
          const newBalls = generateBalls(newSnake);
          return [...remainingBalls, ...newBalls].slice(0, 5);
        });
        
        // Don't remove tail when eating ball (snake grows)
      } else {
        newSnake.pop(); // Remove tail
      }
      
      return newSnake;
    });
  }, [direction, balls, isPositionOccupied, generateBalls, toast, wallet]);

  useEffect(() => {
    if (gameRunning && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, SPEED_SETTINGS[gameSpeed]);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gameOver, moveSnake, gameSpeed]);

  useEffect(() => {
    if (gameRunning && balls.length === 0) {
      setBalls(generateBalls(snake));
    }
  }, [gameRunning, balls.length, snake, generateBalls]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isGameKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key);
      
      // Prevent page scrolling for arrow keys during gameplay or when starting game
      if (isGameKey && (gameRunning || !gameRunning)) {
        e.preventDefault();
      }
      
      // Auto-start the game if it's not running when arrow keys are pressed
      if (!gameRunning && isGameKey) {
        startGame();
      }
      
      if (!gameRunning) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameRunning]);

  const startGame = () => {
    // Check if wallet is connected
    if (!wallet.isConnected) {
      toast({
        title: "Connect Wallet Required",
        description: "Please connect your wallet before playing",
        variant: "destructive"
      });
      return;
    }
    
    // Check if faucet has been used (player has tokens)
    if (wallet.balance <= 0) {
      toast({
        title: "Use Faucet Required",
        description: "Please use the faucet to get tokens before playing",
        variant: "destructive"
      });
      return;
    }
    
    setSnake(INITIAL_SNAKE);
    setDirection({ x: 0, y: -1 });
    setBalls([]);
    setGameOver(false);
    setGameRunning(true);
  };

  const pauseGame = () => {
    setGameRunning(!gameRunning);
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection({ x: 0, y: -1 });
    setBalls([]);
    setGameOver(false);
    setGameRunning(false);
  };

  const useFaucet = () => {
    const now = Date.now();
    const timeSinceLastUse = now - lastFaucetTime;
    
    if (timeSinceLastUse < FAUCET_COOLDOWN) {
      const remainingTime = FAUCET_COOLDOWN - timeSinceLastUse;
      const minutes = Math.ceil(remainingTime / 60000);
      toast({
        title: "Faucet Cooldown Active",
        description: `Please wait ${minutes} more minutes`,
        variant: "destructive"
      });
      return;
    }
    
    const newBalance = wallet.balance + 50;
    wallet.updateBalance(newBalance);
    setLastFaucetTime(now);
    toast({
      title: "Faucet Used! 🚰",
      description: "+50 Moon tokens received",
      className: "border-blue-500 bg-blue-500/10"
    });
  };

  const canUseFaucet = () => {
    return Date.now() - lastFaucetTime >= FAUCET_COOLDOWN;
  };

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Address Copied!",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const handleMobileDirectionChange = (newDirection: Position) => {
    setDirection(newDirection);
  };

  // Multiplayer functions
  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substr(2, 9);
    setCurrentRoom(roomId);
    setIsMultiplayer(true);
    setSearchParams({ room: roomId });
    return roomId;
  };

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoom(roomId);
    setIsMultiplayer(true);
    setSearchParams({ room: roomId });
  };

  const handleScoreUpdate = (playerId: string, score: number) => {
    // Handle score updates for multiplayer
    if (playerId === playerId) {
      toast({
        title: score > 0 ? "Score Updated! 🎯" : "Score Lost! ⚠️",
        description: `Your score: ${score}`,
        className: score > 0 ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
      });
    }
  };

  const dismissHint = () => {
    setShowFirstTimeHint(false);
    localStorage.setItem('hasSeenArrowHint', 'true');
  };

  // Auto-dismiss hint when game starts
  useEffect(() => {
    if (gameRunning && showFirstTimeHint) {
      dismissHint();
    }
  }, [gameRunning, showFirstTimeHint]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6 relative">
          {/* Logo in top corner */}
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
          
          {/* Leaderboard Link */}
          <motion.div
            className="absolute top-0 right-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/leaderboard">
              <Button variant="ghost" className="text-purple-300 hover:text-white border border-purple-500/50">
                <Trophy className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            MONAD SNAKE
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Cyberpunk Snake • Collect Green Balls • Avoid Damage
          </motion.p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Left Panel - Wallet & Multiplayer */}
          <motion.div
            className="lg:w-80 flex-shrink-0 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Multiplayer Panel */}
            <RoomManager
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              currentRoom={currentRoom}
              isConnected={isConnected}
              playerCount={Object.keys(gameState.players).length}
              canStartGame={Object.keys(gameState.players).length === 2}
              onStartGame={startMultiplayerGame}
              isRoomCreator={isRoomCreator}
              roomFull={gameState.roomFull}
            />

            {/* Wallet Panel */}
            <Card className="bg-black/50 border-purple-500/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-300">
                  <Wallet className="w-5 h-5" />
                  Monad Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">
                    {wallet.balance.toFixed(1)} MOON
                  </p>
                  <p className="text-sm text-gray-400">Token Balance</p>
                </div>

                {wallet.isConnected && wallet.address && (
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Wallet Address:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-green-400 flex-1 truncate">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={copyAddress}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={wallet.isConnected ? wallet.disconnectWallet : wallet.connectWallet}
                  disabled={wallet.isConnecting}
                  className={`w-full ${wallet.isConnected 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {wallet.isConnecting ? 'Connecting...' : wallet.isConnected ? 'Disconnect' : 'Connect Wallet'}
                </Button>
                
                <Button
                  onClick={useFaucet}
                  disabled={!canUseFaucet() || !wallet.isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Faucet (50 MOON)
                </Button>
                
                {!canUseFaucet() && (
                  <p className="text-xs text-gray-500 text-center">
                    Cooldown: {Math.ceil((FAUCET_COOLDOWN - (Date.now() - lastFaucetTime)) / 60000)}min
                  </p>
                )}

                {!wallet.isConnected && (
                  <p className="text-xs text-yellow-500 text-center">
                    Connect wallet and use faucet to play
                  </p>
                )}
                
                {wallet.isConnected && wallet.balance <= 0 && (
                  <p className="text-xs text-orange-500 text-center">
                    Use faucet to get tokens before playing
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Multiplayer Scores */}
            {isMultiplayer && Object.keys(gameState.players).length > 0 && (
              <Card className="bg-black/50 border-cyan-500/50 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-300">
                    <Trophy className="w-5 h-5" />
                    Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.values(gameState.players).map((player) => (
                    <div 
                      key={player.id}
                      className={`flex justify-between items-center p-2 rounded ${
                        player.id === playerId ? 'bg-purple-600/30 border border-purple-500/50' : 'bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white/50"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="text-sm font-mono">
                          {player.id === playerId ? 'You' : player.id.slice(0, 6)}
                        </span>
                        {!player.isAlive && <span className="text-red-400 text-xs">💀</span>}
                      </div>
                      <span className="text-cyan-400 font-bold">{player.score}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Game Board */}
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-black/70 border-purple-500 backdrop-blur-md relative overflow-hidden flex-1">
              {/* Animated rainbow aura */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 rounded-lg blur opacity-30 animate-pulse" />
              
              <CardContent className="p-6 relative h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-purple-300">Game Board</h2>
                  <div className="flex gap-2">
                    {!gameRunning && !gameOver && (
                      <Button 
                        onClick={startGame} 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!wallet.isConnected || wallet.balance <= 0}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {gameRunning && (
                      <Button onClick={pauseGame} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    <Button onClick={resetGame} size="sm" className="bg-red-600 hover:bg-red-700">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Speed Controller */}
                <div className="absolute top-4 right-4 bg-black/70 p-3 rounded-lg border border-purple-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Speed</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {Object.keys(SPEED_SETTINGS).map((speed) => (
                      <Button
                        key={speed}
                        onClick={() => setGameSpeed(speed as keyof typeof SPEED_SETTINGS)}
                        size="sm"
                        variant={gameSpeed === speed ? "default" : "ghost"}
                        className={`h-6 text-xs ${
                          gameSpeed === speed 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'text-gray-300 hover:text-white hover:bg-purple-500/30'
                        }`}
                      >
                        {speed}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Game Grid */}
                <div className="flex-1 flex items-center justify-center">
                  {isMultiplayer && currentRoom ? (
                    <MultiplayerSnakeGame 
                      roomId={currentRoom}
                      playerId={playerId}
                      onScoreUpdate={handleScoreUpdate}
                    />
                  ) : (
                    <div 
                      className="grid bg-black/80 border-2 border-purple-500 rounded-lg p-2"
                      style={{ 
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        width: 'min(500px, 80vw)',
                        height: 'min(500px, 80vw)'
                      }}
                    >
                      {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                        const x = index % GRID_SIZE;
                        const y = Math.floor(index / GRID_SIZE);
                        
                        const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
                        const isSnakeBody = snake.slice(1).some(segment => segment.x === x && segment.y === y);
                        const ball = balls.find(b => b.position.x === x && b.position.y === y);
                        
                        return (
                          <motion.div
                            key={index}
                            className={`border border-purple-900/30 relative ${
                              isSnakeHead 
                                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full shadow-lg shadow-cyan-400/50' 
                                : isSnakeBody 
                                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 rounded-sm' 
                                  : ball?.type === 'green'
                                    ? 'bg-gradient-to-br from-green-400 to-green-600 border-2 border-white/30 shadow-lg shadow-green-400/50'
                                    : ball?.type === 'damage'
                                      ? 'bg-gradient-to-br from-red-500 to-red-700 border-2 border-white/30 shadow-lg shadow-red-500/50'
                                      : 'bg-gray-900/20'
                            }`}
                            animate={
                              isSnakeHead 
                                ? { scale: [1, 1.1, 1] }
                                : ball 
                                  ? { scale: [1, 1.1, 1], rotate: [0, 15, -15, 0] }
                                  : {}
                            }
                            transition={
                              isSnakeHead 
                                ? { duration: 0.3, repeat: Infinity }
                                : ball
                                  ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                                  : {}
                            }
                            style={ball ? {
                              borderRadius: '25%',
                              transform: 'rotate(45deg)'
                            } : {}}
                          >
                            {/* Snake Head Eyes */}
                            {isSnakeHead && (
                              <>
                                {/* Eyes positioned based on direction */}
                                <div className={`absolute flex gap-1 ${
                                  direction.y === -1 ? 'top-1 left-1/2 transform -translate-x-1/2' : // Up
                                  direction.y === 1 ? 'bottom-1 left-1/2 transform -translate-x-1/2' : // Down  
                                  direction.x === -1 ? 'left-1 top-1/2 transform -translate-y-1/2 flex-col' : // Left
                                  'right-1 top-1/2 transform -translate-y-1/2 flex-col' // Right
                                }`}>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner">
                                    <div className="w-0.5 h-0.5 bg-red-500 rounded-full mt-0.5 ml-0.5"></div>
                                  </div>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner">
                                    <div className="w-0.5 h-0.5 bg-red-500 rounded-full mt-0.5 ml-0.5"></div>
                                  </div>
                                </div>
                                
                                {/* Forked tongue */}
                                <div className={`absolute ${
                                  direction.y === -1 ? 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1' : // Up
                                  direction.y === 1 ? 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1' : // Down
                                  direction.x === -1 ? 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-1' : // Left  
                                  'right-0 top-1/2 transform -translate-y-1/2 translate-x-1' // Right
                                }`}>
                                  <div className={`relative ${
                                    direction.y !== 0 ? 'w-1 h-2' : 'w-2 h-1'
                                  }`}>
                                    <div className={`absolute bg-red-400 ${
                                      direction.y === -1 ? 'w-0.5 h-1.5 left-0 rounded-t-sm' : // Up left
                                      direction.y === -1 ? 'w-0.5 h-1.5 right-0 rounded-t-sm' : // Up right
                                      direction.y === 1 ? 'w-0.5 h-1.5 left-0 rounded-b-sm' : // Down left
                                      direction.y === 1 ? 'w-0.5 h-1.5 right-0 rounded-b-sm' : // Down right
                                      direction.x === -1 ? 'w-1.5 h-0.5 top-0 rounded-l-sm' : // Left top
                                      direction.x === -1 ? 'w-1.5 h-0.5 bottom-0 rounded-l-sm' : // Left bottom
                                      direction.x === 1 ? 'w-1.5 h-0.5 top-0 rounded-r-sm' : // Right top
                                      'w-1.5 h-0.5 bottom-0 rounded-r-sm' // Right bottom
                                    }`}></div>
                                    <div className={`absolute bg-red-400 ${
                                      direction.y === -1 ? 'w-0.5 h-1.5 right-0 rounded-t-sm' :
                                      direction.y === 1 ? 'w-0.5 h-1.5 right-0 rounded-b-sm' :
                                      direction.x === -1 ? 'w-1.5 h-0.5 bottom-0 rounded-l-sm' :
                                      'w-1.5 h-0.5 bottom-0 rounded-r-sm'
                                    }`}></div>
                                  </div>
                                </div>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Game Controls Help */}
                <div className="mt-4 text-center text-sm text-gray-400">
                  <div>Use WASD, Arrow Keys, or click the controls below to start and move</div>
                </div>

                {/* Joystick Controls */}
                <JoystickControl 
                  onDirectionChange={isMultiplayer ? changeMultiplayerDirection : handleMobileDirectionChange}
                  gameRunning={isMultiplayer ? gameState.gameRunning : gameRunning}
                  currentDirection={isMultiplayer ? (gameState.players[playerId]?.direction || { x: 0, y: -1 }) : direction}
                  onStartGame={isMultiplayer ? startMultiplayerGame : startGame}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Game Over Modal */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gradient-to-br from-purple-900 to-black p-8 rounded-lg border border-purple-500 text-center max-w-md"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over</h2>
                <p className="text-xl text-gray-300 mb-6">
                  Better luck next time.<br />Build Monad.
                </p>
                <Button onClick={resetGame} className="bg-purple-600 hover:bg-purple-700">
                  Play Again
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* First Time Arrow Hint Overlay */}
        <AnimatePresence>
          {showFirstTimeHint && wallet.isConnected && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissHint}
            >
              <motion.div
                className="bg-gradient-to-br from-purple-900 via-black to-indigo-900 border-2 border-purple-500 rounded-xl p-8 max-w-md mx-4 text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-purple-300 mb-3">🎮 How to Play</h3>
                  <p className="text-gray-300 mb-4">
                    Use arrow keys or mobile controls to move your snake!
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto mb-4">
                    <div></div>
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold animate-pulse">
                      ↑
                    </div>
                    <div></div>
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold animate-pulse">
                      ←
                    </div>
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold animate-pulse">
                      ↓
                    </div>
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold animate-pulse">
                      →
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    Press any arrow key to start playing!
                  </p>
                </div>
                
                <Button 
                  onClick={dismissHint}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Got it! Let's Play 🚀
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t border-purple-500/30">
          <p className="text-sm text-gray-400">
            Powered by Redowan Production
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
