import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, LayoutGroup } from "framer-motion";
import "../../../index.css";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const services = [
  {
    id: "01",
    title: "Custom Software",
    tagline: "Built Around Your Workflow",
    desc: "Admin panels, CRMs, booking systems, and internal tools — custom-built so your team spends less time on manual work and more time growing the business.",
    features: ["Admin Panels", "CRM & Leads", "API Integrations"],
    accent: "#5DCAA5",
  },
  {
    id: "02",
    title: "Website Development",
    tagline: "High-Performance Engineering",
    desc: "We build fast, scalable, and high-performance websites using modern technologies like React and Next.js.",
    features: ["React / Next.js", "Scalable Architecture", "Clean Code"],
    accent: "#378ADD",
  },
  {
    id: "03",
    title: "UI/UX Design",
    tagline: "Human-Centric Design",
    desc: "Crafting intuitive and visually engaging interfaces that improve user experience and drive conversions.",
    features: ["Visual Strategy", "User Experience", "Interactive Prototypes"],
    accent: "#fbbf24",
  },
  {
    id: "04",
    title: "E-Commerce",
    tagline: "Scalable Digital Commerce",
    desc: "Design and development of modern online stores that scale with your business and maximize revenue.",
    features: ["Storefront Design", "Revenue Growth", "Modern Tech"],
    accent: "#EF9F27",
  },
  {
    id: "05",
    title: "Landing Pages",
    tagline: "Conversion Engines",
    desc: "High-converting landing pages built for marketing campaigns and lead generation.",
    features: ["Lead Gen Focus", "Fast Loading", "Marketing Optimized"],
    accent: "#378ADD",
  },
  {
    id: "06",
    title: "Optimization",
    tagline: "Technical Excellence",
    desc: "Performance, SEO, and technical improvements to boost speed and rankings.",
    features: ["SEO Mastery", "Speed Optimization", "Technical Audit"],
    accent: "#D85A30",
  },
];

function ServiceCard({ service }) {
  return (
    <div className="relative flex flex-col justify-center overflow-hidden rounded-[40px] border border-white/5 bg-[#0d1224] p-8 md:p-12">
      <div
        className="absolute right-0 top-0 h-32 w-32 opacity-20 blur-[60px]"
        style={{ background: service.accent }}
      />
      <div className="relative z-10">
        <span className="hero-badge mb-6">{service.tagline}</span>
        <h4 className="mb-4 font-[azonix] text-3xl leading-tight text-white md:text-4xl">
          {service.title}
        </h4>
        <p className="dm-sans mb-8 max-w-lg text-lg leading-relaxed text-white/50 md:text-xl">
          {service.desc}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {service.features.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-white/80">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesSectionStatic() {
  return (
    <section className="relative py-16 md:py-20">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}

function ServicesSectionScroll() {
  const containerRef = useRef(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const index = Math.min(services.length - 1, Math.floor(v * services.length));
    if (index !== active) setActive(index);
  });

  return (
    <section ref={containerRef} className="relative h-[600vh]">
      <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-10 transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${services[active].accent} 0%, transparent 70%)`,
          }}
        />

        <div className="z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 px-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="relative space-y-10 border-l border-white/5 pl-6">
              <LayoutGroup>
                {services.map((s, i) => (
                  <div key={i} className="relative">
                    {i === active && (
                      <motion.div
                        layoutId="navIndicator"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute -left-[26px] bottom-0 top-0 w-[3px] bg-yellow-400 shadow-[0_0_15px_#fbbf24]"
                      />
                    )}
                    <div
                      className={`transition-all duration-500 ${i === active ? "translate-x-4 opacity-100" : "opacity-20"}`}
                    >
                      <span
                        className="mb-1 block font-mono text-[10px] font-bold"
                        style={{ color: s.accent }}
                      >
                        {s.id}
                      </span>
                      <h3 className="font-[azonix] text-2xl uppercase tracking-tighter text-white md:text-3xl">
                        {s.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </LayoutGroup>
            </div>
          </div>

          <div className="relative h-[500px] md:col-span-7">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  opacity: index === active ? 1 : 0,
                  x: index === active ? 0 : 30,
                  scale: index === active ? 1 : 0.95,
                  pointerEvents: index === active ? "auto" : "none",
                }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-[40px] border border-white/5 bg-[#0d1224] p-10 md:p-16"
                style={{ willChange: "opacity, transform" }}
              >
                <div
                  className="absolute right-0 top-0 h-32 w-32 opacity-20 blur-[60px]"
                  style={{ background: service.accent }}
                />

                <div className="relative z-10">
                  <span className="hero-badge mb-6">{service.tagline}</span>
                  <h4 className="mb-6 font-[azonix] text-4xl leading-tight text-white">
                    {service.title}
                  </h4>
                  <p className="dm-sans mb-10 max-w-lg text-xl leading-relaxed text-white/50">
                    {service.desc}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {service.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                        <span className="text-xs font-bold uppercase tracking-wide text-white/80">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <span className="pointer-events-none absolute -bottom-10 -right-10 font-[azonix] text-[180px] text-white/[0.02]">
                  {service.id}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ServicesSection() {
  const reducedMotion = usePrefersReducedMotion();
  return reducedMotion ? <ServicesSectionStatic /> : <ServicesSectionScroll />;
}
