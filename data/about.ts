export const aboutProfile = {
  name: "Hambali Fadib",
  heading: "The path behind the work.",
  introduction: [
    "I started with the systems behind everyday operations: handling data, supporting infrastructure, and investigating technical issues when things didn't work as expected.",
    "Those experiences taught me that software is more than what appears on screen. They eventually led me into quality engineering, where understanding business rules, system dependencies, and real-world behavior became an essential part of my work.",
  ],
  journey: [
    {
      number: "01",
      title: "Quality Engineering",
      description: "Moving into QA gave me a different perspective on those systems. I began working with complex enterprise applications, validating business rules, investigating defects, and identifying risks across UI, API, and integration layers.",
    },
    {
      number: "02",
      title: "QA Engineering & Automation",
      description: "As I encountered repetitive testing challenges, I started building automation workflows, QA utilities, and reusable testing foundations. My focus gradually expanded from executing tests to improving how testing is prepared, maintained, and validated.",
    },
  ],
  education: [
    { institution: "Asia Cyber University", qualification: "Bachelor of Information Systems", status: "In Progress" },
    { institution: "Vocational Education", qualification: "Computer and Network Engineering (TKJ)" },
  ],
  personalNote: "I don't need every decision to be perfect. I need to understand the evidence, the assumptions, and the risks behind it.",
  image: {
    src: "/fotoAbout.jpg",
    alt: "Hambali Fadib",
  },
};

export const aboutCvAction = {
  label: "View CV",
  href: "/Hambali_Fadib_CV_QA_2026.pdf",
  downloadName: "Hambali-Fadib-CV.pdf",
};

export const aboutHardSkillGroups = [
  {
    id: "system-qa",
    title: "System & QA",
    items: [
      "Business Process Analysis",
      "System Behavior Validation",
      "Risk-Based Testing Strategy",
      "API Testing",
      "UI Testing",
      "Integration Testing",
      "Performance Testing",
      "SIT / UAT Coordination",
      "Quality Gate Definition",
      "Cross-Module Validation",
      "Root Cause Analysis",
      "Requirement Clarification",
    ],
  },
  {
    id: "automation-technical",
    title: "Automation & Technical",
    items: [
      "Unit Testing",
      "Automation Testing",
      "Playwright",
      "Cypress",
      "JMeter",
      "Postman / Newman",
      "Python",
      "JavaScript",
      "SQL",
      "Oracle DB",
      "Database Validation",
    ],
  },
  {
    id: "infrastructure-tools",
    title: "Infrastructure & Tools",
    items: [
      "n8n",
      "JMeter",
      "DBeaver",
      "MinIO",
      "Prometheus",
      "Git / GitHub",
      "Docker",
      "Linux",
      "Monitoring",
      "Log Analysis",
      "Environment Validation",
    ],
  },
  {
    id: "delivery-operations",
    title: "Delivery & Operations",
    items: [
      "Release Readiness Review",
      "Defect Risk Analysis",
      "Workflow Validation",
      "Process Integrity Review",
      "Evidence Structuring",
      "QA Documentation",
      "Traceability",
      "Stakeholder Alignment",
    ],
  },
] as const;

export const aboutPersonalFoundation = [
  "I prefer clarity over speed",
  "I value correctness over assumption",
  "I focus on long-term system integrity",
  "I believe systems must reflect real-world logic",
] as const;

export const aboutJourneySection = {
  eyebrow: "Professional moments",
  title: "Journey",
  images: [
    {
      id: "journey-one",
      src: "/satu.jpg",
      alt: "Professional journey moment one",
    },
    {
      id: "journey-two",
      src: "/dua.jpg",
      alt: "Professional journey moment two",
    },
    {
      id: "journey-three",
      src: "/tiga.jpg",
      alt: "Professional journey moment three",
    },
    {
      id: "journey-four",
      src: "/empat.jpg",
      alt: "Professional journey moment four",
    },
    {
      id: "journey-five",
      src: "/lima.jpg",
      alt: "Professional journey moment five",
    },
  ],
} as const;

export const aboutFinalStatement = [
  "Quality is not measured by how much was tested.",
  "Quality is measured by whether the release decision remains correct under real business conditions.",
];
