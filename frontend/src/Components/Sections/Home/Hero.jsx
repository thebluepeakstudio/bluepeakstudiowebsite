import React, { useEffect, useRef, useState } from 'react';
import Button from '../../UI/Button';
import { imageKitUrl } from '../../../utils/imageKit';
import './Hero.css';

const Hero = () => {
  const heroRef = useRef(null);
  const [counts, setCounts] = useState({ projects: 0, satisfaction: 0, lift: 0 });

  const words = ["Build", "Automate", "Elevate"];
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  // Typewriter Logic remains the same...
  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 1500);
      return;
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 75 : 150);
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse]);

  // Refined Reveal Logic
  useEffect(() => {
    // Small timeout ensures the browser has painted the initial CSS state
    const timer = setTimeout(() => {
      if (heroRef.current) {
        heroRef.current.classList.add('active');
      }
    }, 100);

    // Stats Counter
    const countDuration = 2000;
    const totalFrames = Math.round(countDuration / (1000 / 60));
    let frame = 0;
    const countInterval = setInterval(() => {
      frame++;
      const progress = (t => t * (2 - t))(frame / totalFrames);
      setCounts({
        projects: Math.floor(progress * 5),
        satisfaction: Math.floor(progress * 100),
        lift: Math.floor(progress * 3)
      });
      if (frame === totalFrames) clearInterval(countInterval);
    }, 1000 / 60);

    return () => {
      clearTimeout(timer);
      clearInterval(countInterval);
    };
  }, []);

  return (
    <section className="hero-container">
      <div className="hero-content-wrapper" ref={heroRef}>
        <div className="hero-left">
          <div className="badge-reveal-wrapper">
            <span className="hero-badge">Web & Software Studio</span>
          </div>

          <h1 className="hero-headline">
            We <span className="typewriter-box">
              <span className="accent">
                {words[index].substring(0, subIndex)}
              </span>
              <span className="cursor">|</span>
            </span>
            <br />
            digital impact.
          </h1>

          <p className="hero-sub">
            We build websites that grow your brand and custom software that runs your business —
            from admin panels and CRMs to web apps your team uses every day.
          </p>

          <div className="hero-cta-wrapper">
            <Button
              title="Book a Free Call"
              onClick={() => window.open('https://calendly.com/thebluepeakstudio/30min', '_blank', 'noopener,noreferrer')}
              className="hero-primary-btn"
            />
          </div>

          <div className="hero-stats-row">
            <div className="stat-item">
              <h3>{counts.projects}+</h3>
              <p>Projects</p>
            </div>
            <div className="stat-item">
              <h3>{counts.satisfaction}%</h3>
              <p>Satisfaction</p>
            </div>
            <div className="stat-item">
              <h3>{counts.lift}x</h3>
              <p>Avg. Lift</p>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-logo-glow">
            <img 
              src={imageKitUrl("https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/BPS.png?updatedAt=1773667763921", 400)} 
              alt="BluePeak Studio Logo"
              width={400}
              height={400}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;