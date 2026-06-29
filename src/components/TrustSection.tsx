import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, Ghost, EyeOff, Lock, Trash2, ArrowRight, MapPinOff, ShieldOff } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

const PROOFS = [
  {
    icon: Ghost,
    title: "Koi Naam Nahi",
    desc: "Na email, na phone, na real naam. Bas ek ghost identity jo sirf tumhare device pe banti hai.",
    bg: "bg-white",
    rot: "-rotate-1",
  },
  {
    icon: MapPinOff,
    title: "No Location, No IP",
    desc: "Hum tumhari location ya IP address kabhi nahi maangte aur na hi store karte. Trace karne ke liye kuch hai hi nahi.",
    bg: "bg-postit",
    rot: "rotate-1",
  },
  {
    icon: ShieldOff,
    title: "Zero Permissions",
    desc: "Camera, contacts, mic, GPS — kisi cheez ki permission nahi maangi jaati. App sirf wahi kaam karta hai jo tum karte ho.",
    bg: "bg-white",
    rot: "rotate-1",
  },
  {
    icon: EyeOff,
    title: "College Ko Pata Nahi",
    desc: "Tumhari report kisi college, faculty ya admin se link nahi hoti. Identity trace nahi ho sakti.",
    bg: "bg-postit",
    rot: "-rotate-1",
  },
  {
    icon: Lock,
    title: "Proof Pe Blur Tool",
    desc: "Screenshot ya document upload karne se pehle naam/face blur kar sakte ho — built-in tool se.",
    bg: "bg-white",
    rot: "-rotate-1",
  },
  {
    icon: Trash2,
    title: "Jab Chaho Mit Jao",
    desc: "'Forget Me' dabao aur tumhari identity gayab. Kuch bhi store nahi rehta.",
    bg: "bg-postit",
    rot: "rotate-1",
  },
];

const FAQS = [
  {
    q: "Kya mera naam kisi ko dikhega?",
    a: "Nahi. Tum sirf ek random ghost username se dikhte ho. Tumhara real naam, email ya phone kahin store hi nahi hota — isliye kisi ko dikhne ka sawaal hi nahi.",
  },
  {
    q: "Kya college ya faculty ko pata chal sakta hai maine report kiya?",
    a: "Bilkul nahi. Reports kisi identity se link nahi hoti. College, faculty ya koi admin tumhe trace nahi kar sakta.",
  },
  {
    q: "Login ke liye email/phone kyun nahi maangte?",
    a: "Kyunki hum chahte hi nahi ki tumhari koi pehchaan ho. App khulte hi auto anonymous identity ban jaati hai — isse leak hone ka koi data hi nahi bachta.",
  },
  {
    q: "Mera data kahan jaata hai?",
    a: "Sirf tumhari report ka content (text/proof) save hota hai taaki dusre students dekh saken. Koi personal identity attached nahi hoti.",
  },
  {
    q: "Kya app meri location ya IP track karta hai?",
    a: "Nahi. Hum tumhari GPS location, IP address ya device ID kabhi capture nahi karte. Iska matlab tumhare physical location ka koi record hi nahi banta.",
  },
  {
    q: "Kya app koi permission maangta hai (camera, contacts, location)?",
    a: "Nahi. App khud se koi permission nahi maangta. Sirf jab tum khud proof upload karte ho, tab tum apni marzi se file choose karte ho — wahi.",
  },
  {
    q: "Agar main apna data delete karna chahun to?",
    a: "Top-right menu me 'Forget Me' option hai. Ek click me tumhari local identity mit jaati hai. Kabhi bhi kar sakte ho.",
  },
  {
    q: "Kya police ya college mujhe legally trace kar sakte hain?",
    a: "Trace karne ke liye koi personal data, IP ya login record hona chahiye — humare paas wahi nahi hai. Jo cheez exist hi nahi karti, woh kisi ko di bhi nahi ja sakti.",
  },
];

export function TrustSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      {/* Heading */}
      <div className="mb-10 text-center">
        <span
          className="inline-flex -rotate-2 items-center gap-2 border-2 border-border bg-success/15 px-4 py-1.5 text-sm font-semibold text-success shadow-ink-soft"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <Shield className="h-3.5 w-3.5" /> Tumhari Safety, Hamari Zimmedari
        </span>
        <h2 className="mt-5 font-display text-4xl font-bold">Darro Mat — Tum Safe Ho 🔒</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Bahut students darte hain ki "kahin pata na chal jaye". Isliye humne app aise banaya hai
          ki tumhari pehchaan kabhi store hi na ho.
        </p>
      </div>

      {/* Proof cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {PROOFS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-start gap-4 border-2 border-border p-5 shadow-ink ${p.bg} ${p.rot}`}
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

      {/* FAQ */}
      <div className="mt-14">
        <h3 className="mb-6 text-center font-display text-3xl font-bold">❓ Common Sawaal</h3>
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
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="mt-6 text-center">
          <Button asChild variant="outline">
            <Link to="/trust">
              Poori Privacy Detail Padho <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
