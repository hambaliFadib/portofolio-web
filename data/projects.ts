import { siteConfig } from "@/data/profile";

export interface PortfolioEvidenceLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface PortfolioProject {
  id: string;
  title: string;
  tags: string[];
  variant?: "case-study" | "decision-system";
  domain?: string;
  context?: string;
  problem?: string;
  whatIOwned?: string[];
  risksHandled?: string[];
  decisionImpact: string[];
  businessImpact?: string[];
  decisionProblem?: string[];
  whatThisSystemChanged?: string[];
  evidence?: PortfolioEvidenceLink[];
}

const githubBase = siteConfig.author.github.replace(/\/$/, "");

function buildEvidence(links: PortfolioEvidenceLink[]): PortfolioEvidenceLink[] {
  return links.map((link) => ({ ...link, external: true }));
}

function buildGitHubRepoEvidence(
  repoSlug: string,
  labels: Array<[label: string, path: string]>,
): PortfolioEvidenceLink[] {
  const repoUrl = `${githubBase}/${repoSlug}`;

  return buildEvidence(
    labels.map(([label, path]) => ({
      label,
      href: path ? `${repoUrl}/blob/${repoSlug === "playwright-quality-framework" ? "main" : "master"}/${path}` : repoUrl,
    })),
  );
}

