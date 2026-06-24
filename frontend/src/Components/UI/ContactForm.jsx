import React, { useState } from "react";
import Button from "./Button";
import FormFieldLabel from "./FormFieldLabel";
import toast from "react-hot-toast";
import { apiUrl } from "../../utils/apiBase";

const ContactForm = ({ variant = "page", onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    contactNo: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.contactNo || !formData.email || !formData.message) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Form has been submitted successfully!");

        setFormData({
          name: "",
          contactNo: "",
          email: "",
          message: "",
        });
        onSuccess?.();
      } else {
        toast.error(data.message || "Something went wrong!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Server error — please try again later");
    } finally {
      setLoading(false);
    }
  };

  const isPopup = variant === "popup";

  return (
    <div
      className={
        isPopup
          ? ""
          : "overflow-hidden rounded-3xl border border-white/10 bg-white/5 py-10 px-4 shadow-xl backdrop-blur-xl lg:ml-16 lg:mr-16 lg:px-10"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="contact-us-form dm-sans flex flex-col justify-center gap-3"
      >
        <div>
          <FormFieldLabel required>Name</FormFieldLabel>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <FormFieldLabel required>Contact Number</FormFieldLabel>
          <input
            type="text"
            name="contactNo"
            value={formData.contactNo}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <FormFieldLabel required>Email</FormFieldLabel>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <FormFieldLabel required>Message</FormFieldLabel>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
          />
        </div>

        <div className={isPopup ? "flex justify-center pt-1" : "mx-auto flex w-[50%] items-center justify-center"}>
          <Button type="submit" disabled={loading} title={loading ? "Sending..." : "Submit!"} />
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
