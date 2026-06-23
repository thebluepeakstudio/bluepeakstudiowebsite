import { useEffect, useRef } from 'react'
import "./Contact.css"
import Button from '../../UI/Button'
import SectionHeader from '../../UI/SectionHeader'

export default function Contact() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) el.classList.add('banner-in') }),
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <SectionHeader title={"Contact Us"} />

      <div className="banner-container">
        <div className="banner-wrap" ref={ref}>
          {/* Synchronized Background elements */}
          <div className="banner-bg-overlay" />
          <div className="banner-orb-1" />
          <div className="banner-orb-2" />
          
          <div className="banner-grid">
            <div className="banner-content">
              <span className="banner-badge">Start Your Project</span>
              <h2 className="banner-headline">
                Need a website,<br />
                <span>or custom software?</span>
              </h2>
              <p className="banner-sub">
                Tell us what you&apos;re trying to solve — a new site, admin panel, CRM, booking app, or internal tool.
                We&apos;ll get back within 24 hours with a clear plan and no-obligation quote.
              </p>

              <div className="banner-trust-bar">
                {[
                  'Free consultation call',
                  '15 Days Free of Cost support',
                  'No hidden charges'
                ].map((item) => (
                  <div className="trust-item" key={item}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 7.5l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

              <Button
                title="Book a Free Call"
                onClick={() => window.open('https://calendly.com/thebluepeakstudio/30min', '_blank', 'noopener,noreferrer')}
                className="hero-primary-btn"
              />
          </div>
        </div>
      </div>
    </>
  )
}