import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, BookOpen, ServerOff, Database, Cookie, Trash2, Scale,
  AlertTriangle, RefreshCw, ArrowRight, FileText, Ban, Megaphone,
} from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 6px 18px 6px / 6px 18px 6px 16px";

const LAST_UPDATED = "30 June 2026";

const SECTIONS = [
  {
    icon: BookOpen,
    title: "Legal Definitions & Scope",
    body: `This Privacy Policy constitutes a legally binding agreement between you ("the User") and CampusXpose ("the Platform", "we", "us", or "our"). This Policy governs the collection, processing, storage, and deletion of all data through the CampusXpose web application and associated services. By accessing or using the Platform, you expressly consent to the practices described herein.`,
  },
  {
    icon: ServerOff,
    title: "Personally Identifiable Information (PII)",
    body: `Under no circumstances does CampusXpose collect, store, or process Personally Identifiable Information. The Platform does not request, record, or retain: email addresses, telephone numbers, legal names, government-issued identifiers, residential addresses, GPS coordinates, IP addresses, device fingerprints, or contact lists. The absence of PII collection is a deliberate architectural decision, rendering identity-based data breaches and unauthorized identification legally and technically impossible.`,
  },
  {
    icon: Database,
    title: "Data Collected & Legal Basis",
    body: `The only data processed by the Platform is User-Generated Content (UGC): textual reports, comments, messages, poll responses, and uploaded media files voluntarily submitted by Users. Such data is stored exclusively under a pseudonymous identifier ("Ghost ID") — a randomized, non-reversible username generated locally on the User's device. The legal basis for processing is legitimate interest in providing an anonymous reporting and communication service, pursuant to applicable data protection frameworks. No content is linked to any real-world identity.`,
  },
  {
    icon: Trash2,
    title: "Right to Erasure (Forget Me)",
    body: `Users retain the absolute right to request deletion of their pseudonymous identity and all associated activity under Article 17 of the General Data Protection Regulation ("Right to Erasure"). The "Forget Me" function, accessible via the application menu, permanently invalidates the local Ghost ID and dissociates all prior UGC from that identifier. Post-deletion, a new Ghost ID is instantiated. This process is irreversible and executed without delay.`,
  },
  {
    icon: Cookie,
    title: "Local Storage, Cookies & Tracking",
    body: `CampusXpose utilizes browser local storage solely to maintain the User's Ghost ID and session preferences. No third-party tracking cookies, analytics beacons, advertising identifiers, or cross-site tracking mechanisms are employed. The Platform does not participate in behavioral profiling, remarketing, or data monetization. For clarity: no external advertising networks or data brokers receive access to any Platform data.`,
  },
  {
    icon: Scale,
    title: "Third-Party Disclosure",
    body: `CampusXpose does not sell, lease, license, or transfer any data to third parties for commercial purposes. Disclosure to law enforcement or regulatory authorities is limited to instances where a valid legal order (subpoena, warrant, or court order) compels production. Notably, because the Platform does not collect PII, any compelled disclosure would be limited to pseudonymous UGC without attributable identity.`,
  },
  {
    icon: AlertTriangle,
    title: "Content Moderation & Liability",
    body: `All User-Generated Content is subject to Community Guidelines and applicable law. Reports of prohibited content (harassment, threats, illegal material) are reviewed under a strict moderation protocol. Enforcement actions — content removal, account-level restrictions, or legal referral — are directed at the specific content or pseudonymous identifier only. CampusXpose assumes no liability for the accuracy or lawfulness of UGC, provided such content was not solicited, edited, or endorsed by the Platform.`,
  },
  {
    icon: RefreshCw,
    title: "Policy Amendments & Governing Law",
    body: `CampusXpose reserves the right to amend this Privacy Policy at any time. Material changes will be communicated through in-app notification and update of the effective date above. Continued use of the Platform after such amendments constitutes acceptance of the revised terms. This Policy is governed by the laws of India, and any disputes arising hereunder shall be subject to the exclusive jurisdiction of the courts at [Jurisdiction]. For grievances, contact the designated Grievance Officer.`,
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CampusXpose" },
      {
        name: "description",
        content:
          "CampusXpose Privacy Policy: legally binding terms on data collection, PII, right to erasure, third-party disclosure, content moderation, and governing law.",
      },
      { property: "og:title", content: "Privacy Policy — CampusXpose" },
      {
        property: "og:description",
        content:
          "Legal terms on anonymous data practices, right to erasure, and third-party disclosure.",
      },
      { property: "og:url", content: "https://campusxpose.online/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div
          className="-rotate-1 border-2 border-ink bg-white p-6 shadow-ink"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center border-2 border-ink bg-success/15"
              style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
            >
              <Shield className="h-6 w-6 text-success" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">
                Effective Date: {LAST_UPDATED}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This Privacy Policy sets forth the legally binding terms governing data
            collection, processing, storage, and user rights on the CampusXpose
            Platform. By accessing or using our services, you acknowledge and agree
            to the practices described herein.
          </p>
        </div>

        {/* Sections */}
        <div className="mt-8 space-y-4">
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              className="border-2 border-ink bg-white p-5 shadow-ink"
              style={{
                borderRadius: WOBBLY_SM,
                transform: i % 2 === 0 ? "rotate(-0.3deg)" : "rotate(0.3deg)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-postit"
                  style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
                >
                  <s.icon className="h-5 w-5 text-accent" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold">{s.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {s.body}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Legal notice */}
        <div
          className="mt-6 border-2 border-dashed border-ink bg-surface-2/60 p-5 shadow-ink"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              This document is maintained by CampusXpose as an app-owned editable
              privacy statement. It is not an independent legal certification.
              For questions regarding your data rights or to exercise your Right to
              Erasure, please contact the Platform administrator through the in-app
              feedback channel.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-8 -rotate-1 border-2 border-dashed border-ink bg-surface-2/60 p-6 text-center shadow-ink"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <p className="font-display text-lg font-bold">
            No Personally Identifiable Information is ever collected.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review our Privacy & Trust principles for additional security details.
          </p>
          <Button asChild className="mt-4">
            <Link to="/trust">
              Privacy & Trust <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
