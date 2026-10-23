import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Junta classes de estilo e resolve conflitos (a última vence).
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
