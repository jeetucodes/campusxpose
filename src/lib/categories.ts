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
  { key: "exam", label: "Exam Issues", emoji: "📚" },
];

export const REPORT_CATEGORIES: CategoryDef[] = [
  { key: "fake_fine", label: "Fake Fine / Arbitrary Charge", emoji: "💸" },
  { key: "faculty", label: "Faculty Misconduct", emoji: "👨‍🏫" },
  { key: "placement", label: "Placement Fraud", emoji: "🎓" },
  { key: "hostel", label: "Hostel Issue", emoji: "🏠" },
  { key: "harassment", label: "Ragging / Harassment", emoji: "⚖️" },
  { key: "exam", label: "Exam Malpractice", emoji: "📚" },
  { key: "general", label: "Other Issue", emoji: "📋" },
];

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
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","MP","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
];

export const DEFAULT_KEYWORDS = [
  "fine","penalty","charge","harassment","ragging","fraud",
  "fake","bribe","corrupt","problem","issue","complaint",
];
