import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { contactChannels } from "@/data/profile";

const socialChannels = contactChannels.filter((channel) =>
  ["LinkedIn", "GitHub", "Instagram"].includes(channel.label),
);
const emailChannel = contactChannels.find((channel) => channel.label === "Email");
const whatsappChannel = contactChannels.find((channel) => channel.label === "WhatsApp");
const whatsappDisplayPhone = "+62 813 •••• 6229";

function PrimaryActions() {
  if (!emailChannel || !whatsappChannel) return null;

  return (
    <nav aria-label="Direct contact">
      <ul className="contact-primary-list">
        <li>
          <Link href={emailChannel.href} className="contact-action-link group">
            <span className="contact-action-copy">
              <span className="contact-action-label">Email</span>
              <span className="contact-action-value">{emailChannel.value}</span>
            </span>
          </Link>
        </li>
        <li>
          <Link
            href={whatsappChannel.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${whatsappDisplayPhone}. Chat on WhatsApp`}
            className="contact-action-link group"
          >
            <span className="contact-action-copy">
              <span className="contact-action-label">WhatsApp</span>
              <span className="contact-action-value">{whatsappDisplayPhone}</span>
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function SocialLinks() {
  return (
    <nav aria-label="Other contact channels">
      <ul className="contact-social-list">
        {socialChannels.map((channel) => (
          <li key={channel.label}>
            <Link
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={channel.label === "Instagram" ? "Instagram @hambalifadib" : undefined}
              className="contact-social-link group"
            >
              <SocialBrandIcon name={channel.label} />
              <span>{channel.label === "Instagram" ? "@hambalifadib" : channel.label}</span>
              <ArrowUpRight aria-hidden="true" className="contact-social-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SocialBrandIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="contact-social-icon"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      {name === "LinkedIn" && (
        <>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM3.56 9h3.56v11.45H3.56V9Z" />
        </>
      )}
      {name === "GitHub" && (
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.02c-3.23.7-3.91-1.37-3.91-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.58-.29-5.29-1.29-5.29-5.74 0-1.27.46-2.3 1.2-3.11-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.2 1.19a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.59.23 2.77.11 3.06.75.81 1.2 1.84 1.2 3.11 0 4.46-2.72 5.45-5.31 5.74.42.36.78 1.07.78 2.15v3.17c0 .31.21.67.8.55A11.5 11.5 0 0 0 12 .5Z" />
      )}
      {name === "Instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.5" cy="6.5" r="1.15" />
        </>
      )}
    </svg>
  );
}

export function ContactFooterExperience() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="contact-editorial contact-section scroll-mt-24"
      >
        <div className="contact-layout mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="contact-introduction">
            <h2 id="contact-heading" className="contact-heading font-display">
              Let&apos;s make the next release clearer.
            </h2>
            <p className="contact-supporting-copy">
              For a quality engineering discussion, test strategy, or a complex workflow, start with email. WhatsApp is here for a short follow-up.
            </p>
          </div>

          <div className="contact-channels lg:pt-2">
            <PrimaryActions />
            <div className="contact-secondary">
              <h3 className="contact-secondary-heading">Other channels</h3>
              <SocialLinks />
            </div>
          </div>
        </div>
      </section>

      <footer className="contact-editorial contact-footer">
        <div className="contact-footer-content mx-auto grid w-full max-w-7xl items-center gap-x-6 gap-y-3 px-6 sm:px-8">
          <a href="#top" className="contact-footer-link group">
            <span>Back to top</span>
            <ArrowUp aria-hidden="true" className="contact-footer-arrow" />
          </a>
          <p className="contact-footer-copyright">© {currentYear} Hambali Fadib</p>
        </div>
      </footer>
    </>
  );
}
