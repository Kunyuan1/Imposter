import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, tone }
  const timerRef = useRef(null);
  const idRef = useRef(0);

  const showToast = useCallback((message, tone = "alert") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++idRef.current;
    setToast({ id, message, tone });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 3000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-layer" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <span className="toast-tag">{toast.tone === "alert" ? "// alert" : "// info"}</span>
            <span className="toast-msg">{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
