import React, { lazy, Suspense, useEffect, useState } from "react";
import Header from "./Header";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ScrollTop from "../UI/ScrollTop";
import Footer from "./Footer";
import ContactFormPopup from "./ContactFormPopup";
import FloatingContactButtons from "./FloatingContactButtons";
import GlobalSeo from "../SEO/GlobalSeo";
import SeoRouteHandler from "../SEO/SeoRouteHandler";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const NeonCursor = lazy(() => import("../UI/NeonCursor"));

const Home = lazy(() => import("../../Pages/Home"));
const Projects = lazy(() => import("../../Pages/Projects"));
const Services = lazy(() => import("../../Pages/Services"));
const About = lazy(() => import("../../Pages/About"));
const Contact = lazy(() => import("../../Pages/Contact"));
const PrivacyPolicy = lazy(() => import("../../Pages/PrivacyPolicy"));
const TestimonialForm = lazy(() => import("../../Pages/TestimonialForm"));
const Blogs = lazy(() => import("../../Pages/Blogs"));
const BlogPost = lazy(() => import("../../Pages/BlogPost"));
const NotFound = lazy(() => import("../../Pages/NotFound"));

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

export default function PublicLayout() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="public-site min-h-screen overflow-x-clip bg-gradient-to-br from-[#050816] via-[#0f172a] to-[#1e3a8a] text-white">
      <GlobalSeo />
      <SeoRouteHandler />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />
      <ScrollTop />
      {isDesktop && !reducedMotion && (
        <Suspense fallback={null}>
          <NeonCursor />
        </Suspense>
      )}
      <Header />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />
            <Route path="/testimonial" element={<TestimonialForm />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <FloatingContactButtons />
      <ContactFormPopup />
    </div>
  );
}
