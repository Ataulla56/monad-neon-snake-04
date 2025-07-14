
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileControlsProps {
  onDirectionChange: (direction: { x: number; y: number }) => void;
  gameRunning: boolean;
  currentDirection: { x: number; y: number };
  onStartGame: () => void;
}

const MobileControls = ({ onDirectionChange, gameRunning, currentDirection, onStartGame }: MobileControlsProps) => {
  const handleDirectionPress = (newDirection: { x: number; y: number }, event?: React.TouchEvent | React.MouseEvent) => {
    // Prevent default behavior to stop page scrolling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Auto-start the game if it's not running
    if (!gameRunning) {
      onStartGame();
    }
    
    // Prevent 180-degree turns only if game is already running
    if (gameRunning && currentDirection.x === -newDirection.x && currentDirection.y === -newDirection.y) {
      return;
    }
    
    onDirectionChange(newDirection);
  };

  const buttonVariants = {
    pressed: { scale: 0.9 },
    unpressed: { scale: 1 }
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <p className="text-sm text-gray-400 mb-2">Arrow Controls</p>
      
      {/* Up Button */}
      <motion.div
        variants={buttonVariants}
        whileTap="pressed"
        initial="unpressed"
      >
        <Button
          size="sm"
          className="w-12 h-12 bg-purple-600/80 hover:bg-purple-700 border border-purple-400"
          onTouchStart={(e) => handleDirectionPress({ x: 0, y: -1 }, e)}
          onClick={(e) => handleDirectionPress({ x: 0, y: -1 }, e)}
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
      </motion.div>
      
      {/* Left, Down, Right Buttons */}
      <div className="flex gap-2">
        <motion.div
          variants={buttonVariants}
          whileTap="pressed"
          initial="unpressed"
        >
          <Button
            size="sm"
            className="w-12 h-12 bg-purple-600/80 hover:bg-purple-700 border border-purple-400"
            onTouchStart={(e) => handleDirectionPress({ x: -1, y: 0 }, e)}
            onClick={(e) => handleDirectionPress({ x: -1, y: 0 }, e)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </motion.div>
        
        <motion.div
          variants={buttonVariants}
          whileTap="pressed"
          initial="unpressed"
        >
          <Button
            size="sm"
            className="w-12 h-12 bg-purple-600/80 hover:bg-purple-700 border border-purple-400"
            onTouchStart={(e) => handleDirectionPress({ x: 0, y: 1 }, e)}
            onClick={(e) => handleDirectionPress({ x: 0, y: 1 }, e)}
          >
            <ArrowDown className="w-6 h-6" />
          </Button>
        </motion.div>
        
        <motion.div
          variants={buttonVariants}
          whileTap="pressed"
          initial="unpressed"
        >
          <Button
            size="sm"
            className="w-12 h-12 bg-purple-600/80 hover:bg-purple-700 border border-purple-400"
            onTouchStart={(e) => handleDirectionPress({ x: 1, y: 0 }, e)}
            onClick={(e) => handleDirectionPress({ x: 1, y: 0 }, e)}
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileControls;
