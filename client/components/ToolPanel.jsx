import { useEffect, useState } from "react";

const functionDescriptions = `
Call this function when a user asks for a color palette.
Call pixel_art function when user asks for pixel art or simple drawings.
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
          setFunctionCallOutput(output);
          setActiveFunction(output.name);
          
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: output.name === "create_pixel_art" 
                  ? "ask for feedback about the pixel art - don't describe it again, just ask if they like it"
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
            activeFunction === "create_pixel_art" ? (
              <PixelArtOutput functionCallOutput={functionCallOutput} />
            ) : (
              <FunctionCallOutput functionCallOutput={functionCallOutput} />
            )
          ) : (
            <p>Ask for a color palette or pixel art drawing...</p>
          )
        ) : (
          <p>Start the session to use these tools...</p>
        )}
      </div>
    </section>
  );
}
