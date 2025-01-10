import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import { ChevronLeft, ChevronRight } from "react-feather";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  async function startSession() {
    // Get an ephemeral key from the Fastify server
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...(prev || [])]);
      } catch (error) {
        console.error("Error parsing message data:", error);
      }
    });

    dataChannel.addEventListener("open", () => {
      setIsSessionActive(true);
      setEvents([]);
    });
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>realtime console</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 bottom-0 right-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 p-4 pt-0 overflow-y-auto">
            <ToolPanel
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4 bg-white">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section 
          className={`absolute top-0 right-0 bottom-36 transition-all duration-500 ease-in-out transform ${
            isSidebarOpen ? "translate-x-0 w-[450px]" : "translate-x-full w-[450px]"
          }`}
          style={{ zIndex: 10 }}
        >
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -left-8 top-1/2 -translate-y-1/2 bg-white p-1 rounded-l-md border border-r-0 border-gray-200 hover:bg-gray-50"
          >
            {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div className={`absolute inset-0 flex flex-col border-l-4 border-gray-300 bg-gray-50 transition-opacity duration-500 ${
            isSidebarOpen ? "opacity-100" : "opacity-0"
          }`}>
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h2 className="text-sm font-medium text-gray-600">Session Events</h2>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              <EventLog events={events} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
