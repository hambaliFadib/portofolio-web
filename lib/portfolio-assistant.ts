import "server-only";

import { type AssistantMessage } from "@/data/assistant";
import { aboutHardSkillGroups, aboutPersonalFoundation, aboutProfile } from "@/data/about";
import { educationItems } from "@/data/education";
import { experienceEntries } from "@/data/experience";
import type { Locale } from "@/data/i18n";
import { localizedContent } from "@/data/localized-content";
import { siteConfig } from "@/data/profile";
import {
  builtSystemsProjects,
  enterpriseCaseStudies,
  type PortfolioEvidenceLink,
  type PortfolioProject,
} from "@/data/projects";
import {
  realDecisionCasesFooterNote,
  realDecisionCasesIntro,
  realDecisionCasesPrinciple,
} from "@/data/real-decision-cases";
import {
  decisionPatternsSection,
  decisionPrinciplesSection,
  problemBreakdownSection,
  riskThinkingModelSection,
  thinkingFinalThought,
  thinkingSnapshotSection,
} from "@/data/thinking";
import { formatTimelinePeriod, formatTimelineRange } from "@/lib/date-ranges";

interface KnowledgeSnippet {
  id: string;
  title: string;
  text: string;
  keywords: string[];
  section:
    | "identity"
    | "background"
    | "skills"
    | "thinking"
    | "projects"
    | "contact"
    | "navigation";
}

function compactText(value: string, maxLength = 460) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function toKeywordSet(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9.+/-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );
}

function formatEvidenceLinks(evidence: PortfolioEvidenceLink[] | undefined) {
  if (!evidence || evidence.length === 0) {
    return "";
  }

  return evidence.map((item) => `${item.label}: ${item.href}`).join(" | ");
}

function formatEnterpriseProject(project: PortfolioProject) {
  return compactText(
    [
      `${project.title} (${project.domain ?? "Enterprise system"})`,
      `Problem: ${project.problem ?? project.context ?? "NDA-safe enterprise quality and release governance work."}`,
      project.whatIOwned?.length
        ? `What he owned: ${project.whatIOwned.slice(0, 2).join("; ")}`
        : null,
      project.risksHandled?.length
        ? `Risks handled: ${project.risksHandled.slice(0, 2).join("; ")}`
        : null,
      `Decision impact: ${project.decisionImpact.slice(0, 2).join("; ")}`,
      project.businessImpact?.length
        ? `Business impact: ${project.businessImpact.slice(0, 2).join("; ")}`
        : null,
    ]
      .filter(Boolean)
      .join(". "),
    760,
  );
}

function formatBuiltSystem(project: PortfolioProject) {
  return compactText(
    [
      `${project.title} (Built system)`,
      project.decisionProblem?.length
        ? `Decision problem: ${project.decisionProblem.slice(0, 2).join("; ")}`
        : null,
      project.whatThisSystemChanged?.length
        ? `What changed: ${project.whatThisSystemChanged.slice(0, 2).join("; ")}`
        : null,
      `Decision impact: ${project.decisionImpact.slice(0, 2).join("; ")}`,
      project.evidence?.length
        ? `Public links: ${formatEvidenceLinks(project.evidence)}`
        : null,
    ]
      .filter(Boolean)
      .join(". "),
    820,
  );
}

const identitySnippet: KnowledgeSnippet = {
  id: "identity",
  title: "Identity",
  section: "identity",
  text: compactText(
    `${siteConfig.author.name} is a ${siteConfig.author.role} based in ${siteConfig.author.location}. ${aboutProfile.summary} Personal principle: ${aboutProfile.principle}`,
    760,
  ),
  keywords: [
    "who",
    "hambali",
    "fadib",
    "about",
    "background",
    "identity",
    "different",
    "difference",
    "profile",
  ],
};

const backgroundSummarySnippet: KnowledgeSnippet = {
  id: "background-summary",
  title: "Background Summary",
  section: "background",
  text: compactText(
    `${experienceEntries
      .map(
        (entry) =>
          `${entry.role} at ${entry.companyLine} (${formatTimelinePeriod(entry.range)}) with focus on ${compactText(entry.summary, 120)}`,
      )
      .join(" | ")} | Education: ${educationItems
      .map(
        (item) => `${item.institution} - ${item.degree} (${formatTimelineRange(item.range)})`,
      )
      .join(" | ")}`,
    1100,
  ),
  keywords: [
    "experience",
    "career",
    "background",
    "education",
    "roles",
    "neuronworks",
    "papyrus",
    "university",
    "school",
  ],
};

