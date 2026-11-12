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

export const siteConfig = {
  name: "QA Portfolio System",
  title: "Hambali Fadib - Portfolio",
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
    { name: "Home", href: "/#top" },
    { name: "Projects", href: "/#projects" },
    { name: "Thinking", href: "/#thinking" },
    { name: "About", href: "/#about" },
    { name: "Contact", href: "/#contact" },
  ] satisfies NavigationItem[],
} as const;

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
