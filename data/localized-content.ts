import type { Locale } from "@/data/i18n";
import type { FrameworkBlock } from "@/data/framework";
import {
  frameworkBlocks,
  frameworkClosingPrinciple,
  frameworkCorePositioning,
  frameworkIntroduction,
  frameworkNote,
  frameworkReleaseDecisionRules,
  frameworkUsage,
} from "@/data/framework";
import type { PortfolioProject } from "@/data/projects";
import {
  antiPatternsSection,
  decisionPatternsSection,
  decisionPrinciplesSection,
  problemBreakdownSection,
  riskThinkingModelSection,
  thinkingFinalThought,
  thinkingPageHeader,
  thinkingSnapshotSection,
} from "@/data/thinking";
import {
  realDecisionCaseFields,
  realDecisionCasePlaceholderLabel,
  realDecisionCaseStructure,
  realDecisionCaseStructureTitle,
  realDecisionCasesFooterNote,
  realDecisionCasesIntro,
  realDecisionCasesPrinciple,
  reservedDecisionCases,
} from "@/data/real-decision-cases";
import { assistantConfig } from "@/data/assistant";

type ProjectContent = Partial<
  Pick<
    PortfolioProject,
    | "title"
    | "tags"
    | "domain"
    | "context"
    | "problem"
    | "whatIOwned"
    | "risksHandled"
    | "decisionImpact"
    | "businessImpact"
    | "decisionProblem"
    | "whatThisSystemChanged"
  >
>;

interface ProjectJourneyContent {
  eyebrow: string;
  title: string;
  description: string;
  lanes: {
    enterprise: string;
    builtSystem: string;
  };
  detailMapLabel: string;
  panelTitles: {
    context: string;
    problem: string;
    ownership: string;
    risk: string;
    decision: string;
    systemChange: string;
    impact: string;
    business: string;
  };
  footerPrimary: string;
  footerSecondary: string;
  evidenceLabels: Record<string, string>;
}

interface FrameworkContent {
  heading: {
    eyebrow: string;
    title: string;
    description: string;
  };
  positioningLabel: string;
  introduction: string[];
  corePositioning: string[];
  blocks: FrameworkBlock[];
  activeStepLabel: string;
  checkpointLabel: string;
  releaseRulesTitle: string;
  releaseRulesDescription: string;
  releaseDecisionRules: string[];
  whereUsedTitle: string;
  whereUsedDescription: string;
  usageLabels: string[];
  usage: string[];
  finalPrincipleLabel: string;
  closingPrinciple: string;
  note: string;
}

interface ThinkingMapItem {
  title: string;
  description?: string;
  points?: string[];
}

interface ThinkingMapBranch {
  id: string;
  phase: string;
  eyebrow: string;
  title: string;
  description: string;
  items: ThinkingMapItem[];
}

interface ThinkingContent {
  pageSubtitle: string;
  pageStatements: string[];
  mapEyebrow: string;
  mapTitle: string;
  mapDescription: string;
  rootLabel: string;
  rootTitle: string;
  branchLabel: string;
  nodesLabel: string;
  nodeLabel: string;
  footerLabels: string[];
  branches: ThinkingMapBranch[];
}

type DecisionCaseFieldKey = "theme" | "plannedEvidence" | "publicationCondition";

interface LocalizedDecisionCase {
  id: string;
  title: string;
  status: string;
  theme: string;
  plannedEvidence: string;
  publicationCondition: string;
  isPublished: boolean;
}

interface RealDecisionContent {
  intro: typeof realDecisionCasesIntro;
  structureTitle: string;
  structure: typeof realDecisionCaseStructure;
  fields: ReadonlyArray<{
    key: DecisionCaseFieldKey;
    label: string;
  }>;
  placeholderLabel: string;
  cases: LocalizedDecisionCase[];
  principle: typeof realDecisionCasesPrinciple;
  footerNote: string;
  labels: {
    decisionMap: string;
    mapInstruction: string;
    rootNode: string;
    closedRootInstruction: string;
    revealBranches: string;
    collapseMap: string;
    expandedDetail: string;
    evidenceSlots: string;
    evidenceSlotsTitle: string;
    publicSafe: string;
    publishedCase: string;
    zoomOut: string;
    zoomIn: string;
    resetZoom: string;
    detailChips: string[];
  };
}

interface AboutLocalizedContent {
  experience: Record<
    string,
    {
      role?: string;
      companyLine?: string;
      location?: string;
      summary: string;
      focusItems: string[];
      closingNote?: string;
    }
  >;
  education: Record<
    string,
    {
      degree: string;
      note: string;
    }
  >;
  hardSkillGroups: Record<
    string,
    {
      title: string;
      items: string[];
    }
  >;
  personalFoundation: string[];
}

interface AssistantLocalizedContent {
  title: string;
  badge: string;
  description: string;
  compactDescription: string;
  placeholder: string;
  workspacePlaceholder: string;
  quickQuestions: string[];
  suggestedPrompts: string;
  sampleMessage: string;
  loadingLabel: string;
  errorMessage: string;
  disclaimer: string;
  knowledgeDomainsLabel: string;
  knowledgeDomains: string[];
  newSession: string;
  send: string;
  status: {
    offline: string;
    thinking: string;
    active: string;
  };
  emptyTitle: string;
  emptyDescription: string;
  workspaceLabel: string;
  aria: {
    open: string;
    close: string;
    expand: string;
    closeWorkspace: string;
    send: string;
  };
}

interface LocalizedPortfolioContent {
  projectJourney: ProjectJourneyContent;
  projects: Record<string, ProjectContent>;
  framework: FrameworkContent;
  thinking: ThinkingContent;
  realDecision: RealDecisionContent;
  about: AboutLocalizedContent;
  assistant: AssistantLocalizedContent;
}

const englishThinkingBranches: ThinkingMapBranch[] = [
  {
    id: "principles",
    phase: "01",
    eyebrow: decisionPrinciplesSection.eyebrow,
    title: decisionPrinciplesSection.title,
    description:
      "The foundational rules used before any release decision is trusted.",
    items: decisionPrinciplesSection.items,
  },
  {
    id: "breakdown",
    phase: "02",
    eyebrow: problemBreakdownSection.eyebrow,
    title: problemBreakdownSection.title,
    description:
      "A gradual path for turning an ambiguous problem into visible decision boundaries.",
    items: problemBreakdownSection.items,
  },
  {
    id: "risk-model",
    phase: "03",
    eyebrow: riskThinkingModelSection.eyebrow,
    title: riskThinkingModelSection.title,
    description: riskThinkingModelSection.description ?? "",
    items: riskThinkingModelSection.items,
  },
  {
    id: "decision-patterns",
    phase: "04",
    eyebrow: decisionPatternsSection.eyebrow,
    title: decisionPatternsSection.title,
    description: decisionPatternsSection.description ?? "",
    items: decisionPatternsSection.items,
  },
  {
    id: "anti-patterns",
    phase: "05",
    eyebrow: antiPatternsSection.eyebrow,
    title: antiPatternsSection.title,
    description: antiPatternsSection.description ?? "",
    items: antiPatternsSection.items,
  },
  {
    id: "snapshot",
    phase: "06",
    eyebrow: thinkingSnapshotSection.eyebrow,
    title: thinkingSnapshotSection.title,
    description: thinkingSnapshotSection.description ?? "",
    items: thinkingSnapshotSection.items,
  },
  {
    id: "closing",
    phase: "07",
    eyebrow: "Closing statement",
    title: thinkingFinalThought.title,
    description:
      "The final decision lens that ties the branches back into release judgment.",
    items: [
      {
        title: "Release judgment",
        description: thinkingFinalThought.description,
      },
    ],
  },
];

