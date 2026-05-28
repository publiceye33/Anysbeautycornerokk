import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const englishToBengaliMaps: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export function toBengaliNumber(num: number | string): string {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/[0-9]/g, (match) => englishToBengaliMaps[match] || match);
}
