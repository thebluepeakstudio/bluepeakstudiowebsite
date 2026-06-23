import { useRef, useState } from "react"
import { useScroll, useMotionValueEvent } from "framer-motion"
import { FaReact, FaNodeJs, FaHtml5, FaJs, FaCss3Alt } from "react-icons/fa"
import { SiMongodb, SiExpress, SiPostman } from "react-icons/si"
import { RiTailwindCssFill } from "react-icons/ri"
import { FaGithub } from "react-icons/fa"
import { TbApi } from "react-icons/tb"
import SectionHeader from "./SectionHeader"
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion"

const skillsSets = [
  {
    text: "Frontend Development",
    skills: [
      { name: "HTML", icon: <FaHtml5 /> },
      { name: "CSS", icon: <FaCss3Alt /> },
      { name: "JavaScript", icon: <FaJs /> },
      { name: "React", icon: <FaReact /> },
      { name: "Tailwind CSS", icon: <RiTailwindCssFill /> },
    ],
  },
  {
    text: "Backend & Products",
    skills: [
      { name: "Node.js", icon: <FaNodeJs /> },
      { name: "Express", icon: <SiExpress /> },
      { name: "MongoDB", icon: <SiMongodb /> },
      { name: "REST API", icon: <TbApi /> },
    ],
  },
  {
    text: "Tools",
    skills: [
      { name: "Git / GitHUb", icon: <FaGithub /> },
      { name: "Postman", icon: <SiPostman /> },
    ],
  },
]

function SkillsSliderStatic() {
  return (
    <>
      <SectionHeader title={"Tech Stack  ·"} />
      <section className="mx-auto max-w-[1200px] space-y-16 px-6 py-16">
        {skillsSets.map((set) => (
          <div key={set.text}>
            <h2 className="mb-8 text-center text-2xl font-bold text-white lg:text-4xl">{set.text}</h2>
            <div className="grid grid-cols-3 gap-6 text-center sm:gap-10 lg:grid-cols-5">
              {set.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex flex-col items-center gap-2 text-white/80"
                >
                  <div className="text-4xl">{skill.icon}</div>
                  <p className="text-sm">{skill.name}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

function SkillsSliderScroll() {
  const containerRef = useRef(null)
  const [index, setIndex] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const totalSets = skillsSets.length

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(totalSets - 1, Math.floor(v * totalSets))
    setIndex(i)
  })

  return (
    <>
      <SectionHeader title={"Tech Stack  ·"} />
      <section
        ref={containerRef}
        className="relative mx-auto h-[300vh] max-w-[1200px] px-6"
      >
        <div className="sticky top-0 flex h-screen items-center">
          <div className="grid w-full grid-cols-[20%_70%_10%] items-center">
            <div className="flex items-center justify-center gap-1 lg:gap-4">
              <h2 className="rotate-180 text-2xl font-bold text-white [writing-mode:vertical-rl] lg:text-4xl">
                {skillsSets[index].text}
              </h2>
              <div className="h-28 w-[3px] bg-yellow-400" />
            </div>

            <div key={index} className="grid grid-cols-3 gap-10 text-center lg:grid-cols-5">
              {skillsSets[index].skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex flex-col items-center gap-2 text-white/80 transition hover:scale-110"
                >
                  <div className="text-4xl">{skill.icon}</div>
                  <p className="text-sm">{skill.name}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-6">
              {skillsSets.map((_, i) => (
                <div
                  key={i}
                  className={`h-10 w-[2px] transition ${i === index ? "bg-white" : "bg-white/20"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default function SkillsSlider() {
  const reducedMotion = usePrefersReducedMotion()
  return reducedMotion ? <SkillsSliderStatic /> : <SkillsSliderScroll />
}
