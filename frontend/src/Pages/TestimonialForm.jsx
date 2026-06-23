import TestimonialAside from "../Components/Sections/Testimonial/TestimonialAside";
import TestimonialSubmitForm from "../Components/Sections/Testimonial/TestimonialSubmitForm";

export default function TestimonialForm() {
  return (
    <div className="mx-auto mt-[5rem] grid w-[90%] max-w-[1200px] grid-cols-1 items-start gap-10 md:mt-[8rem] lg:grid-cols-2 lg:gap-16">
      <TestimonialAside />
      <TestimonialSubmitForm />
    </div>
  );
}
