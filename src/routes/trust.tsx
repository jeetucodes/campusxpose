import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, Ghost, EyeOff, Lock, Trash2, ArrowRight, ServerOff, FileWarning } from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

const PILLARS = [
  {
    icon: Ghost,
    title: "Anonymous by Design",
    desc: "App khulte hi ek random ghost identity ban jaati hai — sirf tumhare device pe. Na email, na phone, na real naam maanga jaata hai.",
  },
  {
    icon: ServerOff,
    title: "Identity Store Nahi Hoti",
    desc: "Tumhari personal pehchaan kahin save hi nahi hoti. Jo cheez exist hi nahi karti, woh leak bhi nahi ho sakti.",
  },
  {
    icon: EyeOff,
    title: "Trace-Proof Reports",
    desc: "Har report content se judi hoti hai, identity se nahi. College, faculty ya admin tumhe trace nahi kar sakte.",
  },
  {
    icon: Lock,
    title: "Built-in Blur Tool",
    desc: "Proof upload karne se pehle naam, face ya sensitive detail blur kar do — bina kisi extra app ke.",
  },
];

const FAQS = [
  {
    q: "Kya mera naam kisi ko dikhega?",
    a: "Nahi. Tum sirf ek random ghost username se dikhte ho. Tumhara real naam, email ya phone kahin store hi nahi hota.",
  },
  {
    q: "Kya college ya faculty ko pata chal sakta hai maine report kiya?",
    a: "Bilkul nahi. Reports kisi identity se link nahi hoti, isliye tumhe koi trace nahi kar sakta.",
  },
  {
    q: "Login ke liye email/phone kyun nahi maangte?",
    a: "Kyunki hum tumhari koi pehchaan rakhna hi nahi chahte. Auto anonymous identity se leak hone wala data hi nahi bachta.",
  },
  {
    q: "Mera data kahan jaata hai?",
    a: "Sirf report ka content (text/proof) save hota hai taaki dusre students dekh saken. Personal identity attached nahi hoti.",
  },
  {
    q: "Apna data delete kaise karun?",
    a: "Top-right menu me 'Forget Me' option hai. Ek click me tumhari local identity mit jaati hai.",
  },
  {
    q: "Kya proof me dikhne wale naam blur kar sakta hoon?",
    a: "Haan, report karte waqt built-in blur tool se sensitive detail chhupa sakte ho.",
  },
];

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Privacy & Trust — CampusXpose 100% Anonymous" },
      {
        name: "description",
        content:
          "Jaano CampusXpose kaise tumhari identity safe rakhta hai. No email, no phone, no identity stored. 100% anonymous reporting platform for students.",
      },
      { property: "og:title", content: "Privacy & Trust — CampusXpose" },
      {
        property: "og:description",
        content: "No identity stored, ever. Jaano kaise tumhari reports 100% anonymous rehti hain.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-12 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          <span
            className="inline-flex -rotate-2 items-center gap-2 border-2 border-border bg-success/15 px-4 py-1.5 text-sm font-semibold text-success shadow-ink-soft"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <Shield className="h-3.5 w-3.5" /> No Identity Stored. Ever.
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Tumhari Privacy, <span className="text-accent">Pehle</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Bahut students isliye chup reh jaate hain ki "kahin pata na chal jaye". Yahaan darne ki
            koi baat nahi — humne app aise banaya hai ki tumhari pehchaan kabhi store hi na ho.
          </p>
        </motion.div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-start gap-4 border-2 border-border bg-white p-5 shadow-ink ${
                i % 2 ? "rotate-1" : "-rotate-1"
              }`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div
                className="grid h-12 w-12 shrink-0 place-items-center border-2 border-border bg-accent text-accent-foreground"
                style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
              >
                <p.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="mb-1 font-display text-lg font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Promise */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div
          className="border-2 border-border bg-postit p-6 shadow-ink -rotate-1"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
            <FileWarning className="h-6 w-6 text-accent" /> Hamara Vaada
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              "Hum kabhi email, phone ya real naam nahi maangte.",
              "Tumhari identity kabhi kisi report se link nahi hoti.",
              "Hum tumhara data bechte nahi, na ads ke liye track karte hain.",
              "Jab chaho 'Forget Me' se sab kuch mita sakte ho.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="mb-6 text-center font-display text-3xl font-bold">❓ Common Sawaal</h2>
        <div
          className="border-2 border-border bg-white p-4 shadow-ink sm:p-6"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-dashed border-border">
                <AccordionTrigger className="text-left font-display text-base font-bold hover:text-accent">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-4 text-center">
        <div className="sketch-card -rotate-1 p-8" style={{ borderRadius: WOBBLY_MD }}>
          <Ghost className="mx-auto mb-3 h-10 w-10 text-accent" strokeWidth={2.5} />
          <h2 className="font-display text-3xl font-bold">Ab darne ki koi baat nahi.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Bina naam, bina darr — apni baat rakho. Koi tumhe pehchan nahi paayega.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/report">
                Report Karo <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/colleges">Colleges Dekho</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
