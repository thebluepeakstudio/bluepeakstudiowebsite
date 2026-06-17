import React, { useState, useCallback } from "react";
import Button from "../Components/UI/Button";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiBase";

const TestimonialForm = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    testimonial: "",
    rating: 5,
  });

  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.testimonial || !formData.rating) {
      toast.error("Please fill all fields ❗");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(apiUrl("/api/testimonial"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.companyName,
          rating: formData.rating,
          message: formData.testimonial,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Testimonial Submitted Successfully! 🎉");

        setFormData({
          companyName: "",
          testimonial: "",
          rating: 0,
        });
      } else {
        toast.error(data.message || "Something went wrong!");
      }
    } catch (error) {
      toast.error("Server error ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-24 sm:mt-28 md:mt-32 px-4 sm:px-6 lg:px-10 lg:mx-16">

      {/* Heading */}
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
          Share Your Experience
        </h1>
        <p className="text-gray-400 mt-3 text-sm sm:text-base max-w-xl mx-auto">
          Your feedback helps us build better digital experiences.
        </p>
        <div className="w-24 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full opacity-70"></div>
      </div>

      {/* Form */}
      <div className="w-[80%] sm:w-[65%] lg:w-[50%] mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-10 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">

        <form onSubmit={handleSubmit} className="contact-us-form flex flex-col gap-5 dm-sans">

          {/* Name */}
          <div>
            <h2 className="text-sm sm:text-base mb-1">Company Name</h2>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>

          {/* ⭐ Rating */}
          <div>
            <h2 className="text-sm sm:text-base mb-2">Rating</h2>

            <div className="flex gap-3 text-3xl sm:text-4xl cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() =>
                    setFormData({ ...formData, rating: star })
                  }
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className={`transition ${
                    (hover || formData.rating) >= star
                      ? "text-yellow-400"
                      : "text-gray-500"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <h2 className="text-sm sm:text-base mb-1">Testimonial</h2>
            <textarea
              name="testimonial"
              value={formData.testimonial}
              onChange={handleChange}
              required
              rows={4}
              className="w-full resize-none"
            ></textarea>
          </div>

          {/* Button */}
          <div className="w-full sm:w-[60%] md:w-[50%] mx-auto flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              title={loading ? "Submitting..." : "Submit!"}
            />
          </div>

        </form>
      </div>

    </section>
  );
};

export default TestimonialForm;