const englishAssistantContent: AssistantLocalizedContent = {
  title: assistantConfig.title,
  badge: assistantConfig.badge,
  description: assistantConfig.description,
  compactDescription: "Architectural reasoning assistant",
  placeholder: "Ask about projects, QA thinking, or contact...",
  workspacePlaceholder: "Ask Clarity AI about this portfolio...",
  quickQuestions: [...assistantConfig.quickQuestions],
  suggestedPrompts: "Suggested prompts",
  sampleMessage: assistantConfig.sampleMessages[0].content,
  loadingLabel: assistantConfig.loadingLabel,
  errorMessage: assistantConfig.errorMessage,
  disclaimer: "Clarity AI may produce inaccurate information.",
  knowledgeDomainsLabel: "Knowledge domains",
  knowledgeDomains: [
    "Portfolio Overview",
    "Projects",
    "QA Thinking",
    "About Hambali",
    "Contact",
  ],
  newSession: "New Session",
  send: "Send",
  status: {
    offline: "AI Offline",
    thinking: "AI Thinking",
    active: "AI Active",
  },
  emptyTitle: "Portfolio context, structured for decisions.",
  emptyDescription:
    "Projects, QA thinking, background, and contact paths are available as focused knowledge domains.",
  workspaceLabel: "Portfolio reasoning workspace",
  aria: {
    open: "Open Clarity AI",
    close: "Close Clarity AI",
    expand: "Expand Clarity AI",
    closeWorkspace: "Close Clarity AI workspace",
    send: "Send message",
  },
};

