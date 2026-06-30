import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Scale, UserCheck, Gavel, MessageSquareWarning, ShieldBan,
  FolderLock, EyeOff, AlertCircle, RefreshCw, ArrowRight, FileText,
} from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 6px 18px 6px / 6px 18px 6px 16px";

const LAST_UPDATED = "30 June 2026";

const SECTIONS = [
  {
    icon: Scale,
    title: "Acceptance of Terms",
    body: `This Terms of Service Agreement (“Agreement”) constitutes a legally binding contract between you (“the User”) and CampusXpose (“the Platform”, “we”, “us”, or “our”). By accessing, browsing, or using the CampusXpose web application and any associated services, you affirm that you have read, understood, and agreed to be bound by all terms, conditions, and notices contained herein. If you do not agree to these terms in their entirety, you are expressly prohibited from using the Platform and must discontinue access immediately.`,
  },
  {
    icon: UserCheck,
    title: "Eligibility & User Accounts",
    body: `The Platform is intended for individuals who have attained the age of majority in their jurisdiction or who are at least 13 years of age with verifiable parental consent. CampusXpose does not create traditional user accounts and does not collect Personally Identifiable Information. Access is granted via a pseudonymous identifier (“Ghost ID”) generated locally on your device. You are solely responsible for maintaining the confidentiality of your device and browser environment. Any activity conducted under your Ghost ID is attributable to that identifier alone.`,
  },
  {
    icon: Gavel,
    title: "Acceptable Use & Prohibited Conduct",
    body: `Users shall not upload, post, transmit, or otherwise make available any content that: (a) is unlawful, defamatory, obscene, pornographic, or threatening; (b) incites violence, hatred, or discrimination against any individual or group; (c) infringes upon intellectual property rights, privacy rights, or any other proprietary right; (d) contains malware, spyware, or any code designed to disrupt, damage, or intercept data; (e) impersonates any person or entity, including Platform administrators; or (f) constitutes unauthorized commercial solicitation or spam. Violation of this clause may result in immediate content removal, identifier restriction, or legal referral without prior notice.`,
  },
  {
    icon: MessageSquareWarning,
    title: "User-Generated Content (UGC)",
    body: `All reports, comments, messages, poll responses, and media files submitted to the Platform constitute User-Generated Content. You retain no proprietary claim over anonymous submissions; however, you represent and warrant that your UGC does not violate any applicable law or third-party right. CampusXpose does not pre-screen UGC but reserves the right to review, moderate, remove, or disclose content to comply with legal obligations or enforce this Agreement. The Platform assumes no editorial responsibility and does not endorse any UGC.`,
  },
  {
    icon: ShieldBan,
    title: "Disclaimer of Warranties",
    body: `The Platform and all services are provided on an “AS IS” and “AS AVAILABLE” basis without warranties of any kind, whether express, implied, statutory, or otherwise. CampusXpose expressly disclaims all implied warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation. The Platform makes no guarantee regarding the accuracy, reliability, completeness, or timeliness of any UGC. You acknowledge that anonymous reporting carries inherent risks of false, misleading, or defamatory submissions, and you assume all risks associated with reliance on such content.`,
  },
  {
    icon: FolderLock,
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by applicable law, CampusXpose, its affiliates, administrators, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses, arising out of or relating to your access to or use of (or inability to access or use) the Platform, whether based on warranty, contract, tort, or any other legal theory, even if advised of the possibility of such damages. In no event shall our aggregate liability exceed the amount you have paid to access the Platform, which is zero.`,
  },
  {
    icon: EyeOff,
    title: "Indemnification",
    body: `You agree to indemnify, defend, and hold harmless CampusXpose and its administrators from and against any and all claims, damages, obligations, losses, liabilities, costs, debts, and expenses (including reasonable attorneys’ fees) arising from: (a) your use of the Platform; (b) your violation of any term of this Agreement; (c) your violation of any third-party right, including intellectual property, privacy, or publicity rights; or (d) any UGC you submit that causes harm to a third party. This indemnification obligation survives termination of your use of the Platform.`,
  },
  {
    icon: AlertCircle,
    title: "Termination & Suspension",
    body: `CampusXpose reserves the right, in its sole discretion and without prior notice, to suspend, restrict, or terminate your access to the Platform for any reason, including but not limited to breach of this Agreement, suspected unlawful activity, or threat to Platform integrity. Because the Platform does not maintain PII, enforcement actions are directed at the Ghost ID or specific UGC only. Upon termination, all rights granted to you under this Agreement shall cease immediately. Provisions that by their nature should survive termination shall so survive.`,
  },
  {
    icon: RefreshCw,
    title: "Governing Law & Dispute Resolution",
    body: `This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict-of-law principles. Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be addressed through good-faith negotiation. If unresolved within thirty (30) days, the parties agree to submit the dispute to binding arbitration conducted in accordance with the Arbitration and Conciliation Act, 1996, seated in New Delhi, India. Each party shall bear its own costs. The arbitral award shall be final and binding.`,
  },
];

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CampusXpose" },
      {
        name: "description",
        content:
          "CampusXpose Terms of Service: legally binding agreement covering acceptance, acceptable use, UGC, disclaimers, liability, indemnification, and governing law.",
      },
      { property: "og:title", content: "Terms of Service — CampusXpose" },
      {
        property: "og:description",
        content:
          "Legal terms governing your use of the CampusXpose anonymous reporting platform.",
      },
      { property: "og:url", content: "https://campusxpose.online/terms" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
              className="grid h-12 w-12 shrink-0 place-items-center border-2 border-ink bg-accent/15"
              style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
            >
              <Scale className="h-6 w-6 text-accent" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">
                Effective Date: {LAST_UPDATED}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This Terms of Service Agreement sets forth the legally binding terms
            governing your access to and use of the CampusXpose Platform. By using
            our services, you agree to comply with all provisions described herein.
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
              legal statement. It is not an independent legal certification.
              For questions regarding these terms, please contact the Platform
              administrator through the in-app feedback channel.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-8 -rotate-1 border-2 border-dashed border-ink bg-surface-2/60 p-6 text-center shadow-ink"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <p className="font-display text-lg font-bold">
            Your trust is our priority.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review our Privacy Policy for additional details on data practices.
          </p>
          <Button asChild className="mt-4">
            <Link to="/privacy">
              Privacy Policy <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
