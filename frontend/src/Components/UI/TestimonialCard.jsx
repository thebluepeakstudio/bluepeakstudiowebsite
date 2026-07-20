import React from "react";

const TestimonialCard = ({ t }) => {
  const stars = "★".repeat(Math.min(5, Math.max(1, t.rating || 5)));
  const imgSrc = t.img
    ? t.img.includes("?")
      ? t.img
      : `${t.img}?tr=w-80,h-80`
    : null;

  return (
    <div
      className="flex min-h-[220px] min-w-[320px] max-w-[320px] cursor-grab flex-col rounded-2xl border border-white/5 bg-[#0d1224] p-6 transition-all duration-300 hover:border-purple-500/50"
      style={{
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="mb-3 text-sm text-yellow-500" aria-hidden>
        {stars}
      </div>

      <div className="flex-grow">
        <p className="dm-sans text-sm leading-relaxed text-gray-400">&ldquo;{t.text}&rdquo;</p>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-white/5 pt-4">
        {imgSrc ? (
          <img
            src={imgSrc}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            alt={t.name}
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {(t.name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="truncate text-sm font-semibold text-white">{t.name}</p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
