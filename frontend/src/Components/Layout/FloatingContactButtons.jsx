import { createPortal } from "react-dom";
import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { TEL_URL, WHATSAPP_URL } from "../../config/contact";

const btnBase =
  "pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md transition-[filter,opacity] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:opacity-90 sm:h-12 sm:w-12";

export default function FloatingContactButtons() {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[60] flex w-11 flex-col gap-2.5 sm:w-12 sm:gap-3"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
      aria-label="Quick contact"
    >
      <a
        href={TEL_URL}
        className={`${btnBase} bg-blue-600 text-white hover:bg-blue-500 lg:hidden`}
        aria-label="Call BluePeak Studio"
        title="Call us"
      >
        <Phone size={20} strokeWidth={2.25} aria-hidden />
      </a>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnBase} bg-[#25D366] text-white hover:bg-[#20bd5a]`}
        aria-label="Chat on WhatsApp"
        title="WhatsApp"
      >
        <FaWhatsapp size={22} aria-hidden />
      </a>
    </div>,
    document.body
  );
}
