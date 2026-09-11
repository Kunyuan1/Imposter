const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:1234";
const DEBUG = import.meta.env.DEV;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

let ws = null;
let messageHandler = null;
let statusHandler = null;
let openHandler = null;
let reconnectTimer = null;
let attempts = 0;
let closedByUs = false;

export const STATUS = {
  CONNECTING: "connecting",   // first attempt, nothing has failed yet
  RECONNECTING: "reconnecting", // we have failed at least once and are retrying
  OPEN: "open",
  CLOSED: "closed",
};

function setStatus(status) {
  if (statusHandler) statusHandler(status);
}

function scheduleReconnect() {
  if (closedByUs || reconnectTimer) return;
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
  attempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, delay);
}

function open() {
  setStatus(attempts === 0 ? STATUS.CONNECTING : STATUS.RECONNECTING);
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    attempts = 0;
    setStatus(STATUS.OPEN);
    if (DEBUG) console.log("Connected to", WS_URL);
    // Fires on every successful connect, so this is where a dropped player
    // claims their held seat back.
    if (openHandler) openHandler();
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (DEBUG) console.log("Received:", msg);
    if (messageHandler) messageHandler(msg);
  };

  ws.onclose = () => {
    setStatus(attempts === 0 ? STATUS.CLOSED : STATUS.RECONNECTING);
    if (DEBUG) console.log("Disconnected from server");
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose always follows, which is where reconnection is handled.
    if (DEBUG) console.warn("WebSocket error");
  };
}

export function connect(onMessage, onStatus, onOpen) {
  messageHandler = onMessage;
  statusHandler = onStatus;
  openHandler = onOpen;
  closedByUs = false;
  attempts = 0;
  open();
}

export function getAttempts() {
  return attempts;
}

export function isConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

/** Returns false when the message could not be delivered, so callers can tell the user. */
export function sendMessage(msg) {
  if (!isConnected()) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

export function disconnect() {
  closedByUs = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) ws.close();
  ws = null;
}
