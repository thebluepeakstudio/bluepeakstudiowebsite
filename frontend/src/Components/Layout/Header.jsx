import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../UI/Button";

const navItems = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about-us" },
  { name: "Projects", path: "/projects" },
  { name: "Services", path: "/services" },
  { name: "Blog", path: "/blogs" },
  { name: "Contact", path: "/contact" },
];

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full flex justify-center">
      <div
        className="
        w-[75px] md:w-[83%] lg:w-[60%] max-w-[1200px]
        flex items-center justify-between
        md:max-[936px]:w-auto md:max-[936px]:max-w-[95%] md:max-[936px]:justify-center md:max-[936px]:gap-3
        py-4 px-6 my-4
        md:max-[936px]:px-4 md:max-[936px]:py-3
        rounded-full flex
        bg-[#1e293b]/60
        backdrop-blur-md
        border border-white/10
        shadow-[0_0_25px_rgba(59,130,246,0.15)]
        fixed z-50 isolate right-10 md:right-auto mx-auto
        "
      >
        <nav className="hidden md:flex gap-2 md:max-[936px]:gap-1 relative dm-sans min-w-0">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative shrink-0 whitespace-nowrap px-4 py-2 md:max-[936px]:px-2.5 md:max-[936px]:py-1.5 md:max-[936px]:text-sm rounded-full transition ${
                  isActive ? "text-black" : "text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 20,
                      }}
                      className="absolute inset-0 bg-yellow-400 rounded-full -z-10"
                    />
                  )}
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 md:block">
          <NavLink to="/contact">
            <Button
              title="Book a Free Call"
              onClick={() =>
                window.open(
                  "https://calendly.com/thebluepeakstudio/30min",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="hero-primary-btn md:max-[936px]:!px-5 md:max-[936px]:!py-2 md:max-[936px]:!text-sm md:max-[936px]:!border-[3px]"
            />
          </NavLink>
        </div>

        <div
          className="md:hidden flex flex-col gap-1.5 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <motion.span
            animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-6 h-[2px] bg-white block"
          />
          <motion.span
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-6 h-[2px] bg-white block"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-6 h-[2px] bg-white block"
          />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="
            fixed top-[90px]
            w-[90%] max-w-[1200px]
           -translate-x-1/2
            bg-[#1e293b]/80
            backdrop-blur-md
            border border-white/10
            rounded-2xl
            p-6
            flex flex-col gap-4
            z-40 isolate
            "
          >
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg transition ${
                    isActive ? "bg-yellow-400 text-black" : "text-white hover:bg-white/10"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}

            <NavLink to="/contact" onClick={() => setOpen(false)}>
              <Button title={"Let's Talk"} />
            </NavLink>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
