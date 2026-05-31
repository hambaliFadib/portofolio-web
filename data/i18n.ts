export type Locale = "en" | "id";

export const defaultLocale: Locale = "en";

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  id: "🇮🇩",
};

export const dictionary = {
  en: {
    nav: {
      home: "Home",
      projects: "Projects",
      thinking: "Thinking",
      about: "About",
      contact: "Contact",
    },
    common: {
      getInTouch: "Get in Touch",
      contact: "Contact",
      viewThinking: "View Thinking",
      viewProjects: "View projects",
    },
    home: {
      role: "Software Quality Assurance Engineer",
      description:
        "Focused on business-critical systems, ensuring quality decisions are clear, risks are explicit, and complex processes remain reliable under pressure.",
      primaryCta: "Explore Work & Framework",
      secondaryCta: "Quality Thinking",
      capabilities: [
        {
          title: "Business Process Validation",
          description:
            "Validate workflows against real business intent, not just system behavior.",
        },
        {
          title: "Risk-Based Quality Decision",
          description:
            "Define what must be tested and what can be safely deprioritized based on risk.",
        },
        {
          title: "Enterprise System Testing",
          description:
            "Handle multi-module and high-risk enterprise system flows.",
        },
      ],
    },
    projects: {
      eyebrow: "Enterprise delivery & quality frameworks",
      title: "Projects Built Around System Correctness.",
      description:
        "A curated collection of quality frameworks, automation structures, governance systems, and business-critical delivery experiences focused on clarity, resilience, and operational integrity.",
      cta: "Explore case studies",
      final:
        "Strong QA work is visible in the quality of the release decision.",
      visual: {
        releaseControl: "Release control",
        releaseMeta: "risk, proof, readiness",
        decisionSignal: "Decision signal",
        riskBoundary: "Explicit risk boundary",
        evidence: "Evidence",
        proof: "Release-ready proof",
      },
    },
    thinking: {
      eyebrow: "Frameworks & essays",
      title: "Structured Thought for Complex Systems.",
      visualTitle: "Structured Thinking",
      visualDescription:
        "Business intent, system behavior, risk visibility, and release proof organized before judgment.",
      projectsCta: "View projects",
      modelCta: "Decision model",
    },
    about: {
      title: "Architecting Quality, Ensuring Stability.",
      summary:
        "I approach work through clarity, structure, and long-term responsibility. My journey started from hands-on technical and operational roles, then grew into software quality work where I learned that correctness matters most when systems are under real pressure. I care about making decisions that stay right, not just look right during testing.",
      principle:
        "I come from hard work, and I believe consistency matters more than noise.",
      viewCv: "View CV",
      careerEyebrow: "Career progression",
      experienceTitle: "Experience",
      academicEyebrow: "Academic background",
      educationTitle: "Education",
      expected: "expected",
      skillsEyebrow: "Capability layer",
      skillsTitle: "Hard Skills",
      skillsDescription:
        "A structured capability layer for system integrity, automated validation, and operational quality control.",
      foundationEyebrow: "Personal foundation",
      foundationTitle: "What stays constant",
      foundationDescription:
        "The values behind how I make quality decisions and work with real-world systems.",
      final:
        "Quality is not measured by how much was tested. Quality is measured by whether the release decision remains correct under real business conditions.",
    },
    contact: {
      eyebrow: "Get in touch",
      title: "Let's Build Clearer Systems.",
      description:
        "Whether discussing quality architecture, automation strategy, governance frameworks, or complex system validation - feel free to reach out.",
      availability: "Available for selected opportunities",
      openFor:
        "Open for collaboration, discussion, and architectural consulting.",
      name: "Name",
      email: "Email Address",
      company: "Company / Organization",
      subject: "Subject",
      message: "Message",
      send: "Send Message",
      whatsapp: "Message via WhatsApp",
      subjectPlaceholder: "Select a subject",
    },
  },
  id: {
    nav: {
      home: "Beranda",
      projects: "Proyek",
      thinking: "Pemikiran",
      about: "Tentang",
      contact: "Kontak",
    },
    common: {
      getInTouch: "Hubungi Saya",
      contact: "Kontak",
      viewThinking: "Lihat Pemikiran",
      viewProjects: "Lihat proyek",
    },
    home: {
      role: "/Software Quality Assurance Engineer/",
      description:
        "Berfokus pada sistem bisnis-kritis, memastikan keputusan kualitas jelas, risiko eksplisit, dan proses kompleks tetap andal saat berada di bawah tekanan.",
      primaryCta: "Jelajahi Karya & /Framework/",
      secondaryCta: "/Quality Thinking/",
      capabilities: [
        {
          title: "Validasi Proses Bisnis",
          description:
            "Memvalidasi alur kerja berdasarkan tujuan bisnis nyata, bukan hanya perilaku sistem.",
        },
        {
          title: "Keputusan Kualitas Berbasis Risiko",
          description:
            "Menentukan apa yang wajib diuji dan apa yang dapat diturunkan prioritasnya secara aman berdasarkan risiko.",
        },
        {
          title: "Pengujian Sistem /Enterprise/",
          description:
            "Menangani alur sistem /enterprise/ multi-modul dan berisiko tinggi.",
        },
      ],
    },
    projects: {
      eyebrow: "/Delivery enterprise/ & /framework/ kualitas",
      title: "Proyek yang Dibangun untuk Ketepatan Sistem.",
      description:
        "Kumpulan /framework/ kualitas, struktur otomasi, sistem /governance/, dan pengalaman /delivery/ bisnis-kritis yang berfokus pada kejelasan, ketahanan, dan integritas operasional.",
      cta: "Jelajahi studi kasus",
      final:
        "Kerja /QA/ yang kuat terlihat dari kualitas keputusan /release/.",
      visual: {
        releaseControl: "Kontrol /release/",
        releaseMeta: "risiko, bukti, kesiapan",
        decisionSignal: "Sinyal keputusan",
        riskBoundary: "Batas risiko eksplisit",
        evidence: "Bukti",
        proof: "Bukti siap /release/",
      },
    },
    thinking: {
      eyebrow: "/Framework/ & esai",
      title: "Pemikiran Terstruktur untuk Sistem Kompleks.",
      visualTitle: "Pemikiran Terstruktur",
      visualDescription:
        "Tujuan bisnis, perilaku sistem, visibilitas risiko, dan bukti /release/ disusun sebelum keputusan dibuat.",
      projectsCta: "Lihat proyek",
      modelCta: "Model keputusan",
    },
    about: {
      title: "Merancang Kualitas, Menjaga Stabilitas.",
      summary:
        "Saya bekerja dengan kejelasan, struktur, dan tanggung jawab jangka panjang. Perjalanan saya dimulai dari peran teknis dan operasional langsung, lalu berkembang ke /software quality/, tempat saya belajar bahwa ketepatan paling penting ketika sistem berada di bawah tekanan nyata. Saya peduli pada keputusan yang tetap benar, bukan hanya terlihat benar saat /testing/.",
      principle:
        "Saya tumbuh dari kerja keras, dan saya percaya konsistensi lebih penting daripada kebisingan.",
      viewCv: "Lihat CV",
      careerEyebrow: "Perjalanan karier",
      experienceTitle: "Pengalaman",
      academicEyebrow: "Latar akademik",
      educationTitle: "Pendidikan",
      expected: "perkiraan",
      skillsEyebrow: "Lapisan kapabilitas",
      skillsTitle: "/Hard Skills/",
      skillsDescription:
        "Lapisan kapabilitas terstruktur untuk integritas sistem, validasi otomatis, dan kontrol kualitas operasional.",
      foundationEyebrow: "Fondasi pribadi",
      foundationTitle: "Hal yang tetap konstan",
      foundationDescription:
        "Nilai yang membentuk cara saya membuat keputusan kualitas dan bekerja dengan sistem nyata.",
      final:
        "Kualitas tidak diukur dari seberapa banyak yang diuji. Kualitas diukur dari apakah keputusan rilis tetap benar dalam kondisi bisnis nyata.",
    },
    contact: {
      eyebrow: "Hubungi saya",
      title: "Mari Bangun Sistem yang Lebih Jelas.",
      description:
        "Baik untuk membahas /quality architecture/, strategi otomasi, /framework governance/, atau validasi sistem kompleks - silakan hubungi saya.",
      availability: "Tersedia untuk peluang terpilih",
      openFor:
        "Terbuka untuk kolaborasi, diskusi, dan konsultasi arsitektural.",
      name: "Nama",
      email: "Alamat Email",
      company: "Perusahaan / Organisasi",
      subject: "Subjek",
      message: "Pesan",
      send: "Kirim Pesan",
      whatsapp: "Pesan via WhatsApp",
      subjectPlaceholder: "Pilih subjek",
    },
  },
} as const;
