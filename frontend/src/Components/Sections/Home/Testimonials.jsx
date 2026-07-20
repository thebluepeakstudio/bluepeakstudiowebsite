import { useEffect, useState } from "react";
import TestimonialsRow from "../../UI/TestimonialsRow";
import SectionHeader from "../../UI/SectionHeader";
import { getPublishedTestimonials } from "../../../api/website.api";

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublishedTestimonials()
      .then((res) => {
        if (!cancelled) setTestimonials(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setTestimonials([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <SectionHeader title={"Testimonials"} />
        <section className="testimonial-container-fixed py-32">
          <div className="mx-auto flex max-w-4xl justify-center gap-4 px-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="hidden h-[220px] min-w-[320px] animate-pulse rounded-2xl bg-white/5 sm:block"
              />
            ))}
            <div className="h-[220px] w-full max-w-[320px] animate-pulse rounded-2xl bg-white/5 sm:hidden" />
          </div>
        </section>
      </>
    );
  }

  if (!testimonials.length) return null;

  return (
    <>
      <SectionHeader title={"Testimonials"} />
      <section className="testimonial-container-fixed py-32">
        <div className="relative space-y-8">
          <TestimonialsRow testimonials={testimonials} direction="left" />
          <TestimonialsRow testimonials={testimonials} direction="right" />
        </div>
      </section>
    </>
  );
}
