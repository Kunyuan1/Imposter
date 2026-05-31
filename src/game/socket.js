const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:1234";

let ws = null;
let messageHandler = null;

export function connect(onMessage) {
  messageHandler = onMessage;
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("Connected to server");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("Received:", msg);
    if (messageHandler) messageHandler(msg);
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
}

export function sendMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function disconnect() {
  if (ws) ws.close();
}