import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../UI/Button";
import FormFieldLabel from "../../UI/FormFieldLabel";
import StarRating from "../../UI/StarRating";
import toast from "react-hot-toast";
import { apiUrl } from "../../../utils/apiBase";

export default function TestimonialSubmitForm() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const brandId = searchParams.get("brandId") || "";

  const [formData, setFormData] = useState({
    companyName: "",
    testimonial: "",
    rating: 5,
  });
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName.trim() || !formData.testimonial.trim() || !formData.rating) {
      toast.error("Please fill all fields");
      return;
    }

    if (formData.testimonial.trim().length < 20) {
      toast.error("Please write at least a few sentences");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(apiUrl("/api/testimonial"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.companyName.trim(),
          rating: formData.rating,
          message: formData.testimonial.trim(),
          ...(clientId ? { clientId } : {}),
          ...(brandId ? { brandId } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Thank you — your testimonial was submitted!");
        setSubmitted(true);
        setFormData({ companyName: "", testimonial: "", rating: 5 });
      } else {
        toast.error(data.message || "Something went wrong!");
      }
    } catch {
      toast.error("Server error — please try again later");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center shadow-xl backdrop-blur-xl">
        <div className="mb-4 text-5xl text-yellow-400">★</div>
        <h2 className="font-[azonix] text-2xl font-bold sm:text-3xl">Thank you!</h2>
        <p className="dm-sans mt-3 max-w-sm text-gray-400">
          We appreciate you taking the time. Your feedback means a lot to the BluePeak team.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 text-sm text-blue-300 underline-offset-2 hover:underline"
        >
          Submit another testimonial
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 py-8 px-4 shadow-xl backdrop-blur-xl sm:py-10 sm:px-6 lg:px-10">
      <h2 className="mb-6 text-center font-[azonix] text-xl sm:text-2xl lg:text-left">
        Submit Your Review
      </h2>

      <form onSubmit={handleSubmit} className="contact-us-form dm-sans flex flex-col gap-5">
        <div>
          <FormFieldLabel required>Your name or company</FormFieldLabel>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g. Acme Corp or John Sharma"
            required
          />
        </div>

        <div>
          <FormFieldLabel required>Your rating</FormFieldLabel>
          <StarRating
            value={formData.rating}
            hover={hover}
            onChange={(rating) => setFormData((prev) => ({ ...prev, rating }))}
            onHover={setHover}
            onLeave={() => setHover(0)}
          />
        </div>

        <div>
          <FormFieldLabel required>Your testimonial</FormFieldLabel>
          <textarea
            name="testimonial"
            value={formData.testimonial}
            onChange={handleChange}
            placeholder="Tell us about your project, the results, and what it was like working with BluePeak..."
            required
            rows={5}
            className="resize-y"
          />
        </div>

        <div className="mx-auto flex w-full max-w-xs justify-center lg:mx-0 lg:justify-start">
          <Button type="submit" disabled={loading} title={loading ? "Submitting..." : "Submit Testimonial"} />
        </div>
      </form>
    </div>
  );
}
