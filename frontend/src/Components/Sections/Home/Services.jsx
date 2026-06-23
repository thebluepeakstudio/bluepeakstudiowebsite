import React from "react";
import Card from "../../UI/Card";
import SectionHeader from "../../UI/SectionHeader";

const offerings = [
  {
    title: "Website Development",
    description:
      "Fast, responsive marketing sites and landing pages — built with modern tech, tuned for SEO, and designed to turn visitors into leads.",
    featured: true,
  },
  {
    title: "Custom Software & Apps",
    description:
      "Admin panels, CRMs, booking systems, and internal tools shaped around your workflow — so your team spends less time on manual work.",
  },
  {
    title: "Business Dashboards & CRM",
    description:
      "Track clients, projects, leads, and revenue in one place — replace spreadsheets with a panel your team actually uses every day.",
  },
  {
    title: "E-Commerce & Client Portals",
    description:
      "Sell online and give clients a secure space to view progress, place orders, share files, and stay updated on their projects.",
  },
  {
    title: "UI/UX Design & Integrations",
    description:
      "Intuitive interfaces plus custom APIs and automations — connect your tools so repetitive tasks run without manual effort.",
  },
];

const Services = () => {
  return (
    <>
      <SectionHeader title={"Services"} />

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="mb-12 flex flex-col items-center justify-center gap-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <h1 className="font-[azonix] text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Websites & Software That Perform
          </h1>

          <p className="dm-sans max-w-md text-xl text-gray-400 md:text-2xl">
            From high-converting websites to custom apps and admin systems — built around how your business actually works.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((item) => (
            <div
              key={item.title}
              className={item.featured ? "relative min-h-[260px] overflow-hidden rounded-3xl sm:col-span-2 lg:col-span-2" : ""}
            >
              <Card title={item.title} description={item.description} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Services;
