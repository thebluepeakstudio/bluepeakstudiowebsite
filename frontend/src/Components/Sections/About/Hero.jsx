import { useEffect, useRef, useState } from "react";

import { imageKitUrl } from "../../../utils/imageKit";

import "./AboutUs.css";



const ARCHITECT_PHOTO =

  "https://ik.imagekit.io/bluepeakstudio/Chikoo%20Constructions/1667542912129.jpg";



const steps = [

  {

    num: "01",

    title: "Discovery",

    desc: "We align your business goals with a technical roadmap built for scale.",

    color: "#5DCAA5",

  },

  {

    num: "02",

    title: "Design",

    desc: "Crafting high-fidelity interfaces that define your digital identity.",

    color: "#378ADD",

  },

  {

    num: "03",

    title: "Engineering",

    desc: "Full-stack development — secure APIs, databases, admin panels, and web apps built to scale.",

    color: "#fbbf24",

  },

  {

    num: "04",

    title: "Launch",

    desc: "We ship, monitor, and refine — ensuring your product launches smoothly and keeps performing.",

    color: "#D85A30",

  },

];



export default function Hero() {

  const containerRef = useRef(null);

  const stepRatiosRef = useRef(new Map());

  const [activeStep, setActiveStep] = useState(0);



  useEffect(() => {

    const root = containerRef.current;

    if (!root) return;



    const revealEls = root.querySelectorAll("[data-reveal]");

    const revealObs = new IntersectionObserver(

      (entries) => {

        entries.forEach((e) => {

          if (e.isIntersecting) e.target.classList.add("revealed");

        });

      },

      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }

    );

    revealEls.forEach((el) => revealObs.observe(el));



    const stepEls = root.querySelectorAll(".process-item");

    const pickActiveStep = () => {

      let bestIdx = 0;

      let bestRatio = -1;

      stepRatiosRef.current.forEach((ratio, idx) => {

        if (ratio > bestRatio) {

          bestRatio = ratio;

          bestIdx = idx;

        }

      });

      if (bestRatio >= 0) setActiveStep(bestIdx);

    };



    const stepObs = new IntersectionObserver(

      (entries) => {

        entries.forEach((e) => {

          const idx = Number(e.target.getAttribute("data-index"));

          if (Number.isNaN(idx)) return;

          stepRatiosRef.current.set(idx, e.intersectionRatio);

        });

        pickActiveStep();

      },

      {

        threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],

        rootMargin: "-35% 0px -35% 0px",

      }

    );

    stepEls.forEach((el) => stepObs.observe(el));



    return () => {

      revealObs.disconnect();

      stepObs.disconnect();

      stepRatiosRef.current.clear();

    };

  }, []);



  return (

    <section className="about-page" ref={containerRef}>

      <div className="about-inner">

        <header className="about-hero projects-hero flex flex-col justify-center items-center w-full max-w-none px-0 text-center md:items-start md:text-left">
          <h1 className="text-5xl font-bold leading-tight font-[azonix] md:text-7xl" data-reveal>
            About
          </h1>
          <p
            className="dm-sans mx-auto mt-6 max-w-3xl text-justify text-xl text-gray-400 md:mx-0 md:text-2xl"
            data-reveal
          >
            BluePeak Studio is a boutique product studio building premium websites and custom software.
            We help businesses replace manual workflows with reliable systems — and give growing brands
            a digital presence that converts.
          </p>
        </header>



        <section className="process-section" aria-label="Our process">

          <div className="process-container">

            <aside className="process-sticky">
              <h2 className="sticky-hl">

                The

                <br />

                Process

              </h2>

              <div className="process-progress" aria-hidden="true">

                {steps.map((step, i) => (

                  <span

                    key={step.num}

                    className={`process-progress-dot ${i === activeStep ? "is-active" : ""} ${i < activeStep ? "is-complete" : ""}`}

                    style={{ "--step-color": step.color }}

                  />

                ))}

              </div>

            </aside>



            <div className="process-list">

              {steps.map((step, index) => (

                <article

                  key={step.num}

                  className={`process-item ${activeStep === index ? "is-active" : ""}`}

                  data-index={index}

                  style={{ "--step-color": step.color }}

                >

                  <span className="step-num">{step.num}</span>

                  <div className="step-body">

                    <h3 className="step-title">{step.title}</h3>

                    <p className="step-desc">{step.desc}</p>

                  </div>

                </article>

              ))}

            </div>

          </div>

        </section>



        <div className="architect-box" data-reveal>

          <div className="arch-visual">

            <img

              src="https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Yash%20Photo%20New.jpg"

              alt="Yash Agarwal — Lead Architect at BluePeak Studio"

              width={220}

              height={220}

              loading="lazy"

            />

          </div>

          <div className="arch-content">

            <span className="port-badge">Building BluePeak Studio</span>

            <h2 className="arch-name">Yash Agarwal</h2>

            <p className="arch-bio">

              With a background in Full-Stack Web Development, Yash founded BluePeak to deliver products

              that are fast, reliable, and built for real business use. From marketing websites to custom

              admin systems — every build is engineered for performance and long-term growth.

            </p>

            <div className="arch-tags">

              <span className="arch-tag">Full Stack Developer</span>

              <span className="arch-tag">Custom Software</span>

              <span className="arch-tag">Digital Product Builder</span>

              <span className="arch-tag">Content Creator</span>

            </div>

          </div>

        </div>

      </div>

    </section>

  );

}