export const enterpriseCaseStudies: PortfolioProject[] = [
  {
    id: "billing-calculation-system",
    title: "Billing & Calculation System",
    variant: "case-study",
    domain: "Enterprise Billing & Revenue Calculation",
    context:
      "Enterprise billing platform handling pricing, usage conversion, and layered charge logic where calculation correctness directly affected revenue recognition and financial trust. The system operated across interconnected modules, making a single rule change capable of altering downstream billing outcomes.",
    problem:
      "Business rules for pricing and charge behavior were ambiguous and inconsistently interpreted across modules, creating exposure to incorrect billing outcomes and unreliable release decisions.",
    whatIOwned: [
      "Defined the business invariants that pricing, charge, and conversion behavior could not violate",
      "Set the calculation boundary across modules so ownership of correctness was explicit",
      "Directed focus toward ambiguity in high-impact charge scenarios before release",
      "Controlled release readiness through calculation checkpoints and decision gates tied to revenue risk",
    ],
    risksHandled: [
      "Financial misstatement caused by incorrect charge generation",
      "Cross-module divergence between pricing logic, conversion logic, and billing output",
      "Silent release failure where incorrect billing behavior could pass into production unnoticed",
    ],
    decisionImpact: [
      "Strengthened release decisions by making calculation risk explicit before approval",
      "Increased confidence that system behavior matched intended business charging rules",
      "Reduced the likelihood of approving releases with unresolved revenue-critical ambiguity",
    ],
    businessImpact: [
      "Protected revenue accuracy and reduced exposure to billing-related business loss",
      "Improved reliability of a business-critical calculation flow that directly affects customer trust",
    ],
    tags: ["Revenue Logic", "Financial Risk", "Cross-Module", "Release Control"],
  },
  {
    id: "field-operation-workflow-system",
    title: "Field Operation Workflow System",
    variant: "case-study",
    domain: "Enterprise Operations Workflow",
    context:
      "Enterprise workflow platform coordinating task assignment, status transitions, and operational handoffs across multiple business roles. Workflow correctness mattered because state changes directly shaped execution in the field.",
    problem:
      "Workflow states and transition rules contained hidden ambiguity, allowing different modules and roles to interpret operational status differently and creating instability in end-to-end process execution.",
    whatIOwned: [
      "Defined the state transition boundaries that the workflow could not cross incorrectly",
      "Clarified which workflow outcomes were acceptable and which represented release-blocking behavior",
      "Directed attention to high-risk state scenarios where operational intent could be lost",
      "Controlled release readiness by tying workflow acceptance to real process continuity, not isolated feature behavior",
    ],
    risksHandled: [
      "Workflow breakdown caused by invalid or conflicting state transitions",
      "Cross-module mismatch where status meaning changed between systems or roles",
      "Silent operational failure where incorrect state progression disrupted execution after release",
    ],
    decisionImpact: [
      "Improved release control by making workflow-risk interpretation consistent",
      "Increased confidence that state-driven behavior reflected actual business process intent",
      "Reduced the chance of approving a release with unstable operational handoffs",
    ],
    businessImpact: [
      "Protected operational continuity and reduced disruption in role-based execution",
      "Improved reliability of workflow-dependent processes that support field operations",
    ],
    tags: ["Workflow Governance", "State Integrity", "Operations", "Release Risk"],
  },
  {
    id: "integrated-transaction-system",
    title: "Integrated Transaction System",
    variant: "case-study",
    domain: "Cross-Module Transaction Processing",
    context:
      "Transaction ecosystem coordinating order flow, processing stages, and downstream updates across multiple connected systems. Correctness depended on consistent status propagation and reliable behavior at every checkpoint.",
    problem:
      "Partial failures and fragmented ownership created uncertainty around transaction completeness, making it difficult to determine whether the system remained correct under failure conditions.",
    whatIOwned: [
      "Defined the transaction checkpoints that determined whether processing remained trustworthy across boundaries",
      "Set QA focus on integration paths where inconsistency would create the highest business risk",
      "Framed release decisions around transaction integrity rather than isolated module success",
      "Established decision evidence for whether the system could safely carry transactional load into release",
    ],
    risksHandled: [
      "Transaction inconsistency across connected modules and downstream systems",
      "Incorrect or misleading transaction status at critical business checkpoints",
      "Hidden failure paths where partial success concealed broken end-to-end processing",
    ],
    decisionImpact: [
      "Improved release decisions by exposing transaction risk before deployment approval",
      "Increased confidence in end-to-end correctness across module boundaries",
      "Reduced the probability of releasing with unresolved integration failure conditions",
    ],
    businessImpact: [
      "Protected transaction reliability in processes tied to customer and business operations",
      "Reduced operational risk caused by inconsistent processing outcomes across systems",
    ],
    tags: ["Transaction Integrity", "System Boundaries", "Release Readiness", "Operational Risk"],
  },
  {
    id: "object-storage-platform",
    title: "Object Storage Platform",
    variant: "case-study",
    domain: "Infrastructure Reliability & Data Integrity",
    context:
      "Infrastructure storage platform supporting availability, integrity, and continuity for systems depending on stable data persistence. Platform health had a direct effect on downstream application behavior and operational resilience.",
    problem:
      "Storage instability created upstream confidence that appeared healthy while silently increasing downstream risk to data reliability and operational continuity.",
    whatIOwned: [
      "Framed infrastructure behavior as a quality decision input, not a separate operational concern",
      "Defined the boundary between acceptable platform degradation and release-blocking reliability risk",
      "Escalated attention to incidents where storage signals could compromise application correctness",
      "Connected infrastructure findings to system-level release judgment and operational readiness",
    ],
    risksHandled: [
      "Data integrity degradation affecting business-critical application behavior",
      "Cross-layer instability where storage problems propagated into application failures",
      "Silent reliability erosion that could surface only after release under operational load",
    ],
    decisionImpact: [
      "Improved release control by factoring infrastructure reliability into quality judgment",
      "Increased confidence that downstream systems were not being released on unstable foundations",
      "Reduced the risk of approving changes while platform integrity remained uncertain",
    ],
    businessImpact: [
      "Protected service continuity and trust in systems dependent on storage reliability",
      "Strengthened overall system resilience by treating infrastructure risk as part of quality ownership",
    ],
    tags: ["Data Integrity", "Platform Reliability", "System Resilience", "Operational Continuity"],
  },
  {
    id: "vulnerability-monitoring-platform",
    title: "Vulnerability Monitoring Platform",
    variant: "case-study",
    domain: "Security Monitoring & Risk Visibility",
    context:
      "Monitoring platform used to surface security findings, remediation status, and risk visibility across digital assets. Decision quality depended on whether monitoring outputs could be trusted as current and accurate.",
    problem:
      "Inconsistent and stale monitoring data weakened confidence in risk visibility, creating the possibility of incorrect decisions based on misleading security information.",
    whatIOwned: [
      "Defined the quality boundary for which monitoring outputs were trustworthy enough to support decisions",
      "Framed data consistency and freshness as release-critical quality conditions, not reporting details",
      "Directed focus toward decision-critical outputs where inaccurate monitoring would distort risk judgment",
      "Controlled acceptance criteria around whether the platform could be relied on for operational decision support",
    ],
    risksHandled: [
      "Incorrect risk visibility caused by inconsistent monitoring outputs",
      "Cross-source inconsistency between underlying findings and surfaced decision data",
      "Silent failure where stale data appeared valid and misled operational judgment",
    ],
    decisionImpact: [
      "Improved release judgment by making trust boundaries for monitoring outputs explicit",
      "Increased confidence that surfaced risk information reflected the real system state",
      "Reduced the chance of approving changes that degraded decision-critical visibility",
    ],
    businessImpact: [
      "Strengthened trust in monitoring data used for risk and remediation decisions",
      "Improved reliability of a platform that supports security awareness and operational prioritization",
    ],
    tags: ["Security Visibility", "Decision Support", "Data Trust", "Monitoring Governance"],
  },
];

