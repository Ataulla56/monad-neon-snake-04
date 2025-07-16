import React, { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useToast } from '@/hooks/use-toast';

interface Position {
  x: number;
  y: number;
}

interface Ball {
  position: Position;
  type: 'green' | 'damage';
  id: string;
}

interface MultiplayerSnakeGameProps {
  roomId: string;
  playerId: string;
  onScoreUpdate?: (playerId: string, score: number) => void;
}

const GRID_SIZE = 20;
const GAME_SPEED = 150;

export const MultiplayerSnakeGame = ({ roomId, playerId, onScoreUpdate }: MultiplayerSnakeGameProps) => {
  const { toast } = useToast();
  const { 
    gameState, 
    updatePlayer, 
    updateGameState,
    isRoomCreator 
  } = useMultiplayer(roomId);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const gameEndedRef = useRef<boolean>(false);

  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  }, []);

  const isPositionOccupied = useCallback((pos: Position, allSnakes: Position[][]): boolean => {
    return allSnakes.some(snake => 
      snake.some(segment => segment.x === pos.x && segment.y === pos.y)
    );
  }, []);

  const generateBalls = useCallback((allSnakes: Position[][]) => {
    const newBalls: Ball[] = [];
    const targetBallCount = Math.min(5, Math.floor(Math.random() * 3) + 2);
    
    for (let i = 0; i < targetBallCount; i++) {
      let position: Position;
      let attempts = 0;
      
      do {
        position = generateRandomPosition();
        attempts++;
      } while (
        (isPositionOccupied(position, allSnakes) || 
         newBalls.some(ball => ball.position.x === position.x && ball.position.y === position.y)) &&
        attempts < 100
      );
      
      if (attempts < 100) {
        newBalls.push({
          position,
          type: Math.random() < 0.7 ? 'green' : 'damage',
          id: `ball-${i}-${Date.now()}-${Math.random()}`
        });
      }
    }
    
    return newBalls;
  }, [generateRandomPosition, isPositionOccupied]);

  const moveSnakes = useCallback(() => {
    if (!gameState.gameRunning || !isRoomCreator) return;

    const currentPlayer = gameState.players[playerId];
    if (!currentPlayer || !currentPlayer.isAlive) return;

    // Only room creator processes game logic to avoid conflicts
    const playerIds = Object.keys(gameState.players);
    const updatedPlayers = { ...gameState.players };
    const allSnakes = Object.values(gameState.players).map(p => p.snake);
    let ballsChanged = false;
    let currentBalls = [...gameState.balls];

    // Move each player's snake
    playerIds.forEach(pId => {
      const player = updatedPlayers[pId];
      if (!player.isAlive) return;

      const newSnake = [...player.snake];
      const head = { ...newSnake[0] };
      
      head.x += player.direction.x;
      head.y += player.direction.y;
      
      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        updatedPlayers[pId] = { ...player, isAlive: false };
        console.log(`Player ${pId} died: wall collision`);
        return;
      }
      
      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        updatedPlayers[pId] = { ...player, isAlive: false };
        return;
      }

      // Check collision with other snakes
      const otherSnakes = Object.values(updatedPlayers)
        .filter(p => p.id !== pId && p.isAlive)
        .map(p => p.snake);
      
      if (isPositionOccupied(head, otherSnakes)) {
        updatedPlayers[pId] = { ...player, isAlive: false };
        return;
      }
      
      newSnake.unshift(head);
      
      // Check ball collision
      const hitBall = currentBalls.find(ball => 
        ball.position.x === head.x && ball.position.y === head.y
      );
      
      if (hitBall) {
        const scoreChange = hitBall.type === 'green' ? 10 : -5;
        const newScore = Math.max(0, player.score + scoreChange);
        updatedPlayers[pId] = { 
          ...player, 
          snake: newSnake,
          score: newScore
        };
        
        // Remove hit ball
        currentBalls = currentBalls.filter(ball => ball.id !== hitBall.id);
        ballsChanged = true;
        
        if (onScoreUpdate) {
          onScoreUpdate(pId, newScore);
        }
      } else {
        newSnake.pop(); // Remove tail
        updatedPlayers[pId] = { ...player, snake: newSnake };
      }
    });

    // Generate new balls if needed
    if (currentBalls.length < 3 || ballsChanged) {
      const newAllSnakes = Object.values(updatedPlayers).map(p => p.snake);
      const newBalls = generateBalls(newAllSnakes);
      currentBalls = [...currentBalls, ...newBalls].slice(0, 5);
    }

    // Check game end conditions
    const alivePlayers = Object.values(updatedPlayers).filter(p => p.isAlive);
    if (alivePlayers.length <= 1 && !gameEndedRef.current) {
      gameEndedRef.current = true;
      updateGameState({ gameRunning: false });
      
      // Winner is the last alive or highest scorer
      let winner;
      if (alivePlayers.length === 1) {
        winner = alivePlayers[0];
      } else {
        winner = Object.values(updatedPlayers).reduce((prev, current) => 
          prev.score > current.score ? prev : current
        );
      }
      
      // Show winner notification
      setTimeout(() => {
        if (winner.id === playerId) {
          toast({
            title: "🏆 YOU WON! 🏆",
            description: `Congratulations! Final score: ${winner.score}`,
            className: "border-green-500 bg-green-500/10",
            duration: 5000
          });
        } else {
          toast({
            title: "Game Over! 💀",
            description: `Player ${winner.id.slice(0, 6)} won with score: ${winner.score}`,
            className: "border-red-500 bg-red-500/10",
            duration: 5000
          });
        }
      }, 500);
    }

    // Update all players and balls
    Object.entries(updatedPlayers).forEach(([pId, player]) => {
      if (pId === playerId) {
        updatePlayer(player);
      }
    });
    
    updateGameState({ balls: currentBalls });
  }, [gameState, playerId, isRoomCreator, updatePlayer, updateGameState, generateBalls, isPositionOccupied, onScoreUpdate]);

  // Game loop
  useEffect(() => {
    if (gameState.gameRunning && isRoomCreator) {
      gameEndedRef.current = false; // Reset game ended flag when game starts
      gameLoopRef.current = setInterval(moveSnakes, GAME_SPEED);
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
  }, [gameState.gameRunning, isRoomCreator, moveSnakes]);

  return (
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
        
        // Find which player's snake is at this position
        let isSnakeHead = false;
        let isSnakeBody = false;
        let playerColor = '';
        let snakeDirection = { x: 0, y: -1 };
        
        Object.values(gameState.players).forEach(player => {
          if (player.snake[0]?.x === x && player.snake[0]?.y === y) {
            isSnakeHead = true;
            playerColor = player.color;
            snakeDirection = player.direction;
          } else if (player.snake.slice(1).some(segment => segment.x === x && segment.y === y)) {
            isSnakeBody = true;
            playerColor = player.color;
          }
        });
        
        const ball = gameState.balls.find(b => b.position.x === x && b.position.y === y);
        
        return (
          <motion.div
            key={index}
            className={`border border-purple-900/30 relative ${
              isSnakeHead 
                ? `rounded-full shadow-lg` 
                : isSnakeBody 
                  ? `rounded-sm` 
                  : ball?.type === 'green'
                    ? 'bg-gradient-to-br from-green-400 to-green-600 border-2 border-white/30 shadow-lg shadow-green-400/50'
                    : ball?.type === 'damage'
                      ? 'bg-gradient-to-br from-red-500 to-red-700 border-2 border-white/30 shadow-lg shadow-red-500/50'
                      : 'bg-gray-900/20'
            }`}
            style={{
              backgroundColor: isSnakeHead || isSnakeBody ? playerColor : undefined,
              borderRadius: ball ? '25%' : undefined,
              transform: ball ? 'rotate(45deg)' : undefined
            }}
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
          >
            {/* Snake Head Eyes for multiplayer */}
            {isSnakeHead && (
              <>
                <div className={`absolute flex gap-1 ${
                  snakeDirection.y === -1 ? 'top-1 left-1/2 transform -translate-x-1/2' :
                  snakeDirection.y === 1 ? 'bottom-1 left-1/2 transform -translate-x-1/2' :
                  snakeDirection.x === -1 ? 'left-1 top-1/2 transform -translate-y-1/2 flex-col' :
                  'right-1 top-1/2 transform -translate-y-1/2 flex-col'
                }`}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner">
                    <div className="w-0.5 h-0.5 bg-red-500 rounded-full mt-0.5 ml-0.5"></div>
                  </div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner">
                    <div className="w-0.5 h-0.5 bg-red-500 rounded-full mt-0.5 ml-0.5"></div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default MultiplayerSnakeGame;