import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { consumeWelcomePending } from '../../utils/welcomeSession';
import './WelcomeModal.css';

const CLOSE_MS = 220;

const WelcomeModal = () => {
  const titleId = useId();
  const startRef = useRef(null);
  const closingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!consumeWelcomePending()) return undefined;
    setOpen(true);
    return undefined;
  }, []);

  const beginClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closingRef.current = false;
    }, CLOSE_MS);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => startRef.current?.focus(), 40);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        beginClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, beginClose]);

  if (!open) return null;

  return (
    <div className={`welcome-overlay${closing ? ' is-closing' : ''}`} role="presentation">
      <div
        className={`welcome-modal${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="welcome-close"
          onClick={beginClose}
          aria-label="Close welcome"
        >
          <X size={18} />
        </button>

        <span className="welcome-mark" aria-hidden="true">BS</span>
        <p className="welcome-kicker">ZayithBill</p>
        <h2 id={titleId}>Welcome to ZayithBill!</h2>
        <p className="welcome-tagline">Your Business, Simplified.</p>
        <p className="welcome-copy">
          We&apos;re happy to have you back. Let&apos;s make your billing experience smarter and easier.
        </p>
        <button
          ref={startRef}
          type="button"
          className="welcome-start"
          onClick={beginClose}
        >
          Let&apos;s Get Started
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
