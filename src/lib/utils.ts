import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const bngMonths = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];
const bngDigits: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export function toBngDigits(n: number | string) {
  return n.toString().replace(/[0-9]/g, (w) => bngDigits[w] || w);
}

export function formatAmountBng(amt: number) {
  return amt
    .toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/[0-9]/g, (w) => bngDigits[w] || w);
}

export function formatDateBng(dateString: string) {
  if (!dateString) return "";
  let parts = dateString.split("-");
  return (
    toBngDigits(parts[2]) +
    " " +
    bngMonths[parseInt(parts[1]) - 1] +
    ", " +
    toBngDigits(parts[0])
  );
}

export function formatTimeBng(d: Date) {
  let h = d.getHours(),
    m = d.getMinutes(),
    ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return (
    toBngDigits(h < 10 ? "0" + h : h) +
    ":" +
    toBngDigits(m < 10 ? "0" + m : m) +
    " " +
    ampm
  );
}
