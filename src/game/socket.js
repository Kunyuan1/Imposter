// Accept whatever form of the address someone pastes in. Copying the https://
// URL straight out of a hosting dashboard is the easy mistake to make here, and
// it fails silently, so normalise it rather than leaving a dead socket.
function toWsUrl(raw) {
  const value = (raw || "").trim().replace(/\/+$/, "");
  if (!value) return "ws://localhost:1234";
  if (/^wss?:\/\//i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value.replace(/^https:/i, "wss:");
  if (/^http:\/\//i.test(value)) return value.replace(/^http:/i, "ws:");
  // A bare host, e.g. "imposter-server.onrender.com".
  return `wss://${value}`;
}

const WS_URL = toWsUrl(import.meta.env.VITE_WS_URL);
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
let pageHideHandler = null;

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

  // Tell the server we are leaving before the socket dies: a hosting proxy can
  // sit on the TCP close for many seconds (Render takes ~10), during which the
  // table is still waiting on a player who has already closed the tab.
  // "pagehide" is the reliable unload signal on mobile; "beforeunload" is not.
  if (!pageHideHandler && typeof window !== "undefined") {
    pageHideHandler = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "going_away" }));
        } catch {
          // Nothing useful to do while the page is being torn down.
        }
      }
    };
    window.addEventListener("pagehide", pageHideHandler);
  }

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
  if (pageHideHandler && typeof window !== "undefined") {
    window.removeEventListener("pagehide", pageHideHandler);
    pageHideHandler = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) ws.close();
  ws = null;
}
