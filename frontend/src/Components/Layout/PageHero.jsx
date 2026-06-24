/**
 * Shared page hero — matches Projects / Services layout.
 */
export default function PageHero({ title, description, className = "" }) {
  return (
    <div
      className={`page-hero mx-auto flex w-[90%] max-w-[1200px] flex-col items-center justify-center ${className}`}
    >
      <h1 className="text-center font-[azonix] text-5xl font-bold leading-tight md:text-7xl">
        {title}
      </h1>
      {description ? (
        <p className="dm-sans mx-auto mt-6 max-w-4xl text-center text-xl text-gray-400 md:text-justify md:text-2xl">
          {description}
        </p>
      ) : null}
    </div>
  );
}
