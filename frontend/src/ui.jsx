import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, type = "ok") => {
    const id = Date.now() + Math.random();
    setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{list.map(t => <div key={t.id} className={"toast " + t.type}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}

export function Modal({ title, children, onClose, actions }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2><div>{children}</div><div className="actions">{actions}</div>
      </div>
    </div>
  );
}

export const Skeleton = ({ rows = 4 }) => <div className="panel">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skel" />)}</div>;

export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn ghost" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn ghost" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
