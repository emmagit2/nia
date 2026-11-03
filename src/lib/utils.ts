import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(kobo: number) {
  return `₦${(kobo).toLocaleString("en-NG")}`;
}

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 6000,
    credits: 30,
    popular: false,
    tagline: "Perfect to start your hustle",
    paystackAmount: 600000,
  },
  {
    id: "hustler",
    name: "Hustler",
    price: 12000,
    credits: 70,
    popular: true,
    tagline: "For the real Hustler",
    paystackAmount: 1200000,
  },
  {
    id: "boss",
    name: "Boss",
    price: 16000,
    credits: 95,
    popular: false,
    tagline: "Boss Mode activated",
    paystackAmount: 1600000,
  },
] as const;

export const EXTRA_PACK = {
  name: "Extra Pack",
  price: 2000,
  credits: 10,
  paystackAmount: 200000,
};
