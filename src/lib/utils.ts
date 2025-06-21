import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeOption(str: string): string {
  // Removes all non-alphanumeric characters and converts to lowercase
  // e.g., "a) 77" becomes "a77"
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
