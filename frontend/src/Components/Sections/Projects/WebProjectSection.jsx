import { useState, useEffect, useRef } from 'react'
import "./Project.css"

const projects = [
  {
    title: 'Chikoo Constructions',
    category: 'Real Estate',
    desc: 'A high-performance corporate portal for a premier construction firm, featuring interactive project galleries and optimized lead generation flows.',
    tags: ['React', 'Node.js', 'MongoDB'],
    color: '#378ADD',
    img: 'https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20223201.png',
    link: 'https://www.chikooconstructions.com/',
    size: 'large'
  },
  {
    title: 'WanderLust',
    category: 'Web App',
    desc: 'Premium Property Listing and Booking Website.',
    tags: ['JavaScript', 'Express.js', 'REST APIs', 'Node.js', 'MySQL'],
    color: '#D85A30',
    img: 'https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221731.png?updatedAt=1774033525183',
    link: 'https://wanderlust-1k0r.onrender.com/listings',
    size: 'large'
  },
  {
    title: 'Tvastih Studio',
    category: 'Custom Software',
    desc: 'Enterprise-grade project management dashboard featuring high-performance Kanban systems.',
    tags: ['Wix'],
    color: '#5DCAA5',
    img: 'https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221051.png?updatedAt=1774033525219',
    link: '#',
    size: 'small'
  },
  {
    title: 'MR Corrugators',
    category: 'Manufacturing',
    desc: 'Packaging manufacturers of high-quality packaging solutions.',
    tags: ['JavaScript', 'React.js', 'Express.js', 'REST APIs', 'Node.js', 'MySQL'],
    color: '#EF9F27',
    img: 'https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20222727.png',
    link: 'https://mr-corrugators.vercel.app/',
    size: 'small'
  },
]

const filters = ['All', 'Custom Software', 'Web App', 'E-Commerce', 'Real Estate', 'Landing Page', 'Manufacturing']

export default function WebProjectSection() {
  const [active, setActive] = useState('All')
  const [visible, setVisible] = useState(projects)
  const containerRef = useRef(null)

  useEffect(() => {
    const filtered = active === 'All' ? projects : projects.filter((p) => p.category === active)
    setVisible(filtered)
  }, [active])

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('[data-pcard]')
    if (!cards) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1'
            e.target.style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    cards.forEach((c) => obs.observe(c))
    return () => obs.disconnect()
  }, [visible])

  return (
    <section className="port-container" id="portfolio">
      <div className="port-header">
        <div className="port-filters">
          {filters.map((f) => (
            <button
              key={f}
              className={`port-filter-btn ${active === f ? 'active' : ''}`}
              onClick={() => setActive(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="port-grid" ref={containerRef}>
        {visible.map((p) => (
          <div key={p.title} className="port-card" data-pcard>
            <div className="port-card-inner">
              <div className="port-image-container">
                <img src={p.img} alt={p.title} />
                <div className="port-overlay">
                  <a href={p.link} className="port-view-btn">
                    View
                  </a>
                </div>
              </div>
              
              <div className="port-content">
                <div className="port-meta">
                  <span className="port-category">{p.category}</span>
                  <div className="port-line" style={{ backgroundColor: p.color }} />
                </div>
                <h3 className="port-card-title">{p.title}</h3>
                <p className="port-card-desc">{p.desc}</p>
                
                <div className="port-tags">
                  {p.tags.map(tag => (
                    <span key={tag} className="port-tag bg-yellow-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}