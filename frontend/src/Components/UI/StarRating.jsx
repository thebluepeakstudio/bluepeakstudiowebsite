const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function StarRating({ value, onChange, hover, onHover, onLeave }) {
  return (
    <div>
      <div className="flex gap-2 sm:gap-3" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hover || value) >= star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onClick={() => onChange(star)}
              onMouseEnter={() => onHover(star)}
              onMouseLeave={onLeave}
              className={`text-3xl transition sm:text-4xl ${
                active ? "text-yellow-400" : "text-gray-500 hover:text-yellow-400/60"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-gray-400">{labels[hover || value] || "Select a rating"}</p>
    </div>
  );
}
