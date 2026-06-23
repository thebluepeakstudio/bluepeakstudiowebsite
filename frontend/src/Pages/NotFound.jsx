import { Link } from "react-router-dom";
import Button from "../Components/UI/Button";
import PageMeta from "../Components/SEO/PageMeta";

export default function NotFound() {
  return (
    <>
      <PageMeta
        title="Page Not Found"
        description="The page you are looking for does not exist on BluePeak Studio."
        noindex
      />
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="hero-badge mb-4 inline-flex">404</p>
      <h1 className="font-[azonix] text-4xl font-bold sm:text-5xl">Page Not Found</h1>
      <p className="dm-sans mt-4 max-w-md text-lg text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" className="mt-8">
        <Button title="Back to Home" />
      </Link>
    </section>
    </>
  );
}
