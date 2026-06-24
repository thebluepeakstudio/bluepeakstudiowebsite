import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import ContactForm from "../UI/ContactForm";
import "./ContactFormPopup.css";

const DELAY_MS = 10_000;

export default function ContactFormPopup() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (location.pathname === "/contact") return undefined;

    const timer = window.setTimeout(() => {
      if (window.location.pathname !== "/contact") {
        setOpen(true);
      }
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") dismiss();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  const handleSuccess = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="contact-popup-root" role="presentation">
      <button
        type="button"
        aria-label="Close contact form"
        className="contact-popup-backdrop"
        onClick={dismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-popup-title"
        className="contact-popup-panel"
      >
        <div className="contact-popup-header">
          <button
            type="button"
            onClick={dismiss}
            className="contact-popup-close"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="hero-badge mb-2 inline-flex">Get in touch</span>
            <h2
              id="contact-popup-title"
              className="font-[azonix] text-lg font-bold leading-snug text-white sm:text-xl"
            >
              Let&apos;s build something together
            </h2>
            <p className="dm-sans mt-1.5 max-w-sm text-sm text-gray-400">
              Share a quick message — we&apos;ll reply within 24 hours.
            </p>
          </div>
        </div>

        <div className="contact-popup-body">
          <ContactForm variant="popup" onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
