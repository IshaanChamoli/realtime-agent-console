import { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };

export default function Snake({ isActive, command }) {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [isPlaying, setIsPlaying] = useState(false);
  const gameLoopRef = useRef(null);

  // Generate random food position
  const generateFood = () => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  };

  // Handle command from realtime API
  useEffect(() => {
    if (!command) return;
    
    const directions = {
      'up': { x: 0, y: -1 },
      'down': { x: 0, y: 1 },
      'left': { x: -1, y: 0 },
      'right': { x: 1, y: 0 },
    };

    if (directions[command]) {
      setDirection(directions[command]);
      setIsPlaying(true);
    } else if (command === 'stop') {
      setIsPlaying(false);
    }
  }, [command]);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    gameLoopRef.current = setInterval(() => {
      setSnake((currentSnake) => {
        const head = currentSnake[0];
        const newHead = {
          x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
          y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
        };

        // Check if food is eaten
        if (newHead.x === food.x && newHead.y === food.y) {
          setFood(generateFood());
          return [newHead, ...currentSnake];
        }

        return [newHead, ...currentSnake.slice(0, -1)];
      });
    }, 200);

    return () => clearInterval(gameLoopRef.current);
  }, [isPlaying, direction, food]);

  // Add keyboard controls in the Snake component
  useEffect(() => {
    const handleKeyPress = (e) => {
      const keyDirections = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        ' ': 'stop', // Space bar to stop
      };

      if (keyDirections[e.key]) {
        const newCommand = keyDirections[e.key];
        if (newCommand === 'stop') {
          setIsPlaying(false);
        } else {
          setDirection(directions[newCommand]);
          setIsPlaying(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
      <h3 className="text-sm font-medium text-gray-600 mb-2">Snake Game</h3>
      <div 
        className="relative bg-gray-100 rounded"
        style={{ 
          width: GRID_SIZE * CELL_SIZE, 
          height: GRID_SIZE * CELL_SIZE 
        }}
      >
        {/* Food */}
        <div
          className="absolute bg-red-500 rounded-full"
          style={{
            width: CELL_SIZE - 2,
            height: CELL_SIZE - 2,
            left: food.x * CELL_SIZE + 1,
            top: food.y * CELL_SIZE + 1,
          }}
        />
        {/* Snake */}
        {snake.map((segment, i) => (
          <div
            key={i}
            className="absolute bg-green-500 rounded"
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: segment.x * CELL_SIZE + 1,
              top: segment.y * CELL_SIZE + 1,
            }}
          />
        ))}
      </div>
      
      {/* Controls */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Controls:</p>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setDirection({ x: 0, y: -1 });
              setIsPlaying(true);
            }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            ↑
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDirection({ x: -1, y: 0 });
                setIsPlaying(true);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              ←
            </button>
            <button
              onClick={() => setIsPlaying(false)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              ⏹
            </button>
            <button
              onClick={() => {
                setDirection({ x: 1, y: 0 });
                setIsPlaying(true);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              →
            </button>
          </div>
          <button
            onClick={() => {
              setDirection({ x: 0, y: 1 });
              setIsPlaying(true);
            }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            ↓
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Use arrow keys or buttons to control, space to stop
        </p>
      </div>
    </div>
  );
} 