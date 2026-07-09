import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { TEL_URL, WHATSAPP_URL } from "../../config/contact";

const btnBase =
  "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95 sm:h-14 sm:w-14";

export default function FloatingContactButtons() {
  return (
    <div
      className="fixed bottom-5 right-4 z-[60] flex flex-col gap-3 sm:bottom-6 sm:right-6"
      aria-label="Quick contact"
    >
      <a
        href={TEL_URL}
        className={`${btnBase} bg-blue-600 text-white hover:bg-blue-500 lg:hidden`}
        aria-label="Call BluePeak Studio"
        title="Call us"
      >
        <Phone size={22} strokeWidth={2.25} aria-hidden />
      </a>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnBase} bg-[#25D366] text-white hover:bg-[#20bd5a]`}
        aria-label="Chat on WhatsApp"
        title="WhatsApp"
      >
        <FaWhatsapp size={26} aria-hidden />
      </a>
    </div>
  );
}
