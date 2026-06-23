import React from "react"
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();
  return (
    <footer className="relative overflow-hidden py-28">

      {/* BIG BACKGROUND TEXT — decorative only, not a heading */}
      <div
        aria-hidden="true"
        className="absolute top:0 lg:bottom-0 left-1/2 -translate-x-1/2 
      text-[5rem] md:text-[6rem] lg:text-[20vw] font-bold text-white/5 select-none pointer-events-none"
      >
        bluepeak
      </div>

      <div className="max-w-[1300px] mx-auto px-6 relative z-10 dm-sans">

        {/* TOP SECTION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-12">

          {/* CONTACT */}
          <div className="space-y-4">
            <p className="text-sm text-white/40 tracking-widest">
              [ CALL US ]
            </p>

            <p className="text-sm lg:text-lg text-white">
              +91 93781 73053
            </p>

            <p className="text-sm text-white/40 tracking-widest mt-6">
              [ MAIL US ]
            </p>

            <p className="text-sm lg:text-lg font-semibold break-all">
              thebluepeakstudio@gmail.com
            </p>
          </div>


          {/* NAVIGATION */}
          <div>
            <p className="text-sm text-white/40 tracking-widest mb-4">
              [ NAVIGATION ]
            </p>

            <ul className="space-y-3 text-white/80">
              <li>
                <NavLink to="/" end className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  Home
                </NavLink>
              </li>

              <li>
                <NavLink to="/projects" className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  Projects
                </NavLink>
              </li>

              <li>
                <NavLink to="/services" className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  Services
                </NavLink>
              </li>

              <li>
                <NavLink to="/about-us" className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  About
                </NavLink>
              </li>

              <li>
                <NavLink to="/blogs" className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  Blog
                </NavLink>
              </li>

              <li>
                <NavLink to="/contact" className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-semibold" : "hover:text-white"
                }>
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>


          {/* SERVICES */}
          <div>
            <p className="text-sm text-white/40 tracking-widest mb-4">
              [ SERVICES ]
            </p>

            <ul className="space-y-3 text-white/80">
              <li>Custom Software & Apps</li>
              <li>Website Development</li>
              <li>UI/UX Design</li>
              <li>Business Dashboards</li>
              <li>E-Commerce Solutions</li>
            </ul>
          </div>


          {/* SOCIAL */}
          <div>
            <p className="text-sm text-white/40 tracking-widest mb-4">
              [ FOLLOW US ]
            </p>

            <ul className="space-y-3 text-white/80">

              {/* <li>
                <a
                  href="https://twitter.com/yourprofile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-white ${location.pathname === "/twitter" ? "text-yellow-400" : ""
                    }`}
                >
                  Twitter
                </a>
              </li> */}

              <li>
                <a
                  href="https://instagram.com/bluepeakstudio.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-white ${location.pathname === "/instagram" ? "text-yellow-400" : ""
                    }`}
                >
                  Instagram
                </a>
              </li>

              <li>
                <a
                  href="https://www.linkedin.com/company/bluepeakstudio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-white ${location.pathname === "/linkedin" ? "text-yellow-400" : ""
                    }`}
                >
                  LinkedIn
                </a>
              </li>

              {/* <li>
                <a
                  href="https://linkedin.com/in/yourprofile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-white ${location.pathname === "/linkedin" ? "text-yellow-400" : ""
                    }`}
                >
                  LinkedIn
                </a>
              </li> */}

              {/* <li>
                <a
                  href="https://github.com/yourprofile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-white ${location.pathname === "/github" ? "text-yellow-400" : ""
                    }`}
                >
                  GitHub
                </a>
              </li> */}

            </ul>
          </div>

        </div>


        {/* BOTTOM BAR */}
        {/* BOTTOM BAR */}
        <div className="mt-24 flex flex-col md:flex-row justify-between text-sm text-white/40 gap-4 items-center">

          <p>
            ©2026 BluePeak Studio. All Rights Reserved
          </p>

          <div className="flex gap-6">
            <NavLink
              to="/privacy-policy"
              className={({ isActive }) =>
                isActive ? "text-yellow-400" : "hover:text-white transition-colors"
              }
            >
              Privacy Policy
            </NavLink>

            {/* <NavLink
              to="/terms-and-conditions"
              className={({ isActive }) =>
                isActive ? "text-yellow-400" : "hover:text-white transition-colors"
              }
            >
              Terms & Conditions
            </NavLink> */}
          </div>

        </div>

      </div>

    </footer>
  )
}

export default Footer