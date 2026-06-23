import Hero from "../Components/Sections/About/Hero";
import AboutCta from "../Components/Sections/About/AboutCta";
import Reveal from "../Components/UI/Reveal";

const About = () => {
  return (
    <div>
      <Hero />

      <Reveal>
        <AboutCta />
      </Reveal>
    </div>
  );
};

export default About;
