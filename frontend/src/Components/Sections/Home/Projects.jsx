import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import SectionHeader from "../../UI/SectionHeader"
import { imageKitUrl } from "../../../utils/imageKit"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"
import './Projects.css'

const projects = [
  { id: 1, title: "Chikoo Constructions", image: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20223201.png", link: "https://chikooconstructions.com/" },
  { id: 2, title: "Tvastih Studio", image: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221051.png", link: "https://agarwalyash2703.wixsite.com/tvastih" },
  { id: 3, title: "WanderLust", image: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221731.png", link: "https://wanderlust-1k0r.onrender.com/listings" },
  { id: 4, title: "MR Corrugators", image: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20222727.png", link: "https://zolomedia.wixsite.com/glass-decor" },
]

export default function Projects() {

  const containerRef = useRef(null)
  const galleryRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const totalDistance = useTransform(scrollYProgress, [0, 1], [0, -1200])

  if (reducedMotion) {
    return (
      <div id="example">
        <SectionHeader title={"Projects"} />
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 py-12 sm:grid-cols-2">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="gallery-item relative block aspect-[4/3] overflow-hidden rounded-2xl"
            >
              <img
                src={imageKitUrl(project.image, 800)}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
                alt={project.title}
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
              />
              <div className="item-content">
                <span className="item-number">0{project.id}</span>
                <h2>{project.title}</h2>
              </div>
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div id="example">

      <SectionHeader title={"Projects"} />

      <div ref={containerRef} className="scroll-container">

        <div className="sticky-wrapper">

          <motion.div
            ref={galleryRef}
            style={{ x: totalDistance }}
            className="gallery"
          >

            {projects.map(project => (
              <a
                key={project.id}
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-item"
              >

                <img
                  src={imageKitUrl(project.image, 800)}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  alt={project.title}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                />

                <div className="item-content">
                  <span className="item-number">0{project.id}</span>
                  <h2>{project.title}</h2>
                </div>

              </a>
            ))}
          </motion.div>

        </div>

      </div>

    </div>
  )
}