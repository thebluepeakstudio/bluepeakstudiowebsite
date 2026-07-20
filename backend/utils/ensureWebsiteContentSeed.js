const WebsiteTestimonial = require("../models/WebsiteTestimonial");
const WebsiteProject = require("../models/WebsiteProject");

const DEFAULT_TESTIMONIALS = [
  {
    name: "Chikoo Constructions Ltd",
    text: "We had a great experience working with Bluepeak Studios on our website, chikooconstructions.com. They were professional, responsive, and understood exactly what we wanted for our business. The website looks modern, runs smoothly, and was delivered with great attention to detail. We're very happy with the final result and would highly recommend Bluepeak Studios to anyone looking for quality web design services.",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Chikoo%20Constructions.jpeg",
    rating: 5,
    sortOrder: 0,
    status: "Published",
  },
  {
    name: "Tvastih Studio",
    text: "Had a really great experience working with BluePeak Studio—they understood exactly what we wanted and delivered a clean, modern website that looks great and works smoothly. Very happy with the final result and would definitely recommend them.",
    img: "https://ik.imagekit.io/bluepeakstudio/Chikoo%20Constructions/Logo.jpg",
    rating: 5,
    sortOrder: 1,
    status: "Published",
  },
  {
    name: "Zolo Media",
    text: "Yash delivered high-quality work on the project. His proficiency was evident in the innovative solutions he implemented.",
    img: "https://ik.imagekit.io/bluepeakstudio/Chikoo%20Constructions/1667542912129.jpg",
    rating: 5,
    sortOrder: 2,
    status: "Published",
  },
  {
    name: "Mr Lazy Tech",
    text: "BluePeak Studio did an amazing job building my blogging website—they perfectly understood my needs as a tech YouTuber and delivered a clean, fast, and user-friendly site. What impressed me the most is that the website started ranking on several high-performing keywords within a short time.",
    img: "https://ik.imagekit.io/bluepeakstudio/Chikoo%20Constructions/channels4_profile%20(1).jpg",
    rating: 5,
    sortOrder: 3,
    status: "Published",
  },
];

