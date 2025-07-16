import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

interface Position {
  x: number;
  y: number;
}

interface Ball {
  position: Position;
  type: 'green' | 'damage';
  id: string;
}

interface Player {
  id: string;
  snake: Position[];
  score: number;
  isAlive: boolean;
  direction: Position;
  color: string;
}

interface GameState {
  players: Record<string, Player>;
  balls: Ball[];
  gameRunning: boolean;
  roomFull: boolean;
}

export const useMultiplayer = (roomId: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    players: {},
    balls: [],
    gameRunning: false,
    roomFull: false
  });
  const [playerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const gameStateMapRef = useRef<Y.Map<any> | null>(null);
  const playersMapRef = useRef<Y.Map<any> | null>(null);

  const initializeMultiplayer = useCallback((roomId: string) => {
    // Clean up existing connections first
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider(roomId, ydoc, {
      signaling: ['wss://signaling.yjs.dev'],
      maxConns: 2, // Only allow 2 connections (2 players max)
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;

    const gameStateMap = ydoc.getMap('gameState');
    const playersMap = ydoc.getMap('players');
    
    gameStateMapRef.current = gameStateMap;
    playersMapRef.current = playersMap;

    // Check if room already has 2 players
    provider.on('status', ({ connected }: { connected: boolean }) => {
      setIsConnected(connected);
      
      if (connected) {
        const playerCount = Array.from(playersMap.keys()).length;
        
        if (playerCount >= 2 && !playersMap.has(playerId)) {
          setGameState(prev => ({ ...prev, roomFull: true }));
          return;
        }

        // Add current player if room not full
        if (!playersMap.has(playerId)) {
          const playerColors = ['#06b6d4', '#f59e0b']; // cyan-500, amber-500
          const existingPlayers = Array.from(playersMap.values());
          const usedColors = existingPlayers.map((p: any) => p.color);
          const availableColor = playerColors.find(c => !usedColors.includes(c)) || playerColors[0];
          
          playersMap.set(playerId, {
            id: playerId,
            snake: [{ x: 10, y: 10 }],
            score: 0,
            isAlive: true,
            direction: { x: 0, y: -1 },
            color: availableColor
          });

          // Set as room creator if first player
          if (existingPlayers.length === 0) {
            setIsRoomCreator(true);
            gameStateMap.set('creator', playerId);
          }
        }
      }
    });

    // Listen for game state changes
    const updateGameState = () => {
      const players: Record<string, Player> = {};
      playersMap.forEach((player: any, id: string) => {
        players[id] = player as Player;
      });

      const balls = (gameStateMap.get('balls') as Ball[]) || [];
      const gameRunning = Boolean(gameStateMap.get('gameRunning')) || false;
      const playerCount = Object.keys(players).length;

      setGameState({
        players,
        balls,
        gameRunning,
        roomFull: playerCount >= 2 && !players[playerId]
      });
    };

    playersMap.observe(updateGameState);
    gameStateMap.observe(updateGameState);

    // Initial state update
    updateGameState();

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [playerId]);

  useEffect(() => {
    if (roomId) {
      const cleanup = initializeMultiplayer(roomId);
      return cleanup;
    }
  }, [roomId, initializeMultiplayer]);

  const updatePlayer = useCallback((updates: Partial<Player>) => {
    if (!playersMapRef.current || !playersMapRef.current.has(playerId)) return;
    
    const currentPlayer = playersMapRef.current.get(playerId);
    playersMapRef.current.set(playerId, { ...currentPlayer, ...updates });
  }, [playerId]);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    if (!gameStateMapRef.current) return;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'players') { // players are handled separately
        gameStateMapRef.current!.set(key, value);
      }
    });
  }, []);

  const startGame = useCallback(() => {
    if (!isRoomCreator || !gameStateMapRef.current) return;
    
    const playerCount = Object.keys(gameState.players).length;
    if (playerCount !== 2) return; // Only start with exactly 2 players

    // Generate initial balls
    const initialBalls: Ball[] = [];
    for (let i = 0; i < 3; i++) {
      initialBalls.push({
        position: {
          x: Math.floor(Math.random() * 20),
          y: Math.floor(Math.random() * 20)
        },
        type: Math.random() < 0.6 ? 'green' : 'damage',
        id: `ball-${i}-${Date.now()}`
      });
    }

    gameStateMapRef.current.set('balls', initialBalls);
    gameStateMapRef.current.set('gameRunning', true);
  }, [isRoomCreator, gameState.players]);

  const stopGame = useCallback(() => {
    if (!gameStateMapRef.current) return;
    gameStateMapRef.current.set('gameRunning', false);
  }, []);

  const resetGame = useCallback(() => {
    if (!isRoomCreator || !gameStateMapRef.current || !playersMapRef.current) return;
    
    // Reset all players
    playersMapRef.current.forEach((player, id) => {
      playersMapRef.current!.set(id, {
        ...player,
        snake: [{ x: 10, y: 10 }],
        score: 0,
        isAlive: true,
        direction: { x: 0, y: -1 }
      });
    });

    gameStateMapRef.current.set('gameRunning', false);
    gameStateMapRef.current.set('balls', []);
  }, [isRoomCreator]);

  const changeDirection = useCallback((newDirection: Position) => {
    updatePlayer({ direction: newDirection });
  }, [updatePlayer]);

  const cleanup = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
  }, []);

  return {
    isConnected,
    gameState,
    playerId,
    isRoomCreator,
    updatePlayer,
    updateGameState,
    startGame,
    stopGame,
    resetGame,
    changeDirection,
    cleanup
  };
};