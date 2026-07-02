export interface NavigationItem {
  name: string;
  href: string;
}

export interface ContactChannel {
  label: string;
  value: string;
  href: string;
  description: string;
}

export interface HomeCapability {
  title: string;
  description: string;
}

export interface HomeNavigationCard {
  title: string;
  description: string;
  href: string;
  cta: string;
}

export const siteConfig = {
  name: "QA Portfolio System",
  title: "Hambali Fadib - Portofolio",
  description:
    "Executive-summary portfolio for a Software QA Engineer focused on enterprise systems, risk-based quality, and structured decision-making.",
  author: {
    name: "Hambali Fadib",
    role: "Software Quality Assurance Engineer",
    email: "fadibhambali@gmail.com",
    linkedin: "https://linkedin.com/in/hambalifadib",
    github: "https://github.com/hambaliFadib",
    instagram: "https://www.instagram.com/hambalifadib",
    whatsapp: "https://wa.me/6281321506229",
    phone: "+62 813-2150-6229",
    location: "Bandung, Indonesia",
  },
  navigation: [
    { name: "Home", href: "/" },
    { name: "Projects", href: "/projects" },
    { name: "Thinking", href: "/quality-thinking" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ] satisfies NavigationItem[],
} as const;

export const heroContent = {
  headline: "Risk-Based Quality | Protecting Business-Critical Systems",
  description:
    "Focused on business-critical systems, ensuring quality decisions are clear, risks are explicit, and complex processes remain reliable under pressure.",
  primaryCta: {
    label: "Explore Work & Framework",
    href: "/projects",
  },
  secondaryCta: {
    label: "Quality Thinking",
    href: "/quality-thinking",
  },
} as const;

export const homeCapabilities: HomeCapability[] = [
  {
    title: "Business Process Validation",
    description: "Validate workflows against real business intent, not just system behavior.",
  },
  {
    title: "Risk-Based Quality Decision",
    description: "Define what must be tested and what can be safely deprioritized based on risk.",
  },
  {
    title: "Enterprise System Testing",
    description: "Handle multi-module and high-risk enterprise system flows.",
  },
  {
    title: "Quality Governance",
    description: "Control release risk through explicit QA boundaries and decision clarity.",
  },
  {
    title: "Business Invariant Analysis",
    description: "Define rules the system must never break under any condition.",
  },
];

export const homeNavigationCards: HomeNavigationCard[] = [
  {
    title: "Explore Work & Framework",
    description: "Open NDA-safe case studies and the structured QA framework behind them.",
    href: "/projects",
    cta: "Open Projects",
  },
  {
    title: "Quality Thinking",
    description: "See how invariants, boundaries, and risk-based decisions are organized.",
    href: "/quality-thinking",
    cta: "Open Thinking",
  },
  {
    title: "About Me",
    description: "Read the background, trajectory, and transition toward QA Architect.",
    href: "/about",
    cta: "Open About",
  },
];

export const contactChannels: ContactChannel[] = [
  {
    label: "Email",
    value: siteConfig.author.email,
    href: `mailto:${siteConfig.author.email}`,
    description: "Best for direct conversation, collaboration, and detailed follow-up.",
  },
  {
    label: "LinkedIn",
    value: "Professional profile",
    href: siteConfig.author.linkedin,
    description: "Good for recruiter, hiring manager, and professional network conversations.",
  },
  {
    label: "GitHub",
    value: "Code and experiments",
    href: siteConfig.author.github,
    description: "Useful when the discussion needs a more implementation-oriented reference.",
  },
  {
    label: "Instagram",
    value: "Profile available on request",
    href: siteConfig.author.instagram,
    description: "A lighter communication path when a more casual channel makes sense.",
  },
  {
    label: "WhatsApp",
    value: "Direct Message",
    href: siteConfig.author.whatsapp,
    description: "Best for short coordination once the discussion is already moving.",
  },
];
