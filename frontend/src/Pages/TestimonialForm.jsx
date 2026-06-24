import TestimonialAside from "../Components/Sections/Testimonial/TestimonialAside";
import TestimonialSubmitForm from "../Components/Sections/Testimonial/TestimonialSubmitForm";
import PageContent from "../Components/Layout/PageContent";

export default function TestimonialForm() {
  return (
    <PageContent className="page-top grid grid-cols-1 items-start gap-10 pb-16 lg:grid-cols-2 lg:gap-16">
      <TestimonialAside />
      <TestimonialSubmitForm />
    </PageContent>
  );
}
