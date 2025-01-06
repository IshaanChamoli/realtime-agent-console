import { useEffect, useState, useRef } from "react";

const functionDescriptions = `
Call this function when a user asks for a color palette.
Call pixel_art function when user asks for pixel art or simple drawings.
Call create_game function when user asks for simple Python games like Snake, Pacman, etc.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: "Generate and display a color palette based on a theme",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
      {
        type: "function",
        name: "create_pixel_art",
        description: "Generate and display simple pixel art drawings",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            description: {
              type: "string",
              description: "Description of what the pixel art represents",
            },
            pixels: {
              type: "array",
              description: "2D array of hex color codes representing pixels (8x8 grid)",
              items: {
                type: "array",
                items: {
                  type: "string",
                  description: "Hex color code for each pixel",
                },
              },
            },
            size: {
              type: "integer",
              description: "Size of the pixel grid (8 for 8x8)",
              enum: [8],
            },
          },
          required: ["description", "pixels", "size"],
        },
      },
      {
        type: "function",
        name: "create_game",
        description: "Generate simple JavaScript games that run in the browser using HTML5 Canvas",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            game_type: {
              type: "string",
              description: "Type of game to create (e.g., 'snake', 'pacman', 'pong')",
            },
            code: {
              type: "string",
              description: `Complete JavaScript code for the game. The code should be a function that takes a canvas parameter and returns a game controller object. Example structure:
              function initGame(canvas) {
                const ctx = canvas.getContext('2d');
                // Game setup code
                function gameLoop() {
                  // Game loop code
                }
                // Start game
                const gameInterval = setInterval(gameLoop, 1000/60);
                // Return controller
                return {
                  cleanup: () => clearInterval(gameInterval),
                  restart: () => { /* restart logic */ }
                };
              }
              return initGame;`,
            },
            description: {
              type: "string",
              description: "Brief description of the game and its controls (e.g., 'Use arrow keys to move')",
            }
          },
          required: ["game_type", "code", "description"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

function PixelArtOutput({ functionCallOutput }) {
  const { description, pixels, size } = JSON.parse(functionCallOutput.arguments);
  const pixelSize = "32px"; // Increased from 8px to 32px for larger display
  
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{description}</p>
      
      <div className="flex justify-center w-full">
        <div 
          className="grid gap-[1px] bg-gray-800 p-2 rounded-lg shadow-lg"
          style={{ 
            gridTemplateColumns: `repeat(${size}, ${pixelSize})`,
            width: 'fit-content'
          }}
        >
          {pixels.flat().map((color, i) => (
            <div
              key={i}
              style={{
                backgroundColor: color,
                width: pixelSize,
                height: pixelSize,
              }}
              className="transition-colors duration-200 hover:opacity-90"
              title={color} // Shows hex code on hover
            />
          ))}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={() => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const pixelCount = size;
          const actualSize = pixelCount * 32; // 32px per pixel
          
          canvas.width = actualSize;
          canvas.height = actualSize;
          
          pixels.flat().forEach((color, i) => {
            const x = (i % pixelCount) * 32;
            const y = Math.floor(i / pixelCount) * 32;
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 32, 32);
          });
          
          const link = document.createElement('a');
          link.download = 'pixel-art.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors w-full max-w-xs mx-auto"
      >
        Download PNG
      </button>

      <div className="mt-2 bg-gray-100 rounded-md p-4">
        <h3 className="text-sm font-semibold mb-2">Color Palette Used:</h3>
        <div className="flex flex-wrap gap-2">
          {[...new Set(pixels.flat())].map((color) => (
            <div
              key={color}
              className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm"
            >
              <div
                className="w-6 h-6 rounded-md border border-gray-200"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-mono">{color}</span>
            </div>
          ))}
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          Show raw data
        </summary>
        <pre className="mt-2 bg-gray-100 rounded-md p-2 overflow-x-auto">
          {JSON.stringify(functionCallOutput, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function GameOutput({ functionCallOutput }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const gameInstanceRef = useRef(null);

  let parsedData;
  try {
    console.log("Parsing game data:", functionCallOutput.arguments); // Debug log
    parsedData = JSON.parse(functionCallOutput.arguments);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    return (
      <div className="bg-red-100 p-4 rounded-lg">
        <h3 className="text-red-600 font-bold">Error Processing Game Output</h3>
        <p>{error.message}</p>
        <pre className="mt-2 text-xs">{functionCallOutput.arguments}</pre>
      </div>
    );
  }

  const { game_type, code, description } = parsedData;

  useEffect(() => {
    if (gameStarted && canvasRef.current) {
      try {
        // Clear any previous game instance
        if (gameInstanceRef.current && gameInstanceRef.current.cleanup) {
          gameInstanceRef.current.cleanup();
        }

        setError(null); // Reset error state
        console.log("Starting game with code:", code); // Debug log

        // Create a function from the code string and execute it
        const gameFunction = new Function('canvas', code);
        gameInstanceRef.current = gameFunction(canvasRef.current);

        if (!gameInstanceRef.current || typeof gameInstanceRef.current.cleanup !== 'function') {
          throw new Error('Game code must return an object with a cleanup function');
        }
      } catch (error) {
        console.error('Game execution error:', error);
        setError(error.message);
        setGameStarted(false);
      }
    }

    return () => {
      if (gameInstanceRef.current && gameInstanceRef.current.cleanup) {
        gameInstanceRef.current.cleanup();
      }
    };
  }, [gameStarted, code]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-100 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">{game_type}</h2>
        <p className="text-gray-700 mb-4">{description}</p>

        {error && (
          <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg p-4 shadow-lg">
          {!gameStarted ? (
            <button
              onClick={() => setGameStarted(true)}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
            >
              Start Game
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={canvasRef}
                width="400"
                height="400"
                className="border border-gray-200 rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (gameInstanceRef.current && gameInstanceRef.current.restart) {
                      gameInstanceRef.current.restart();
                    } else {
                      setGameStarted(false);
                      setTimeout(() => setGameStarted(true), 0);
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Restart
                </button>
                <button
                  onClick={() => {
                    setGameStarted(false);
                    if (gameInstanceRef.current && gameInstanceRef.current.cleanup) {
                      gameInstanceRef.current.cleanup();
                    }
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            View Source Code
          </summary>
          <pre className="mt-2 bg-gray-900 rounded-md p-4 overflow-x-auto">
            <code className="text-green-400 whitespace-pre-wrap">{code}</code>
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [activeFunction, setActiveFunction] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call") {
          console.log("Function call detected:", output.name); // Debug log
          console.log("Function arguments:", output.arguments); // Debug log
          
          setFunctionCallOutput(output);
          setActiveFunction(output.name);
          
          // Update instructions based on function type
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: output.name === "create_pixel_art" 
                  ? "ask for feedback about the pixel art - don't describe it again, just ask if they like it"
                  : output.name === "create_game"
                  ? "ask if they would like to try the game and if they need any clarification about how to run it"
                  : "ask for feedback about the color palette - don't repeat the colors, just ask if they like the colors",
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
      setActiveFunction(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">AI Creative Tools</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <>
              <div className="text-xs text-gray-500 mb-2">
                Active Function: {activeFunction}
              </div>
              {activeFunction === "create_pixel_art" ? (
                <PixelArtOutput functionCallOutput={functionCallOutput} />
              ) : activeFunction === "create_game" ? (
                <GameOutput functionCallOutput={functionCallOutput} />
              ) : (
                <FunctionCallOutput functionCallOutput={functionCallOutput} />
              )}
            </>
          ) : (
            <p>Ask for a color palette, pixel art drawing, or Python game...</p>
          )
        ) : (
          <p>Start the session to use these tools...</p>
        )}
      </div>
    </section>
  );
}
