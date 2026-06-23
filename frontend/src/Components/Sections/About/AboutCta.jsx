import { Link } from "react-router-dom";
import Button from "../../UI/Button";

export default function AboutCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur-xl sm:p-12">
        <span className="hero-badge mb-4 inline-flex">Work With Us</span>
        <h2 className="font-[azonix] text-3xl font-bold leading-tight sm:text-4xl">
          Ready to build something that lasts?
        </h2>
        <p className="dm-sans mx-auto mt-4 max-w-xl text-lg text-gray-400">
          Whether you need a new website, a custom app, or a full business system — let&apos;s talk about your goals.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/contact">
            <Button title="Get in Touch" />
          </Link>
          <Button
            title="Book a Free Call"
            onClick={() =>
              window.open("https://calendly.com/thebluepeakstudio/30min", "_blank", "noopener,noreferrer")
            }
            className="hero-primary-btn"
          />
        </div>
      </div>
    </section>
  );
}