export const localizedContent: Record<Locale, LocalizedPortfolioContent> = {
  en: {
    projectJourney: {
      eyebrow: "Project cartography",
      title: "A journey through systems, risks, and release decisions.",
      description:
        "Each node can expand into the decision structure behind the work: context, ambiguity, risk handled, ownership, and impact.",
      lanes: {
        enterprise: "Enterprise",
        builtSystem: "Built System",
      },
      detailMapLabel: "Detail map",
      panelTitles: {
        context: "Context",
        problem: "Decision problem",
        ownership: "What I owned",
        risk: "Risks handled",
        decision: "Decision problem",
        systemChange: "System changed",
        impact: "Decision impact",
        business: "Business impact",
      },
      footerPrimary: "Journey opens by decision node",
      footerSecondary: "Public-safe detail, release-focused structure",
      evidenceLabels: {
        "GitHub repo": "GitHub repo",
        "Demo / workflow": "Demo / workflow",
        "Sample output": "Sample output",
      },
    },
    projects: {},
    framework: {
      heading: {
        eyebrow: "Framework / decision model",
        title: "Release Decision Integrity Framework",
        description:
          "A production-grade decision model for ambiguous, cross-module, business-critical systems.",
      },
      positioningLabel: "Positioning",
      introduction: frameworkIntroduction,
      corePositioning: frameworkCorePositioning,
      blocks: frameworkBlocks,
      activeStepLabel: "Active step",
      checkpointLabel: "Checkpoint",
      releaseRulesTitle: "Release decision rules",
      releaseRulesDescription:
        "Open only when you want the hard stop conditions.",
      releaseDecisionRules: frameworkReleaseDecisionRules,
      whereUsedTitle: "Where it is used",
      whereUsedDescription:
        "Select one system area at a time instead of reading a full block.",
      usageLabels: ["Billing", "Workflow", "Transaction", "Monitoring"],
      usage: frameworkUsage,
      finalPrincipleLabel: "Final principle",
      closingPrinciple: frameworkClosingPrinciple,
      note: frameworkNote,
    },
    thinking: {
      pageSubtitle: thinkingPageHeader.subtitle,
      pageStatements: thinkingPageHeader.statements,
      mapEyebrow: "Decision flow map",
      mapTitle: "Explore the branches behind release judgment.",
      mapDescription:
        "A Notebook-style map for moving from principles to problem breakdown, risk, release patterns, and final decision clarity.",
      rootLabel: "Root node",
      rootTitle: "Release decision clarity",
      branchLabel: "Branch",
      nodesLabel: "nodes",
      nodeLabel: "Node",
      footerLabels: ["Clarify", "Branch", "Decide"],
      branches: englishThinkingBranches,
    },
    realDecision: {
      intro: realDecisionCasesIntro,
      structureTitle: realDecisionCaseStructureTitle,
      structure: realDecisionCaseStructure,
      fields: realDecisionCaseFields,
      placeholderLabel: realDecisionCasePlaceholderLabel,
      cases: reservedDecisionCases,
      principle: realDecisionCasesPrinciple,
      footerNote: realDecisionCasesFooterNote,
      labels: {
        decisionMap: "Decision map",
        mapInstruction: "Click the root node to reveal the branches.",
        rootNode: "Root node",
        closedRootInstruction: "Click to open the decision tree.",
        revealBranches: "Reveal branches",
        collapseMap: "Collapse map",
        expandedDetail: "Expanded detail",
        evidenceSlots: "Evidence slots",
        evidenceSlotsTitle: "Reserved cases expand only when the reader asks.",
        publicSafe: "Public-safe",
        publishedCase: "Published decision case",
        zoomOut: "Zoom out decision map",
        zoomIn: "Zoom in decision map",
        resetZoom: "Reset decision map zoom",
        detailChips: ["Risk", "Proof", "Owner"],
      },
    },
    about: {
      experience: {},
      education: {},
      hardSkillGroups: {},
      personalFoundation: [],
    },
    assistant: englishAssistantContent,
  },
  id: {
    projectJourney: {
      eyebrow: "Kartografi proyek",
      title: "Perjalanan sistem, risiko, dan keputusan /release/.",
      description:
        "Setiap simpul dapat dibuka menjadi struktur keputusan di balik pekerjaannya: konteks, ambiguitas, risiko yang ditangani, kepemilikan, dan dampak.",
      lanes: {
        enterprise: "/Enterprise/",
        builtSystem: "Sistem yang Dibangun",
      },
      detailMapLabel: "Peta detail",
      panelTitles: {
        context: "Konteks",
        problem: "Masalah keputusan",
        ownership: "Yang saya kendalikan",
        risk: "Risiko yang ditangani",
        decision: "Masalah keputusan",
        systemChange: "Perubahan sistem",
        impact: "Dampak keputusan",
        business: "Dampak bisnis",
      },
      footerPrimary: "Perjalanan dibuka melalui simpul keputusan",
      footerSecondary: "Detail aman publik, struktur berfokus pada /release/",
      evidenceLabels: {
        "GitHub repo": "Repo GitHub",
        "Demo / workflow": "Demo /workflow/",
        "Sample output": "Contoh output",
      },
    },
    projects: {
      "billing-calculation-system": {
        title: "Sistem /Billing/ & Kalkulasi",
        domain: "Kalkulasi /Billing/ & Pendapatan /Enterprise/",
        context:
          "Platform /billing/ enterprise yang menangani harga, konversi pemakaian, dan logika biaya bertingkat, di mana ketepatan kalkulasi langsung memengaruhi pengakuan pendapatan dan kepercayaan finansial. Sistem berjalan lintas modul yang saling terhubung, sehingga satu perubahan aturan dapat mengubah hasil /billing/ di alur berikutnya.",
        problem:
          "Aturan bisnis terkait harga dan perilaku biaya masih ambigu serta ditafsirkan tidak konsisten antar modul, sehingga membuka risiko hasil /billing/ yang salah dan keputusan /release/ yang tidak andal.",
        whatIOwned: [
          "Mendefinisikan /business invariant/ yang tidak boleh dilanggar oleh perilaku harga, biaya, dan konversi",
          "Menetapkan batas kalkulasi lintas modul agar kepemilikan atas ketepatan menjadi eksplisit",
          "Mengarahkan fokus pada ambiguitas di skenario biaya berdampak tinggi sebelum /release/",
          "Mengontrol kesiapan /release/ melalui checkpoint kalkulasi dan /decision gate/ yang terhubung dengan risiko pendapatan",
        ],
        risksHandled: [
          "Kesalahan finansial akibat pembentukan biaya yang tidak tepat",
          "Penyimpangan lintas modul antara logika harga, logika konversi, dan output /billing/",
          "Kegagalan diam-diam ketika perilaku /billing/ yang salah lolos ke produksi tanpa terdeteksi",
        ],
        decisionImpact: [
          "Memperkuat keputusan /release/ dengan membuat risiko kalkulasi eksplisit sebelum persetujuan",
          "Meningkatkan keyakinan bahwa perilaku sistem sesuai aturan bisnis penagihan yang dimaksud",
          "Mengurangi kemungkinan menyetujui /release/ dengan ambiguitas pendapatan yang belum selesai",
        ],
        businessImpact: [
          "Melindungi akurasi pendapatan dan mengurangi paparan kerugian bisnis terkait /billing/",
          "Meningkatkan keandalan alur kalkulasi bisnis-kritis yang langsung memengaruhi kepercayaan pelanggan",
        ],
        tags: ["Logika Pendapatan", "Risiko Finansial", "Lintas Modul", "Kontrol /Release/"],
      },
      "field-operation-workflow-system": {
        title: "Sistem /Workflow/ Operasi Lapangan",
        domain: "/Workflow/ Operasional /Enterprise/",
        context:
          "Platform /workflow/ enterprise yang mengoordinasikan penugasan, transisi status, dan serah terima operasional lintas peran bisnis. Ketepatan /workflow/ penting karena perubahan status langsung membentuk eksekusi di lapangan.",
        problem:
          "Status /workflow/ dan aturan transisi menyimpan ambiguitas tersembunyi, sehingga modul dan peran yang berbeda dapat menafsirkan status operasional secara berbeda dan membuat eksekusi proses end-to-end tidak stabil.",
        whatIOwned: [
          "Mendefinisikan batas transisi status yang tidak boleh dilalui /workflow/ secara keliru",
          "Memperjelas hasil /workflow/ yang dapat diterima dan yang harus memblokir /release/",
          "Mengarahkan perhatian ke skenario status berisiko tinggi ketika maksud operasional dapat hilang",
          "Mengontrol kesiapan /release/ dengan mengaitkan penerimaan /workflow/ pada kontinuitas proses nyata, bukan perilaku fitur yang terisolasi",
        ],
        risksHandled: [
          "Kerusakan /workflow/ akibat transisi status yang tidak valid atau saling bertentangan",
          "Ketidaksesuaian lintas modul ketika makna status berubah antar sistem atau peran",
          "Kegagalan operasional diam-diam ketika progres status yang keliru mengganggu eksekusi setelah /release/",
        ],
        decisionImpact: [
          "Meningkatkan kontrol /release/ dengan membuat interpretasi risiko /workflow/ lebih konsisten",
          "Meningkatkan keyakinan bahwa perilaku berbasis status mencerminkan maksud proses bisnis nyata",
          "Mengurangi peluang menyetujui /release/ dengan serah terima operasional yang tidak stabil",
        ],
        businessImpact: [
          "Melindungi kontinuitas operasional dan mengurangi gangguan pada eksekusi berbasis peran",
          "Meningkatkan keandalan proses yang bergantung pada /workflow/ untuk mendukung operasi lapangan",
        ],
        tags: ["Governance /Workflow/", "Integritas Status", "Operasi", "Risiko /Release/"],
      },
      "integrated-transaction-system": {
        title: "Sistem /Transaction/ Terintegrasi",
        domain: "Pemrosesan /Transaction/ Lintas Modul",
        context:
          "Ekosistem /transaction/ yang mengoordinasikan alur pesanan, tahap pemrosesan, dan pembaruan lanjutan lintas sistem yang terhubung. Ketepatan bergantung pada propagasi status yang konsisten dan perilaku yang andal di setiap checkpoint.",
        problem:
          "Kegagalan parsial dan kepemilikan yang terfragmentasi membuat kelengkapan /transaction/ sulit dipastikan, sehingga tidak jelas apakah sistem tetap benar dalam kondisi gagal.",
        whatIOwned: [
          "Mendefinisikan checkpoint /transaction/ yang menentukan apakah pemrosesan tetap dapat dipercaya lintas batas",
          "Menetapkan fokus /QA/ pada jalur integrasi yang berisiko bisnis paling tinggi jika terjadi inkonsistensi",
          "Membingkai keputusan /release/ pada integritas /transaction/, bukan keberhasilan modul yang terisolasi",
          "Membangun bukti keputusan untuk menilai apakah sistem aman membawa beban /transaction/ ke /release/",
        ],
        risksHandled: [
          "Inkonsistensi /transaction/ lintas modul dan sistem lanjutan",
          "Status /transaction/ yang salah atau menyesatkan pada checkpoint bisnis kritis",
          "Jalur kegagalan tersembunyi ketika keberhasilan parsial menutupi pemrosesan end-to-end yang rusak",
        ],
        decisionImpact: [
          "Meningkatkan keputusan /release/ dengan mengekspos risiko /transaction/ sebelum persetujuan deployment",
          "Meningkatkan keyakinan terhadap ketepatan end-to-end lintas batas modul",
          "Mengurangi kemungkinan rilis dengan kondisi gagal integrasi yang belum diselesaikan",
        ],
        businessImpact: [
          "Melindungi keandalan /transaction/ pada proses yang terkait dengan pelanggan dan operasi bisnis",
          "Mengurangi risiko operasional akibat hasil pemrosesan yang tidak konsisten lintas sistem",
        ],
        tags: ["Integritas /Transaction/", "Batas Sistem", "Kesiapan /Release/", "Risiko Operasional"],
      },
      "object-storage-platform": {
        title: "Platform /Object Storage/",
        domain: "Keandalan Infrastruktur & Integritas Data",
        context:
          "Platform /object storage/ yang mendukung ketersediaan, integritas, dan kontinuitas bagi sistem yang bergantung pada persistensi data yang stabil. Kesehatan platform berdampak langsung pada perilaku aplikasi lanjutan dan ketahanan operasional.",
        problem:
          "Ketidakstabilan storage menciptakan rasa percaya di lapisan atas yang terlihat sehat, tetapi diam-diam menaikkan risiko pada keandalan data dan kontinuitas operasional di lapisan bawah.",
        whatIOwned: [
          "Membingkai perilaku infrastruktur sebagai input keputusan kualitas, bukan urusan operasional terpisah",
          "Mendefinisikan batas antara degradasi platform yang dapat diterima dan risiko keandalan yang harus memblokir /release/",
          "Mengeskalasi perhatian pada insiden ketika sinyal storage dapat mengganggu ketepatan aplikasi",
          "Menghubungkan temuan infrastruktur dengan penilaian /release/ dan kesiapan operasional tingkat sistem",
        ],
        risksHandled: [
          "Penurunan integritas data yang memengaruhi perilaku aplikasi bisnis-kritis",
          "Ketidakstabilan lintas lapisan ketika masalah storage merambat menjadi kegagalan aplikasi",
          "Erosi keandalan diam-diam yang baru terlihat setelah /release/ di bawah beban operasional",
        ],
        decisionImpact: [
          "Meningkatkan kontrol /release/ dengan memasukkan keandalan infrastruktur ke dalam penilaian kualitas",
          "Meningkatkan keyakinan bahwa sistem lanjutan tidak dirilis di atas fondasi yang tidak stabil",
          "Mengurangi risiko menyetujui perubahan ketika integritas platform masih tidak pasti",
        ],
        businessImpact: [
          "Melindungi kontinuitas layanan dan kepercayaan pada sistem yang bergantung pada keandalan storage",
          "Memperkuat ketahanan sistem secara keseluruhan dengan memperlakukan risiko infrastruktur sebagai bagian dari kepemilikan kualitas",
        ],
        tags: ["Integritas Data", "Keandalan Platform", "Ketahanan Sistem", "Kontinuitas Operasional"],
      },
      "vulnerability-monitoring-platform": {
        title: "Platform /Vulnerability Monitoring/",
        domain: "/Security Monitoring/ & Visibilitas Risiko",
        context:
          "Platform /monitoring/ yang digunakan untuk menampilkan temuan keamanan, status remediasi, dan visibilitas risiko lintas aset digital. Kualitas keputusan bergantung pada apakah output /monitoring/ dapat dipercaya sebagai informasi yang terkini dan akurat.",
        problem:
          "Data /monitoring/ yang tidak konsisten dan basi melemahkan keyakinan terhadap visibilitas risiko, sehingga keputusan dapat dibuat berdasarkan informasi keamanan yang menyesatkan.",
        whatIOwned: [
          "Mendefinisikan batas kualitas untuk menentukan output /monitoring/ yang cukup tepercaya sebagai dasar keputusan",
          "Membingkai konsistensi dan kesegaran data sebagai kondisi kualitas yang kritis untuk /release/, bukan sekadar detail laporan",
          "Mengarahkan fokus pada output yang kritis bagi keputusan ketika /monitoring/ yang tidak akurat dapat mengubah penilaian risiko",
          "Mengontrol kriteria penerimaan berdasarkan apakah platform dapat diandalkan untuk dukungan keputusan operasional",
        ],
        risksHandled: [
          "Visibilitas risiko yang salah akibat output /monitoring/ yang tidak konsisten",
          "Inkonsistensi lintas sumber antara temuan dasar dan data keputusan yang ditampilkan",
          "Kegagalan diam-diam ketika data basi terlihat valid dan menyesatkan penilaian operasional",
        ],
        decisionImpact: [
          "Meningkatkan penilaian /release/ dengan membuat batas kepercayaan terhadap output /monitoring/ menjadi eksplisit",
          "Meningkatkan keyakinan bahwa informasi risiko yang ditampilkan mencerminkan kondisi sistem nyata",
          "Mengurangi peluang menyetujui perubahan yang menurunkan visibilitas kritis untuk keputusan",
        ],
        businessImpact: [
          "Memperkuat kepercayaan pada data /monitoring/ yang dipakai untuk keputusan risiko dan remediasi",
          "Meningkatkan keandalan platform yang mendukung kesadaran keamanan dan prioritas operasional",
        ],
        tags: ["Visibilitas Keamanan", "Dukungan Keputusan", "Kepercayaan Data", "Governance /Monitoring/"],
      },
      "ai-qa-automation-platform": {
        title: "Platform /AI QA Automation/",
        decisionProblem: [
          "Keputusan /QA/ terlalu bergantung pada interpretasi manual, sehingga intake defect, triage, dan follow-up tidak konsisten antar proyek",
          "Sinyal kualitas penting tersebar di percakapan dan penilaian personal, meningkatkan risiko keputusan /release/ terlambat dan penanganan defect tidak merata",
        ],
        whatThisSystemChanged: [
          "Mengubah penanganan /QA/ dari aktivitas ad hoc menjadi alur keputusan terstruktur dengan intake, klasifikasi, dan follow-up yang konsisten",
          "Membuat cara berulang untuk mengubah pengetahuan kualitas yang tersebar menjadi dukungan keputusan yang dapat digunakan kembali",
          "Mengurangi ambiguitas tentang bagaimana issue bergerak dari sinyal menjadi aksi, terutama ketika banyak proyek bersaing mendapatkan perhatian",
        ],
        decisionImpact: [
          "Keputusan /release/ menjadi lebih andal karena sinyal issue distrukturkan lebih awal dengan konteks yang lebih jelas",
          "Prioritas defect menjadi lebih aman karena kualitas klasifikasi tidak lagi sepenuhnya bergantung pada interpretasi manual",
          "Risiko operasional berkurang dengan membatasi hilangnya pengetahuan, triage yang tidak konsisten, dan penanganan /QA/ yang terfragmentasi",
        ],
        tags: ["Sistem Keputusan", "Operasi /QA/", "Alur Pengetahuan", "Dukungan /Release/"],
      },
      "telegram-qa-bug-tracker-bot": {
        title: "Bot Telegram /QA Bug Tracker/",
        decisionProblem: [
          "Informasi defect di chat tim sulit dipercaya sebagai dasar aksi karena tidak terstruktur, berulang, dan mudah hilang",
          "Tim tidak memiliki cara yang dapat diandalkan untuk membedakan noise, laporan berulang, dan issue yang harus memengaruhi kesiapan /release/",
        ],
        whatThisSystemChanged: [
          "Mengubah sinyal chat informal menjadi catatan defect terstruktur yang mendukung keputusan yang dapat ditelusuri",
          "Membuat batas yang lebih jelas antara diskusi santai dan pelaporan issue yang dapat ditindaklanjuti",
          "Mengurangi ambiguitas tentang cara tim menangkap, mengklasifikasikan, dan mengikuti defect dari laporan awal sampai tracking",
        ],
        decisionImpact: [
          "Diskusi /release/ menjadi lebih aman karena visibilitas issue tidak terlalu bergantung pada memori dan riwayat chat",
          "Penanganan defect menjadi lebih andal dengan mengurangi laporan duplikat dan catatan yang hilang",
          "Risiko operasional turun karena tim dapat bertindak pada informasi defect yang lebih konsisten dengan traceability yang lebih kuat",
        ],
        tags: ["Sistem Keputusan", "Intake Defect", "Traceability", "Visibilitas /Release/"],
      },
      "qa-workflow-automation-engine": {
        title: "Mesin Otomasi /QA Workflow/",
        decisionProblem: [
          "Kontrol proses /QA/ lemah karena sinyal penting, alert, dan langkah follow-up tersebar di tools yang tidak terhubung dan koordinasi manual",
          "Langkah validasi penting dapat tertunda atau terlewat, menciptakan ketidakpastian atas kelengkapan proses dan keyakinan /release/",
        ],
        whatThisSystemChanged: [
          "Membingkai ulang /QA workflow/ sebagai sistem keputusan terkendali, bukan rangkaian tugas manual yang terisolasi",
          "Membangun jalur terstruktur tentang bagaimana sinyal /QA/ bergerak, dieskalasi, dan memicu aksi lanjutan",
          "Mengurangi ketergantungan pada koordinasi individu dengan membuat alur proses lebih eksplisit dan dapat diulang",
        ],
        decisionImpact: [
          "Keputusan tingkat proses menjadi lebih cepat karena sinyal /QA/ datang dengan waktu dan routing yang lebih jelas",
          "Kontrol /release/ menjadi lebih aman dengan mengurangi langkah yang terlewat dan koordinasi yang terfragmentasi di alur /QA/",
          "Risiko operasional berkurang karena sistem meningkatkan visibilitas apakah aksi /QA/ kritis benar-benar terjadi sebelum keputusan dibuat",
        ],
        tags: ["Sistem Keputusan", "Kontrol Proses", "Orkestrasi Sinyal", "Keandalan Eksekusi"],
      },
    },
    framework: {
      heading: {
        eyebrow: "/Framework/ dan model keputusan",
        title: "/Release Decision Integrity Framework/",
        description:
          "Model keputusan tingkat produksi untuk sistem ambigu, lintas modul, dan bisnis-kritis.",
      },
      positioningLabel: "Posisi",
      introduction: [
        "Testing saja tidak cukup untuk memberi otorisasi /release/ pada sistem enterprise.",
        "Ketika ada ambiguitas, dependency tersembunyi, dan dampak bisnis, /release/ harus dikendalikan oleh aturan keputusan eksplisit, bukan volume aktivitas atau rasa percaya di permukaan.",
        "/Framework/ ini adalah model produksi untuk mengubah ketidakpastian menjadi penilaian /release/ yang terkendali.",
      ],
      corePositioning: [
        "/QA/ tradisional dapat menemukan defect. Namun sendirian, ia tidak cukup untuk melindungi integritas /release/.",
        "Ketika batas keputusan tidak jelas, tim bukan mengirim confidence. Mereka mengirim asumsi.",
        "/Framework/ ini memaksa /invariant/ eksplisit, risiko eksplisit, bukti eksplisit, dan otoritas /release/ eksplisit.",
      ],
      blocks: [
        {
          title: "Definisi /Invariant/",
          summary:
            "Tetapkan aturan bisnis yang tidak boleh dilanggar sistem. Pada sistem ambigu, /invariant/ menjadi jangkar penilaian /release/ sebelum diskusi validasi dimulai.",
          steps: [
            "Identifikasi aturan bisnis yang tidak dapat dinegosiasikan",
            "Tetapkan hal yang tidak boleh rusak dalam kondisi apa pun",
            "Tentukan sinyal yang membuktikan aturan itu masih terpenuhi",
          ],
        },
        {
          title: "Identifikasi Risiko",
          summary:
            "Ungkap area ketika kegagalan dapat tetap tidak terlihat sampai dampak bisnis sudah terjadi. Fokusnya adalah ambiguitas, kegagalan diam-diam, dependency lintas modul, detectability, dan impact.",
          steps: [
            "Munculkan ambiguitas sebelum masuk ke /release/",
            "Prioritaskan jalur kegagalan dengan detectability rendah dan impact tinggi",
            "Telusuri risiko dependency lintas batas modul dan sistem",
          ],
        },
        {
          title: "/QA Decision Tree/",
          summary:
            "Tempatkan tanggung jawab validasi pada area tempat risiko benar-benar terjadi. Pertanyaannya bukan apakah sesuatu sudah diuji, tetapi di mana bukti harus ada sebelum /release/ dipercaya.",
          steps: [
            "Tentukan apakah aturan cukup jelas untuk mengendalikan /release/",
            "Tetapkan bukti pada lapisan yang tepat: /UI/, /API/, database, atau /monitoring/",
            "Minta bukti dari batas tempat risiko bisnis menjadi nyata",
          ],
        },
        {
          title: "Batas /Scope/",
          summary:
            "Pisahkan bukti yang memblokir dari confidence pendukung. Kontrol /release/ membutuhkan batas keras antara validasi kritis, pemeriksaan pendukung, risiko yang diterima, dan follow-up /monitoring/.",
          steps: [
            "Tentukan apa yang langsung memblokir /release/",
            "Pisahkan validasi kritis dari pemeriksaan pendukung",
            "Buat risiko yang diterima menjadi eksplisit dan dapat dimonitor setelah /release/",
          ],
        },
      ],
      activeStepLabel: "Langkah aktif",
      checkpointLabel: "Checkpoint",
      releaseRulesTitle: "Aturan keputusan /release/",
      releaseRulesDescription:
        "Buka hanya ketika ingin melihat kondisi hard stop.",
      releaseDecisionRules: [
        "/Release/ harus diblokir ketika /invariant/ belum didefinisikan.",
        "/Release/ harus diblokir ketika risiko berdampak tinggi tidak memiliki sinyal validasi yang andal.",
        "/Release/ harus diblokir ketika konsistensi lintas modul tidak dapat dibuktikan.",
        "/Release/ harus diblokir ketika ketepatan sistem bergantung pada asumsi, bukan bukti.",
      ],
      whereUsedTitle: "Area penggunaan",
      whereUsedDescription:
        "Pilih satu area sistem pada satu waktu tanpa membaca blok panjang sekaligus.",
      usageLabels: ["/Billing/", "/Workflow/", "/Transaction/", "/Monitoring/"],
      usage: [
        "Pada sistem /billing/ dan kalkulasi, model ini mencegah /release/ ketika aturan finansial tidak dapat dibuktikan lintas harga, konversi, dan logika biaya.",
        "Pada sistem /workflow/, model ini mengontrol /release/ ketika transisi status dan serah terima peran masih ambigu lintas modul.",
        "Pada sistem /transaction/, model ini mengekspos jalur gagal tersembunyi dan memaksa bukti integritas sebelum pembaruan downstream dipercaya.",
        "Pada sistem /monitoring/ dan platform, model ini menentukan apakah output cukup tepercaya untuk mendukung keputusan operasional dan risiko.",
      ],
      finalPrincipleLabel: "Prinsip akhir",
      closingPrinciple:
        "Kualitas bukan jumlah testing coverage. Kualitas adalah kemampuan membuat keputusan /release/ yang benar dalam kondisi bisnis nyata. Asumsi adalah risiko. Risiko yang tidak didefinisikan adalah /release/ yang tidak terkendali.",
      note: "/Framework/ ini sedang diformalisasi dan akan dipublikasikan secara terbuka.",
    },
    thinking: {
      pageSubtitle:
        "Bagaimana keputusan kualitas dibuat di tengah ambiguitas, risiko, dan dampak bisnis nyata.",
      pageStatements: [
        "Bagian ini tidak hanya menjelaskan apa yang dibangun.",
        "Bagian ini menjelaskan bagaimana keputusan dibuat ketika testing saja tidak cukup.",
      ],
      mapEyebrow: "Peta alur keputusan",
      mapTitle: "Jelajahi cabang di balik penilaian /release/.",
      mapDescription:
        "Peta bergaya notebook untuk bergerak dari prinsip, pemecahan masalah, risiko, pola /release/, hingga kejelasan keputusan akhir.",
      rootLabel: "Simpul utama",
      rootTitle: "Kejelasan keputusan /release/",
      branchLabel: "Cabang",
      nodesLabel: "simpul",
      nodeLabel: "Simpul",
      footerLabels: ["Perjelas", "Cabangkan", "Putuskan"],
      branches: [
        {
          id: "principles",
          phase: "01",
          eyebrow: "Prinsip inti",
          title: "Prinsip Keputusan",
          description:
            "Aturan dasar yang dipakai sebelum keputusan /release/ dapat dipercaya.",
          items: [
            {
              title: "Testing bukan validasi",
              description:
                "Testing menunjukkan perilaku sistem. Validasi membuktikan ketepatan bisnis.",
            },
            {
              title: "Tidak ada defect bukan berarti terbukti aman",
              description:
                "Sistem bisa lolos semua test dan tetap gagal di produksi. Confidence harus datang dari /invariant/ dan bukti, bukan dari tidak adanya kegagalan.",
            },
            {
              title: "Ambiguitas adalah risiko tertinggi",
              description:
                "Kegagalan paling kritis sering bukan berasal dari bug, tetapi dari aturan yang tidak jelas, asumsi tersembunyi, dan ownership yang tidak didefinisikan.",
            },
            {
              title: "Kualitas adalah sistem keputusan",
              description:
                "Kualitas bukan fase testing. Kualitas adalah cara terstruktur untuk memutuskan apakah sistem aman untuk /release/.",
            },
          ],
        },
        {
          id: "breakdown",
          phase: "02",
          eyebrow: "Pemecahan masalah",
          title: "Cara Saya Memecah Masalah",
          description:
            "Jalur bertahap untuk mengubah masalah ambigu menjadi batas keputusan yang terlihat.",
          items: [
            {
              title: "Tujuan Bisnis",
              description:
                "Apa sebenarnya yang ingin dicapai sistem? Hasil apa yang harus dilindungi?",
            },
            {
              title: "Perilaku Sistem",
              description:
                "Bagaimana sistem menerapkan tujuan tersebut? Di mana ia bisa menyimpang secara diam-diam?",
            },
            {
              title: "Jalur Kegagalan",
              description:
                "Di mana kegagalan bisa terjadi tanpa langsung terdeteksi? Apa yang rusak nanti, bukan sekarang?",
            },
            {
              title: "Dependency Tersembunyi",
              description:
                "Sistem, data, atau proses eksternal apa yang memengaruhi ketepatan?",
            },
          ],
        },
        {
          id: "risk-model",
          phase: "03",
          eyebrow: "Model risiko",
          title: "Model Berpikir Risiko",
          description:
            "Risiko tidak hanya ditentukan oleh severity. Risiko ditentukan oleh visibility, impact, dan dependency.",
          items: [
            {
              title: "Ambiguitas",
              description: "Aturan yang tidak jelas menciptakan perilaku sistem yang tidak konsisten.",
            },
            {
              title: "Impact",
              description: "Kerusakan bisnis apa yang terjadi jika ini salah?",
            },
            {
              title: "Dependency",
              description: "Apakah ketepatan bergantung pada sistem atau proses lain?",
            },
            {
              title: "Detectability",
              description: "Apakah kegagalan langsung terlihat, atau baru muncul terlambat?",
            },
          ],
        },
        {
          id: "decision-patterns",
          phase: "04",
          eyebrow: "Pola keputusan",
          title: "Pola Keputusan",
          description:
            "Pola berulang yang digunakan saat membuat keputusan /release/.",
          items: [
            {
              title: "Kapan Memblokir /Release/",
              points: [
                "/Invariant/ belum didefinisikan",
                "Bukti tidak tersedia",
                "Sistem bergantung pada asumsi",
              ],
            },
            {
              title: "Kapan Mengizinkan /Conditional Release/",
              points: [
                "Risiko diketahui dan terisolasi",
                "/Monitoring/ sudah tersedia",
                "Bisnis menerima trade-off",
              ],
            },
            {
              title: "Kapan Melakukan Eskalasi",
              points: [
                "Inkonsistensi lintas modul",
                "Ownership tidak jelas",
                "Dampak bisnis tinggi",
              ],
            },
            {
              title: "Kapan Mengabaikan Noise",
              points: [
                "Issue tidak berdampak bisnis",
                "Sudah dimitigasi oleh desain",
                "Bukan bagian dari batas keputusan /release/",
              ],
            },
          ],
        },
        {
          id: "anti-patterns",
          phase: "05",
          eyebrow: "Anti-pattern",
          title: "Anti-Pattern dalam Berpikir /QA/",
          description: "Kesalahan umum yang menciptakan confidence palsu.",
          items: [
            {
              title: "Lebih banyak test case = lebih berkualitas",
              description: "Coverage tidak menjamin ketepatan.",
            },
            {
              title: "Pass = aman untuk /release/",
              description: "Test yang pass tidak memvalidasi risiko bisnis.",
            },
            {
              title: "Menguji semuanya",
              description: "Tanpa prioritas, testing berubah menjadi noise.",
            },
            {
              title: "/QA/ hanya sebagai eksekutor",
              description:
                "/QA/ harus memiliki kejelasan keputusan, bukan hanya eksekusi.",
            },
          ],
        },
        {
          id: "snapshot",
          phase: "06",
          eyebrow: "Cuplikan pemikiran",
          title: "Cuplikan Pemikiran",
          description:
            "Fragmen nyata dari reasoning yang digunakan saat mengambil keputusan. Bukan kasus lengkap, tetapi cara berpikir keputusan dalam aksi.",
          items: [
            {
              title: "Inkonsistensi kalkulasi /billing/",
              description:
                "Sistem lolos validasi rating, tetapi gagal pada agregasi /billing/ karena mapping kontrak hilang. Keputusan diblokir karena /financial invariant/ rusak.",
            },
          ],
        },
        {
          id: "closing",
          phase: "07",
          eyebrow: "Pernyataan penutup",
          title: "Pemikiran Akhir",
          description:
            "Lensa keputusan akhir yang mengikat cabang-cabang kembali pada penilaian /release/.",
          items: [
            {
              title: "Penilaian /release/",
              description:
                "Kualitas tidak diukur dari seberapa banyak yang diuji. Kualitas diukur dari apakah keputusan /release/ tetap benar dalam kondisi bisnis nyata.",
            },
          ],
        },
      ],
    },
    realDecision: {
      intro: {
        eyebrow: "KASUS KEPUTUSAN NYATA",
        title: "Kasus Keputusan Nyata",
        description:
          "Lapisan ini disiapkan untuk keputusan /release/ nyata yang didukung bukti aktual. Setiap kasus akan menghubungkan risiko bisnis, alasan keputusan, bukti validasi, dan ownership dalam format aman publik tanpa membuka detail implementasi rahasia.",
        supportingSentence:
          "Bukti hanya akan dilampirkan ketika referensi GitHub, workbook, log, dan catatan pendukung sudah dibersihkan, dianonimkan, dan siap dipublikasikan.",
      },
      structureTitle: "Setiap kasus keputusan nyata akan mengikuti struktur ini",
      structure: [
        {
          id: "context",
          title: "Konteks",
          description: "Apa yang berubah dan di mana keputusan berada",
        },
        {
          id: "decision-problem",
          title: "Masalah Keputusan",
          description: "Mengapa testing pass/fail saja tidak cukup",
        },
        {
          id: "business-invariant",
          title: "/Business Invariant/",
          description: "Hal yang tidak boleh dilanggar oleh sistem",
        },
        {
          id: "risk-identification",
          title: "Identifikasi Risiko",
          description: "Risiko bisnis atau sistem apa yang menjadi nyata jika salah",
        },
        {
          id: "validation-mapping",
          title: "Pemetaan Validasi",
          description: "Di mana bukti harus ada: /UI/, /API/, DB, /workflow/, atau /monitoring/",
        },
        {
          id: "decision-outcome",
          title: "Hasil Keputusan",
          description: "/GO/, /NO GO/, atau /CONDITIONAL/",
        },
        {
          id: "decision-rationale",
          title: "Alasan Keputusan",
          description: "Mengapa keputusan itu benar terhadap risiko bisnis",
        },
        {
          id: "evidence-ownership",
          title: "Bukti & Ownership",
          description: "Siapa pemilik risiko dan bukti apa yang mendukung penilaian",
        },
      ],
      fields: [
        { key: "theme", label: "Tema kasus" },
        { key: "plannedEvidence", label: "Bukti yang direncanakan" },
        { key: "publicationCondition", label: "Syarat publikasi" },
      ],
      placeholderLabel: "Disiapkan untuk publikasi berikutnya",
      cases: [
        {
          id: "reserved-decision-case-01",
          title: "Kasus Keputusan Cadangan 01",
          status: "Menunggu persiapan bukti",
          theme: "Akan ditautkan ketika disetujui untuk publikasi",
          plannedEvidence:
            "Referensi GitHub yang disanitasi, ekstrak workbook, log, screenshot, dan catatan validasi",
          publicationCondition:
            "Hanya setelah bukti lengkap, dianonimkan, dan aman dibagikan kepada publik",
          isPublished: false,
        },
        {
          id: "reserved-decision-case-02",
          title: "Kasus Keputusan Cadangan 02",
          status: "Menunggu persiapan bukti",
          theme: "Akan ditautkan ketika disetujui untuk publikasi",
          plannedEvidence:
            "Referensi GitHub yang disanitasi, ekstrak workbook, log, screenshot, dan catatan validasi",
          publicationCondition:
            "Hanya setelah bukti lengkap, dianonimkan, dan aman dibagikan kepada publik",
          isPublished: false,
        },
      ],
      principle: {
        title: "Prinsip publikasi",
        body: "Bagian ini tidak akan menggunakan narasi saja. Sebuah kasus hanya dipublikasikan ketika keputusan, risiko bisnis, ownership, dan bukti pendukung dapat dihubungkan dengan integritas, sementara artefak delivery internal yang rahasia tetap terlindungi.",
      },
      footerNote:
        "Fase berikutnya: kasus keputusan /release/ nyata akan ditautkan ke referensi GitHub yang disanitasi, arsip workbook, dan folder bukti hanya setelah persiapan, tinjauan integritas, dan pemeriksaan kerahasiaan selesai.",
      labels: {
        decisionMap: "Peta keputusan",
        mapInstruction: "Klik simpul utama untuk membuka cabang.",
        rootNode: "Simpul utama",
        closedRootInstruction: "Klik untuk membuka decision tree.",
        revealBranches: "Buka cabang",
        collapseMap: "Tutup peta",
        expandedDetail: "Detail terbuka",
        evidenceSlots: "Slot bukti",
        evidenceSlotsTitle: "Kasus cadangan hanya terbuka ketika pembaca memintanya.",
        publicSafe: "Aman publik",
        publishedCase: "Kasus keputusan terpublikasi",
        zoomOut: "Perkecil peta keputusan",
        zoomIn: "Perbesar peta keputusan",
        resetZoom: "Rapikan ulang zoom peta keputusan",
        detailChips: ["Risiko", "Bukti", "Owner"],
      },
    },
    about: {
      experience: {
        "neuronworks-qa-engineer": {
          role: "/Software Quality Assurance Engineer/",
          location: "Bandung, Jawa Barat, Indonesia - di lokasi",
          summary:
            "Berperan sebagai jangkar keputusan kualitas selama /SIT/ dan /UAT/ dengan mendefinisikan batas /QA/ yang eksplisit serta risiko residu yang diterima.",
          focusItems: [
            "Merancang framework /automation testing/ modular untuk meningkatkan stabilitas regresi dan maintainability jangka panjang.",
            "Menyusun strategi testing berbasis risiko lintas fase /API/, /UI/, integrasi, performance, /SIT/, dan /UAT/.",
            "Melakukan analisis risiko defect dan investigasi /root cause/ untuk menekan risiko produksi yang berulang.",
            "Mendefinisikan /quality gate/ dan kriteria penerimaan yang selaras dengan evolusi proses bisnis.",
          ],
          closingNote:
            "Berkontribusi pada alignment kualitas lintas fungsi bersama System Analyst, Developer, dan stakeholder bisnis.",
        },
        "technical-support-specialist": {
          role: "/Technical Support Specialist/",
          location: "Jakarta Selatan, Jakarta, Indonesia - hybrid",
          summary:
            "Mendukung infrastruktur cloud storage dan jaringan dengan fokus pada integritas data dan keandalan sistem.",
          focusItems: [
            "Menjaga integritas data pada lingkungan /object storage/.",
            "Memantau kesehatan sistem dan metrik performa infrastruktur.",
            "Melakukan analisis log dan investigasi /root cause/.",
            "Berkolaborasi dengan administrator sistem untuk menyelesaikan issue infrastruktur.",
            "Berkontribusi pada kontrol preventif untuk meminimalkan risiko operasional.",
          ],
        },
        "papyrus-internship": {
          role: "/Electronic Data Processing Staff/",
          companyLine: "PT. Papyrus Sakti - Internship",
          location: "Bandung, Jawa Barat, Indonesia - di lokasi",
          summary:
            "Memvalidasi akurasi data operasional dalam /workflow/ manufaktur.",
          focusItems: [
            "Berkontribusi pada sistem otomasi gudang (C & Pascal).",
            "Membantu desain logika /monitoring/.",
            "Memvalidasi data produksi dibandingkan inventory fisik.",
            "Mendukung pemeliharaan sistem operasional dan jaringan.",
            "Mengidentifikasi inkonsistensi dan membantu tindakan korektif.",
          ],
        },
      },
      education: {
        "asia-cyber-university": {
          degree: "Sarjana Sains, Sistem Informasi Manajemen",
          note: "Saat ini menempuh pendidikan sarjana dengan fokus pada analisis proses bisnis, desain sistem, manajemen data, dan /IT governance/.",
        },
        "smkn-1-soreang": {
          degree: "Teknik Komputer dan Jaringan",
          note: "Membangun fondasi pada jaringan, infrastruktur server, dan troubleshooting sistem.",
        },
      },
      hardSkillGroups: {
        "system-qa": {
          title: "Sistem & /QA/",
          items: [
            "Analisis Proses Bisnis",
            "Validasi Perilaku Sistem",
            "Strategi Testing Berbasis Risiko",
            "/API Testing/",
            "/UI Testing/",
            "/Integration Testing/",
            "/Performance Testing/",
            "Koordinasi /SIT/ dan /UAT/",
            "Definisi /Quality Gate/",
            "Validasi Lintas Modul",
            "/Root Cause Analysis/",
            "Klarifikasi Requirement",
          ],
        },
        "automation-technical": {
          title: "Otomasi & Teknis",
          items: [
            "/Unit Testing/",
            "/Automation Testing/",
            "Playwright",
            "Cypress",
            "JMeter",
            "Postman / Newman",
            "Python",
            "JavaScript",
            "SQL",
            "Oracle DB",
            "Validasi Database",
          ],
        },
        "infrastructure-tools": {
          title: "Infrastruktur & Tools",
          items: [
            "n8n",
            "JMeter",
            "DBeaver",
            "MinIO",
            "Prometheus",
            "Git / GitHub",
            "Docker",
            "Linux",
            "/Monitoring/",
            "Analisis Log",
            "Validasi Environment",
          ],
        },
        "delivery-operations": {
          title: "/Delivery/ & Operasional",
          items: [
            "Tinjauan Kesiapan /Release/",
            "Analisis Risiko Defect",
            "Validasi /Workflow/",
            "Tinjauan Integritas Proses",
            "Penyusunan Bukti",
            "Dokumentasi /QA/",
            "Traceability",
            "Alignment Stakeholder",
          ],
        },
      },
      personalFoundation: [
        "Saya memilih kejelasan dibanding kecepatan",
        "Saya menghargai ketepatan dibanding asumsi",
        "Saya berfokus pada integritas sistem jangka panjang",
        "Saya percaya sistem harus mencerminkan logika dunia nyata",
      ],
    },
    assistant: {
      title: "Clarity AI",
      badge: "Reasoning berbasis portofolio",
      description:
        "Asisten reasoning arsitektural untuk portofolio yang dipublikasikan.",
      compactDescription: "Asisten reasoning arsitektural",
      placeholder: "Tanyakan proyek, pemikiran /QA/, atau kontak...",
      workspacePlaceholder: "Tanyakan Clarity AI tentang portofolio ini...",
      quickQuestions: [
        "Siapa Hambali Fadib?",
        "Proyek apa saja yang pernah ia tangani?",
        "Bagaimana pendekatan /QA/ nya?",
        "Bagaimana cara menghubunginya?",
        "Bisa tampilkan tautan publiknya?",
      ],
      suggestedPrompts: "Prompt yang disarankan",
      sampleMessage:
        "Tanyakan latar belakang, proyek, sistem, pemikiran /QA/, atau halaman terbaik untuk dibuka berikutnya.",
      loadingLabel: "Sedang menalar isi portofolio...",
      errorMessage:
        "Asisten portofolio sedang tidak tersedia. Silakan coba lagi sebentar lagi.",
      disclaimer: "Clarity AI dapat menghasilkan informasi yang tidak akurat.",
      knowledgeDomainsLabel: "Domain pengetahuan",
      knowledgeDomains: [
        "Ringkasan Portofolio",
        "Proyek",
        "Pemikiran /QA/",
        "Tentang Hambali",
        "Kontak",
      ],
      newSession: "Sesi Baru",
      send: "Kirim",
      status: {
        offline: "AI Offline",
        thinking: "AI Berpikir",
        active: "AI Aktif",
      },
      emptyTitle: "Konteks portofolio, disusun untuk keputusan.",
      emptyDescription:
        "Proyek, pemikiran /QA/, latar belakang, dan jalur kontak tersedia sebagai domain pengetahuan yang fokus.",
      workspaceLabel: "Workspace reasoning portofolio",
      aria: {
        open: "Buka Clarity AI",
        close: "Tutup Clarity AI",
        expand: "Perbesar Clarity AI",
        closeWorkspace: "Tutup workspace Clarity AI",
        send: "Kirim pesan",
      },
    },
  },
};