const skillsSnippet: KnowledgeSnippet = {
  id: "skills",
  title: "Hard Skills",
  section: "skills",
  text: compactText(
    aboutHardSkillGroups
      .map((group) => `${group.title}: ${group.items.join(", ")}`)
      .join(" | "),
    980,
  ),
  keywords: [
    "skills",
    "tools",
    "playwright",
    "cypress",
    "sql",
    "oracle",
    "javascript",
    "python",
    "jmeter",
    "n8n",
    "dbeaver",
    "minio",
    "prometheus",
    "postman",
    "automation",
    "testing",
  ],
};

const personalFoundationSnippet: KnowledgeSnippet = {
  id: "personal-foundation",
  title: "Personal Foundation",
  section: "background",
  text: aboutPersonalFoundation.join(" | "),
  keywords: ["principles", "foundation", "values", "personal", "beliefs"],
};

const thinkingOverviewSnippet: KnowledgeSnippet = {
  id: "thinking-overview",
  title: "QA Thinking Overview",
  section: "thinking",
  text: compactText(
    `Decision principles: ${decisionPrinciplesSection.items
      .map((item) => `${item.title}: ${item.description}`)
      .join(" | ")} | Problem breakdown: ${problemBreakdownSection.items
      .map((item) => `${item.title}: ${item.description}`)
      .join(" | ")}`,
    1200,
  ),
  keywords: [
    "qa approach",
    "thinking",
    "principles",
    "validation",
    "ambiguity",
    "quality",
    "problem",
    "intent",
  ],
};

const thinkingRiskSnippet: KnowledgeSnippet = {
  id: "thinking-risk",
  title: "Risk and Decision Model",
  section: "thinking",
  text: compactText(
    `Risk model: ${riskThinkingModelSection.items
      .map((item) => `${item.title}: ${item.description}`)
      .join(" | ")} | Decision patterns: ${decisionPatternsSection.items
      .map((item) => `${item.title}: ${item.points.join(", ")}`)
      .join(" | ")} | Final thought: ${thinkingFinalThought.description}`,
    1200,
  ),
  keywords: [
    "risk",
    "release",
    "decision",
    "block",
    "conditional",
    "escalate",
    "invariant",
    "ownership",
    "go no go",
  ],
};

const thinkingSnapshotSnippet: KnowledgeSnippet = {
  id: "thinking-snapshot",
  title: "Thinking Snapshot",
  section: "thinking",
  text: thinkingSnapshotSection.items
    .map((item) => `${item.title}: ${item.description}`)
    .join(" | "),
  keywords: ["snapshot", "billing", "reasoning", "decision blocked", "invariant"],
};

const projectsOverviewSnippet: KnowledgeSnippet = {
  id: "projects-overview",
  title: "Projects Overview",
  section: "projects",
  text: compactText(
    `Enterprise case studies: ${enterpriseCaseStudies
      .map((project) => `${project.title} (${project.domain})`)
      .join(" | ")} | Built systems: ${builtSystemsProjects
      .map((project) => project.title)
      .join(" | ")}`,
    920,
  ),
  keywords: ["projects", "work", "systems", "case studies", "portfolio", "built systems"],
};

const realDecisionCasesSnippet: KnowledgeSnippet = {
  id: "real-decision-cases",
  title: "Real Decision Cases",
  section: "projects",
  text: compactText(
    `${realDecisionCasesIntro.description} ${realDecisionCasesPrinciple.body} ${realDecisionCasesFooterNote}`,
    900,
  ),
  keywords: ["real decision cases", "evidence", "publication", "confidential", "anonymized", "proof"],
};

