export interface CategoryDef {
  key: string;
  label: string;
  emoji: string;
}

export const INCIDENT_CATEGORIES: CategoryDef[] = [
  { key: "fake_fine", label: "Fake Fines", emoji: "💸" },
  { key: "faculty", label: "Faculty Issues", emoji: "👨‍🏫" },
  { key: "placement", label: "Placement Fraud", emoji: "🎓" },
  { key: "hostel", label: "Hostel Problems", emoji: "🏠" },
  { key: "harassment", label: "Harassment", emoji: "⚖️" },
  { key: "sexual_violence", label: "Sexual Violence ", emoji: "🚨" },
  { key: "exam", label: "Exam Issues", emoji: "📚" },
  { key: "general", label: "Other Issues", emoji: "📋" },
];

export const REPORT_CATEGORIES: CategoryDef[] = [
  { key: "fake_fine", label: "Fake Fine / Arbitrary Charge", emoji: "💸" },
  { key: "faculty", label: "Faculty Misconduct", emoji: "👨‍🏫" },
  { key: "placement", label: "Placement Fraud", emoji: "🎓" },
  { key: "hostel", label: "Hostel Issue", emoji: "🏠" },
  { key: "harassment", label: "Ragging / Harassment", emoji: "⚖️" },
  { key: "sexual_violence", label: "Sexual Violence ", emoji: "🚨" },
  { key: "exam", label: "Exam Malpractice", emoji: "📚" },
  { key: "general", label: "Other Issue", emoji: "📋" },
];

/** Categories that REQUIRE mandatory proof before publish */
export const CRITICAL_CATEGORIES = new Set(["sexual_violence"]);

export function categoryLabel(key: string): string {
  return (
    REPORT_CATEGORIES.find((c) => c.key === key)?.label ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

export function categoryEmoji(key: string): string {
  return REPORT_CATEGORIES.find((c) => c.key === key)?.emoji ?? "📋";
}

export const CITIES = ["Bhopal", "Indore", "Jabalpur", "Delhi", "Mumbai"];

export const COLLEGE_TYPES = ["Engineering", "Medical", "Arts", "Commerce", "University", "Research"];

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
];

export const DEFAULT_KEYWORDS = [
  "fine","penalty","charge","harassment","ragging","fraud",
  "fake","bribe","corrupt","problem","issue","complaint",
  "rape","sexual","assault","molestation","exploitation",
];

/** Client-side keyword check for instant sexual-violence detection (no AI call needed) */
export function isSexualViolenceContent(text: string): boolean {
  const lower = text.toLowerCase();
  return [
    "rape", "raping", "raped", "rapist",
    "sexual assault", "sexual harass", "sexually harass", "sexually assault",
    "molestation", "molest", "sexually abuse", "sexual abuse",
    "youn shatana", "balatkar", "balatkaari",
  ].some((kw) => lower.includes(kw));
}
