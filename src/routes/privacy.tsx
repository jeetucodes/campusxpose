import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, Ghost, ServerOff, Database, Cookie, Trash2, Megaphone,
  MailWarning, RefreshCw, ArrowRight,
} from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 6px 18px 6px / 6px 18px 6px 16px";

const LAST_UPDATED = "30 June 2026";

const SECTIONS = [
  {
    icon: Ghost,
    title: "Anonymous by design",
    body: "CampusXpose app khulte hi ek random ghost identity tumhare device par ban jaati hai. Hum tumse email, phone number ya real naam kabhi nahi maangte. Tum bina kisi sign-up ke pura app use kar sakte ho.",
  },
  {
    icon: ServerOff,
    title: "Jo hum kabhi collect nahi karte",
    body: "Hum tumhari personal pehchaan store nahi karte: koi email, phone, real naam, GPS/location, IP-based location ya device contacts nahi. Jo cheez exist hi nahi karti, woh leak bhi nahi ho sakti.",
  },
  {
    icon: Database,
    title: "Jo hum store karte hain",
    body: "Sirf wahi content jo tum khud post karte ho — reports, messages, comments, polls aur uploaded proof. Har cheez ek random anonymous username se judi hoti hai, tumhari asli identity se nahi. Yeh data app ko chalane aur tumhe content dikhane ke liye use hota hai.",
  },
  {
    icon: Trash2,
    title: "Forget Me — data delete",
    body: "Kisi bhi waqt \"Forget Me\" use karke tum apni anonymous identity reset kar sakte ho. Iske baad ek nayi ghost identity banti hai aur purani identity se judi activity ko hata diya jaata hai.",
  },
  {
    icon: Cookie,
    title: "Local storage & cookies",
    body: "Tumhari anonymous identity tumhare browser ke local storage me rehti hai taaki app tumhe yaad rakh sake. Hum tracking ke liye third-party advertising cookies use nahi karte.",
  },
  {
    icon: Megaphone,
    title: "Ads aur third parties",
    body: "App me kuch ads dikh sakte hain. Yeh tumhari personal identity par target nahi hote, kyunki app ke paas tumhari koi personal identity hoti hi nahi.",
  },
  {
    icon: MailWarning,
    title: "Reports & safety",
    body: "Tumhari reports content se judi hoti hain, identity se nahi — taaki college, faculty ya admin tumhe trace na kar sakein. Agar koi content community rules todta hai, to moderation use uss content tak hi limited rehti hai.",
  },
  {
    icon: RefreshCw,
    title: "Is policy me badlaav",
    body: "Zaroorat padne par hum is privacy policy ko update kar sakte hain. Important badlaav hone par yeh page update hoga, isliye time-time par check karte rehna.",
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CampusXpose" },
      {
        name: "description",
        content:
          "CampusXpose privacy policy: anonymous by design. No email, phone, real name, location or IP collected. Learn what we store and how Forget Me works.",
      },
      { property: "og:title", content: "Privacy Policy — CampusXpose" },
      {
        property: "og:description",
        content:
          "How CampusXpose keeps you anonymous: what we never collect, what we store, and how to delete your data.",
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
                Last updated: {LAST_UPDATED}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            CampusXpose ek anonymous safety app hai — students bina darr ke, bina
            naam ke apni baat rakh sakein. Yeh page batata hai ki hum kya
            collect karte hain (bahut kam), kya nahi karte, aur tum apna data
            kaise control kar sakte ho.
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
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-8 -rotate-1 border-2 border-dashed border-ink bg-surface-2/60 p-6 text-center shadow-ink"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <p className="font-display text-lg font-bold">
            Tumhari pehchaan kabhi store nahi hoti. Ever.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aur jaano hum tumhe kaise safe rakhte hain.
          </p>
          <Button asChild className="mt-4">
            <Link to="/trust">
              Privacy & Trust dekho <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
