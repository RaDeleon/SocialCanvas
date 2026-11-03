import { useEffect, useRef, type ReactNode } from "react";
import { X, Layers, Check, AlertCircle } from "lucide-react";
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="SocialCanvas home">
      <span className="brand-mark">
        <Layers size={21} />
      </span>
      SocialCanvas
    </a>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={17} /> : <Check size={17} />}
      <span>{text}</span>
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">
        <Layers size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`toggle ${value ? "on" : ""}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </label>
  );
}