const contactSnippet: KnowledgeSnippet = {
  id: "contact",
  title: "Contact and Social Links",
  section: "contact",
  text: [
    `Email: ${siteConfig.author.email}`,
    `mailto: ${`mailto:${siteConfig.author.email}`}`,
    `LinkedIn: ${siteConfig.author.linkedin}`,
    `GitHub: ${siteConfig.author.github}`,
    `Instagram: ${siteConfig.author.instagram}`,
    `WhatsApp: ${siteConfig.author.whatsapp}`,
  ].join(" | "),
  keywords: [
    "contact",
    "email",
    "linkedin",
    "github",
    "instagram",
    "whatsapp",
    "social",
    "link",
    "reach",
    "hire",
  ],
};

const navigationSnippet: KnowledgeSnippet = {
  id: "navigation",
  title: "Portfolio Navigation",
  section: "navigation",
  text: `Home: / | Projects: /projects | Thinking: /quality-thinking | About: /about | Contact: /contact | Clarity AI: floating button at the bottom-right of every page`,
  keywords: ["page", "pages", "navigate", "navigation", "where", "route", "tab", "home", "about", "projects", "thinking", "contact"],
};

const enterpriseProjectSnippets: KnowledgeSnippet[] = enterpriseCaseStudies.map((project) => ({
  id: `project-${project.id}`,
  title: project.title,
  section: "projects",
  text: formatEnterpriseProject(project),
  keywords: [project.title, project.domain ?? "", ...project.tags, "project", "enterprise", "case study"],
}));

const builtSystemSnippets: KnowledgeSnippet[] = builtSystemsProjects.map((project) => ({
  id: `system-${project.id}`,
  title: project.title,
  section: "projects",
  text: formatBuiltSystem(project),
  keywords: [project.title, ...project.tags, "system", "built system", "automation", "github", "repo"],
}));

const knowledgeSnippets: KnowledgeSnippet[] = [
  identitySnippet,
  backgroundSummarySnippet,
  skillsSnippet,
  personalFoundationSnippet,
  thinkingOverviewSnippet,
  thinkingRiskSnippet,
  thinkingSnapshotSnippet,
  projectsOverviewSnippet,
  realDecisionCasesSnippet,
  contactSnippet,
  navigationSnippet,
  ...enterpriseProjectSnippets,
  ...builtSystemSnippets,
];

function buildQuery(messages: AssistantMessage[]) {
  return messages
    .slice(-5)
    .map((message) => message.content)
    .join(" ")
    .toLowerCase();
}

