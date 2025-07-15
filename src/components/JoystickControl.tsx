import React from 'react';
import { motion } from 'framer-motion';

interface Position {
  x: number;
  y: number;
}

interface JoystickControlProps {
  onDirectionChange: (direction: Position) => void;
  gameRunning: boolean;
  currentDirection: Position;
  onStartGame: () => void;
}

const JoystickControl = ({ onDirectionChange, gameRunning, currentDirection, onStartGame }: JoystickControlProps) => {
  const handleDirectionPress = (newDirection: Position, event?: React.TouchEvent | React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!gameRunning) {
      onStartGame();
    }
    
    // Prevent 180-degree turns only if game is already running
    if (gameRunning && currentDirection.x === -newDirection.x && currentDirection.y === -newDirection.y) {
      return;
    }
    
    onDirectionChange(newDirection);
  };

  const getRotationForDirection = (direction: Position) => {
    if (direction.x === 0 && direction.y === -1) return 0; // Up
    if (direction.x === 1 && direction.y === 0) return 90; // Right  
    if (direction.x === 0 && direction.y === 1) return 180; // Down
    if (direction.x === -1 && direction.y === 0) return 270; // Left
    return 0;
  };

  const isDirectionActive = (direction: Position) => {
    return currentDirection.x === direction.x && currentDirection.y === direction.y;
  };

  const directions = [
    { x: 0, y: -1, label: 'Up', angle: 0 },
    { x: 1, y: 0, label: 'Right', angle: 45 },
    { x: 0, y: 1, label: 'Down', angle: 90 },
    { x: -1, y: 0, label: 'Left', angle: 135 }
  ];

  return (
    <div className="fixed bottom-4 left-4 z-10">
      <div className="relative w-32 h-32">
        {/* Outer circle */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border-2 border-purple-500/50 backdrop-blur-sm" />
        
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 border-2 border-white/30 shadow-lg" />
        
        {/* Direction buttons */}
        {directions.map((dir, index) => {
          const angle = index * 90; // 0, 90, 180, 270 degrees
          const radius = 40; // Distance from center
          const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
          
          return (
            <motion.button
              key={`${dir.x}-${dir.y}`}
              className={`absolute w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                isDirectionActive(dir)
                  ? 'bg-gradient-to-br from-cyan-400 to-purple-500 border-white shadow-lg shadow-cyan-400/50 scale-110'
                  : 'bg-gradient-to-br from-purple-600/80 to-cyan-600/80 border-purple-300/50 hover:scale-105'
              }`}
              style={{
                left: `calc(50% + ${x}px - 16px)`,
                top: `calc(50% + ${y}px - 16px)`,
              }}
              onTouchStart={(e) => handleDirectionPress(dir, e)}
              onClick={(e) => handleDirectionPress(dir, e)}
              whileTap={{ scale: 0.9 }}
              animate={isDirectionActive(dir) ? { 
                scale: [1.1, 1.2, 1.1],
                boxShadow: [
                  '0 0 20px rgba(6, 182, 212, 0.5)',
                  '0 0 30px rgba(6, 182, 212, 0.7)',
                  '0 0 20px rgba(6, 182, 212, 0.5)'
                ]
              } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              {/* Snake head indicator */}
              <div 
                className="w-full h-full rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center"
                style={{ transform: `rotate(${getRotationForDirection(dir)}deg)` }}
              >
                <div className="w-2 h-3 bg-gradient-to-b from-cyan-300 to-cyan-500 rounded-full relative">
                  {/* Eyes */}
                  <div className="absolute -top-0.5 left-0 w-1 h-1 bg-red-400 rounded-full opacity-80" />
                  <div className="absolute -top-0.5 right-0 w-1 h-1 bg-red-400 rounded-full opacity-80" />
                </div>
              </div>
            </motion.button>
          );
        })}
        
        {/* Center text */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xs text-white font-bold opacity-80">MOVE</div>
        </div>
      </div>
      
      <div className="text-center mt-2">
        <span className="text-xs text-gray-400">Joystick Control</span>
      </div>
    </div>
  );
};

export default JoystickControl;