export const builtSystemsProjects: PortfolioProject[] = [
  {
    id: "ai-test-case-generator",
    title: "AI Test Case Generator",
    variant: "decision-system",
    domain: "Requirement Analysis & Test Design Automation",
    context:
      "Open-source CLI and Web UI that turns requirements documents into structured, categorized test cases through a five-layer pipeline: Input, Analysis, Generation, Validation, Output. Built for QA work where requirement ambiguity is the main risk, so the generator stays deterministic in planning and treats the LLM as a bounded tool, never as the source of truth.",
    problem:
      "Manual test case design is slow, inconsistent, and drifts from requirement intent. LLM-assisted generation is faster, but unverified output invents behaviors, collapses scenarios, and loses requirement traceability. Without deterministic validation, generated cases cannot be trusted as release evidence.",
    whatIOwned: [
      "Five-layer pipeline architecture (input_resolver, requirement_analyzer, prompt_builder, llm_adapter, response_parser, validator, csv_exporter) with strict layer ownership",
      "Deterministic coverage profiles (minimal, comprehensive, extra) with the invariant Minimal ⊆ Comprehensive ⊆ Extra",
      "Scenario-level traceability through requirement_ref and scenario_ref in the 12-column traceable CSV schema",
      "Coverage auditing with targeted backfill, bounded batch generation, and complete/partial/failed outcome semantics",
      "UnresolvedBaselineItem contract: applicable baseline dimensions without product evidence are retained, never dropped or fabricated",
    ],
    risksHandled: [
      "LLM hallucination risk: generated steps and expected results are constrained to the supplied scenario intent by hardened provider response contracts",
      "Traceability loss: requirement IDs and scenario references survive from source document to CSV export",
      "False coverage confidence: partial output is reported as partial, never silently promoted to complete",
      "Silent baseline erosion: unsupported baseline dimensions surface as explicit unresolved records instead of disappearing",
    ],
    decisionImpact: [
      "Release-relevant test design becomes faster while staying anchored to verified requirement evidence",
      "Generated cases carry traceability required for defensible QA decisions",
      "Coverage claims remain honest because completeness is audited deterministically, not asserted by the model",
    ],
    evidence: buildGitHubRepoEvidence("ai-test-case-generator", [
      ["GitHub repo", ""],
      ["README — pipeline & schema", "README.md"],
      ["CHANGELOG — versioned evidence", "CHANGELOG.md"],
      ["CONTRIBUTING — code standards", "CONTRIBUTING.md"],
    ]),
    tags: [
      "Test Design",
      "BYOK",
      "Coverage Auditing",
      "Traceability",
      "Python",
      "FastAPI",
    ],
  },
  {
    id: "playwright-quality-framework",
    title: "Playwright Quality Framework",
    variant: "decision-system",
    domain: "Automation Architecture & AI Boundary Governance",
    context:
      "Open-source Playwright framework that turns recorded flows into architecture-compliant automation. The framework separates authoritative Playwright results from advisory-only AI triage, so the deterministic test oracle is never delegated to a model. Policy-as-code (ESLint flat config) enforces layer ownership: tests own assertions, pages own locators, fixtures own setup.",
    problem:
      "Automation frameworks drift: locators leak into specs, fixtures grow god-object tendencies, and AI features quietly start deciding outcomes. When a model can influence PASS/FAIL, the test stops being evidence and becomes opinion. The framework's problem is keeping the deterministic oracle and the advisory layer on opposite sides of a hard boundary.",
    whatIOwned: [
      "Record → Agent → Validate → Demo workflow: codegen evidence normalized into canonical ownership (tests/e2e, src/pages, src/data, src/fixtures)",
      "Fixture gateway at src/fixtures/test.fixture.js with a 4-level escalation rule and explicit confirmation gates for Level 3/4 fixtures",
      "Policy-as-code enforcement via ESLint flat config: specs cannot import @playwright/test directly, layer boundaries are lint errors",
      "Advisory-only AI triage (src/ai/triage.js): Zod-validated classification of existing Playwright failure evidence, never test status",
      "Deterministic fallbacks: missing API keys, provider failures, and malformed output degrade to INCONCLUSIVE with low confidence, never to a verdict",
    ],
    risksHandled: [
      "AI boundary violation: AI must not call expect, alter expected values, skip tests, heal selectors, or modify Playwright status — failed remains failed",
      "Oracle drift: expected business values stay inside test specs, not Page Objects, fixtures, or data modules",
      "Anti-hallucination: the agent never invents expected text, status, database values, or business rules; missing oracle information is reported, not fabricated",
      "Fixture over-engineering: Level escalation only when justified per level, with explicit teardown and reverse-order cleanup for Level 4",
    ],
    decisionImpact: [
      "Playwright results stay authoritative: PASS/FAIL belongs to Playwright alone, AI triage adds classification and confidence, never a verdict",
      "INCONCLUSIVE is a triage classification, not a Playwright status — the boundary is explicit and machine-checked",
      "Release evidence stays credible because automation defects, environment failures, and product bugs are classified without touching the oracle",
    ],
    evidence: buildGitHubRepoEvidence("playwright-quality-framework", [
      ["GitHub repo", ""],
      ["QUICKSTART — Record→Validate flow", "docs/QUICKSTART.md"],
      ["AGENT_TASK_TEMPLATE — agent input contract", "docs/AGENT_TASK_TEMPLATE.md"],
      ["AGENTS.md — architecture ownership rules", "AGENTS.md"],
      ["AI_USAGE.md — AI boundary & fallbacks", "AI_USAGE.md"],
    ]),
    tags: [
      "Playwright",
      "Policy-as-Code",
      "AI Boundary",
      "Page Objects",
      "Fixture Gateway",
      "JavaScript",
    ],
  },
];

export const projects = enterpriseCaseStudies;