function detectTopics(query: string) {
  return {
    contact: /(contact|email|linkedin|github|instagram|whatsapp|social|reach|hire|call|message|link)/.test(query),
    projects: /(project|projects|system|systems|case study|case studies|work|built|repo|repository|github)/.test(query),
    thinking: /(qa approach|approach|thinking|risk|release|decision|validation|ambiguity|invariant|quality|block|conditional|escalate)/.test(query),
    background: /(about|background|experience|career|education|study|role|journey|who is|who's|profile)/.test(query),
    skills: /(skill|skills|tool|tools|playwright|cypress|sql|oracle|python|javascript|jmeter|n8n|dbeaver|minio|prometheus|postman|automation)/.test(query),
    navigation: /(where|page|pages|tab|open|navigate|navigation|route)/.test(query),
  };
}

function scoreSnippet(snippet: KnowledgeSnippet, query: string, tokens: string[]) {
  const haystack = `${snippet.title} ${snippet.text} ${snippet.keywords.join(" ")}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (snippet.keywords.some((keyword) => keyword.toLowerCase().includes(token))) {
      score += 4;
    }

    if (haystack.includes(token)) {
      score += 1;
    }
  }

  if (query.includes(snippet.title.toLowerCase())) {
    score += 8;
  }

  return score;
}

function pushIfPresent(selected: KnowledgeSnippet[], ids: string[]) {
  for (const id of ids) {
    const snippet = knowledgeSnippets.find((item) => item.id === id);

    if (snippet && !selected.some((item) => item.id === snippet.id)) {
      selected.push(snippet);
    }
  }
}

function selectProjectMatches(query: string, tokens: string[]) {
  return [...enterpriseProjectSnippets, ...builtSystemSnippets]
    .map((snippet) => ({
      snippet,
      score: scoreSnippet(snippet, query, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => item.snippet.id);
}

function selectRelevantSnippets(messages: AssistantMessage[]) {
  const query = buildQuery(messages);
  const tokens = toKeywordSet(query);
  const topics = detectTopics(query);
  const selected: KnowledgeSnippet[] = [];

  pushIfPresent(selected, ["identity"]);

  if (topics.contact) {
    pushIfPresent(selected, ["contact", "navigation"]);
  }

  if (topics.background) {
    pushIfPresent(selected, ["background-summary", "personal-foundation"]);
  }

  if (topics.skills) {
    pushIfPresent(selected, ["skills"]);
  }

  if (topics.thinking) {
    pushIfPresent(selected, ["thinking-overview", "thinking-risk", "thinking-snapshot"]);
  }

  if (topics.projects) {
    pushIfPresent(selected, ["projects-overview", "real-decision-cases"]);
    pushIfPresent(selected, selectProjectMatches(query, tokens));
  }

  if (topics.navigation) {
    pushIfPresent(selected, ["navigation"]);
  }

  if (selected.length < 4) {
    pushIfPresent(selected, ["background-summary", "thinking-overview", "projects-overview", "contact"]);
  }

  const scored = knowledgeSnippets
    .map((snippet) => ({
      snippet,
      score: scoreSnippet(snippet, query, tokens),
    }))
    .sort((left, right) => right.score - left.score);

  for (const { snippet, score } of scored) {
    if (selected.some((item) => item.id === snippet.id)) {
      continue;
    }

    if (selected.length >= 10) {
      break;
    }

    if (score > 0) {
      selected.push(snippet);
    }
  }

  return selected.slice(0, 10);
}

function getLanguageInstruction(locale: Locale) {
  if (locale === "id") {
    return [
      "Answer in Indonesian.",
      "When you retain English technical terms, wrap the term with slash markers, for example /Billing/, /Workflow/, /Transaction/, /Monitoring/, /QA/, /release/, /API/, and /UI/.",
      "Keep exact public links, names, company names, and project titles unchanged when accuracy requires it.",
    ].join(" ");
  }

  return "Answer in English.";
}

export function buildPortfolioAssistantSystemPrompt(
  messages: AssistantMessage[],
  locale: Locale = "en",
) {
  const relevantSnippets = selectRelevantSnippets(messages)
    .map((snippet) => `[${snippet.title}] ${snippet.text}`)
    .join("\n");
  const helpfulPrompts = localizedContent[locale].assistant.quickQuestions.join(" | ");

  return [
    `You are the portfolio assistant for ${siteConfig.author.name}.`,
    getLanguageInstruction(locale),
    "Answer only from the provided portfolio snippets.",
    "Do not be generic when the snippets contain specific names, systems, roles, tools, project titles, or links.",
    "Use exact portfolio facts when available.",
    "If the user asks about contact or social media, provide the exact public link or address from the snippets.",
    "If the user asks about projects, mention relevant project titles, decision problems, impact, and public repo links when they are available in the snippets.",
    "If the user asks about QA approach, explain the decision principles, risk model, and release patterns from the snippets instead of giving generic QA advice.",
    "If the answer is not available in the snippets, say so clearly instead of guessing.",
    "Never invent personal facts, hidden company data, customer names, confidential implementation details, internal screenshots, production queries, or unpublished evidence.",
    "When discussing enterprise work, stay at the same NDA-safe and public-safe level as the portfolio.",
    "Default to a detailed but efficient answer. Use short sections or bullets when that makes the answer clearer.",
    "Format answers cleanly with short paragraphs, visible line breaks, and compact bullets or numbered lists when listing multiple points.",
    "When using numbered sections, number them sequentially as 1., 2., 3., and so on.",
    "Do not use Markdown tables, raw pipe tables, or HTML tags such as <br>; use readable bullets instead.",
    "Avoid wall-of-text replies. Separate different ideas with a blank line.",
    `Helpful portfolio prompts: ${helpfulPrompts}.`,
    "",
    "Relevant portfolio snippets:",
    relevantSnippets,
  ].join("\n");
}

export function sanitizeAssistantMessages(messages: AssistantMessage[]) {
  return messages
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, message.role === "user" ? 500 : 650),
    }))
    .filter((message) => message.content.length > 0);
}

