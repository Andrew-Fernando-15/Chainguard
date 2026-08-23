import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const ToastContext = createContext();

const ICONS = {
  success: <FiCheckCircle className="text-green" />,
  warning: <FiAlertTriangle className="text-cyan" />,
  info: <FiInfo className="text-blue" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[90] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="glass-strong flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg"
            >
              {ICONS[t.type]}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
