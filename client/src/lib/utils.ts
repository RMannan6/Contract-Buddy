import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe date formatters
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";
  return dateObj.toLocaleDateString();
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";
  return dateObj.toLocaleString();
}

// Risk level helpers
export type RiskLevel = "high" | "medium" | "low";

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case "high":
      return "text-red-800";
    case "medium":
      return "text-amber-800";
    case "low":
      return "text-green-800";
  }
}

export function getRiskBgColor(risk: RiskLevel): string {
  switch (risk) {
    case "high":
      return "bg-red-100";
    case "medium":
      return "bg-amber-100";
    case "low":
      return "bg-green-100";
  }
}

export function getRiskBorderColor(risk: RiskLevel): string {
  switch (risk) {
    case "high":
      return "border-red-200";
    case "medium":
      return "border-amber-200";
    case "low":
      return "border-green-200";
  }
}

// Function to truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Function to copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy text: ", err);
    return false;
  }
}

// Email validation
export function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}
