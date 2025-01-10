import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function Event({ event, timestamp }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isClient = event.event_id && !event.event_id.startsWith("event_");

  return (
    <div className="flex flex-col gap-2 p-2 mb-2 rounded-md bg-white border border-gray-100">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-5 flex-shrink-0">
          {isClient ? (
            <ArrowDown className="text-blue-400" />
          ) : (
            <ArrowUp className="text-green-400" />
          )}
        </div>
        <div className="text-sm text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
          {isClient ? "client:" : "server:"}
          &nbsp;{event.type} | {timestamp}
        </div>
      </div>
      <div
        className={`text-gray-500 bg-gray-50 p-2 rounded-md overflow-x-auto ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre className="text-xs">{JSON.stringify(event, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function EventLog({ events = [] }) {
  const eventsToDisplay = [];
  let deltaEvents = {};

  if (!Array.isArray(events)) return null;

  events.forEach((event) => {
    if (!event) return;
    
    if (event.type?.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        return;
      } else {
        deltaEvents[event.type] = event;
      }
    }

    eventsToDisplay.push(
      <Event
        key={event.event_id || crypto.randomUUID()}
        event={event}
        timestamp={new Date().toLocaleTimeString()}
      />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {eventsToDisplay.length === 0 ? (
        <div className="text-gray-500">Awaiting events...</div>
      ) : (
        eventsToDisplay
      )}
    </div>
  );
}
