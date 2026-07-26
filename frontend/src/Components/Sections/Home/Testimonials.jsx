import TestimonialsRow from "../../UI/TestimonialsRow";
import SectionHeader from "../../UI/SectionHeader";
import { testimonials } from "../../../data/testimonials";

export default function Testimonials() {
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