const DEFAULT_PROJECTS = [
  {
    slug: "client-management-system",
    title: "Client Management System",
    category: "Custom Software",
    desc: "A centralized workspace designed to track clients, projects, deliverables, payment statuses, and freelancers in one unified dashboard.",
    tags: ["React", "Node.js", "PostgreSQL", "Express.js"],
    color: "#EF9F27",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/crm%20blue%20peak%20studio?updatedAt=1783882218230",
    link: "",
    size: "large",
    sortOrder: 0,
    status: "Published",
    caseStudy: {
      overview:
        "We built an internal CRM tailored for a growing creative agency managing dozens of clients, freelancers, and concurrent projects. The system replaces scattered spreadsheets and messaging threads with a single source of truth for operations.",
      problem:
        "The team tracked clients across Google Sheets, WhatsApp, and email — leading to missed follow-ups, unclear payment statuses, and no visibility into freelancer workload. Project managers spent hours each week reconciling data instead of delivering work.",
      solution:
        "We designed a role-based dashboard with client profiles, project timelines, deliverable tracking, and automated payment reminders. Freelancer assignments, invoice status, and project health are visible at a glance. PostgreSQL enforces data integrity while Redis caches frequently accessed reports for fast load times.",
      highlights: [
        "Unified client, project, and freelancer records",
        "Real-time payment and deliverable status tracking",
        "Role-based access for admins, PMs, and freelancers",
        "Automated reminders for overdue payments and milestones",
      ],
    },
  },
  {
    slug: "inventory-management-system",
    title: "Inventory Management System",
    category: "Custom Software",
    desc: "A centralized system designed to track inventory, stock and transfers, between stores and warehouses.",
    tags: ["React", "Node.js", "PostgreSQL", "Express.js"],
    color: "#EF9F27",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/crm%20blue%20peak%20studio?updatedAt=1783882218230",
    link: "",
    size: "large",
    sortOrder: 1,
    status: "Published",
    caseStudy: {
      overview:
        "A multi-location inventory platform for a retail business operating several stores and a central warehouse. Staff can log stock movements, transfer items between locations, and get low-stock alerts without calling the warehouse.",
      problem:
        "Inventory was tracked manually at each store with no sync between locations. Stockouts and overstocking were common, transfers took days to reconcile, and managers had no real-time picture of what was available across the network.",
      solution:
        "We built a web app with location-aware stock levels, transfer workflows with approval steps, and audit logs for every movement. Store managers scan and update stock from any device; the central dashboard aggregates availability and flags items below reorder thresholds.",
      highlights: [
        "Live stock levels across stores and warehouses",
        "Guided transfer requests with approval flow",
        "Low-stock alerts and reorder suggestions",
        "Full audit trail for every inventory movement",
      ],
    },
  },
  {
    slug: "foxnut-manufacturing-erp",
    title: "Foxnut Manufacturing ERP",
    category: "Custom Software",
    desc: "An end-to-end manufacturing system that tracks raw foxnut procurement, final inventory production, sales, invoices, and automated financial balance sheets.",
    tags: ["React", "Node.js", "PostgreSQL", "Express.js", "Docker", "Redis"],
    color: "#5DCAA5",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-07-01%20153132.png?updatedAt=1782900128997",
    link: "",
    size: "large",
    sortOrder: 2,
    status: "Published",
    caseStudy: {
      overview:
        "A full manufacturing ERP for a foxnut (makhana) processing business — from raw material procurement through production, sales, invoicing, and automated balance sheet generation.",
      problem:
        "The business ran on paper ledgers and disconnected Excel files. Raw material costs, production yields, sales, and finances were tracked separately, making it impossible to know true margins or generate accurate reports at month-end.",
      solution:
        "We delivered an integrated ERP covering procurement, batch production tracking, inventory, sales orders, GST invoicing, and auto-generated balance sheets. Docker containerizes the stack for reliable deployment; Redis speeds up reporting queries on large datasets.",
      highlights: [
        "End-to-end traceability from raw foxnut to finished goods",
        "Automated GST invoicing and financial statements",
        "Production batch tracking with yield analytics",
        "Containerized deployment for on-premise reliability",
      ],
    },
  },
  {
    slug: "chikoo-constructions",
    title: "Chikoo Constructions",
    category: "Real Estate",
    desc: "A high-performance corporate portal for a premier construction firm, featuring interactive project galleries and optimized lead generation flows.",
    tags: ["React", "Node.js", "MongoDB"],
    color: "#378ADD",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20223201.png",
    link: "https://www.chikooconstructions.com/",
    size: "large",
    sortOrder: 3,
    status: "Published",
    caseStudy: null,
  },
  {
    slug: "wanderlust",
    title: "WanderLust",
    category: "Web App",
    desc: "Premium Property Listing and Booking Website.",
    tags: ["JavaScript", "Express.js", "REST APIs", "Node.js", "MySQL"],
    color: "#D85A30",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221731.png?updatedAt=1774033525183",
    link: "https://wanderlust-1k0r.onrender.com/listings",
    size: "large",
    sortOrder: 4,
    status: "Published",
    caseStudy: null,
  },
  {
    slug: "tvastih-studio",
    title: "Tvastih Studio",
    category: "E-Commerce",
    desc: "Enterprise-grade project management dashboard featuring high-performance Kanban systems.",
    tags: ["Wix"],
    color: "#5DCAA5",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-03-11%20221051.png?updatedAt=1774033525219",
    link: "#",
    size: "small",
    sortOrder: 5,
    status: "Published",
    caseStudy: null,
  },
  {
    slug: "mr-corrugators",
    title: "MR Corrugators",
    category: "Manufacturing",
    desc: "Packaging manufacturers of high-quality packaging solutions.",
    tags: ["JavaScript", "React.js", "Express.js", "REST APIs", "Node.js", "MySQL"],
    color: "#EF9F27",
    img: "https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/Screenshot%202026-04-24%20222727.png",
    link: "https://mr-corrugators.vercel.app/",
    size: "small",
    sortOrder: 6,
    status: "Published",
    caseStudy: null,
  },
];

/**
 * Seed homepage testimonials and portfolio projects once if collections are empty.
 */
async function ensureWebsiteContentSeed() {
  const [testimonialCount, projectCount] = await Promise.all([
    WebsiteTestimonial.countDocuments({ deletedAt: null }),
    WebsiteProject.countDocuments({ deletedAt: null }),
  ]);

  const result = { testimonials: false, projects: false };

  if (testimonialCount === 0) {
    await WebsiteTestimonial.insertMany(DEFAULT_TESTIMONIALS);
    result.testimonials = true;
    console.log(`[website-seed] Inserted ${DEFAULT_TESTIMONIALS.length} testimonials`);
  }

  if (projectCount === 0) {
    await WebsiteProject.insertMany(DEFAULT_PROJECTS);
    result.projects = true;
    console.log(`[website-seed] Inserted ${DEFAULT_PROJECTS.length} portfolio projects`);
  }

  if (!result.testimonials && !result.projects) {
    console.log("[website-seed] Website content already present");
  }

  return result;
}

module.exports = ensureWebsiteContentSeed;
