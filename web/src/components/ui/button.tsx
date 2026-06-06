import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
};

const variants = {
  primary: "border-2 border-[var(--line)] bg-[var(--line)] text-white hover:bg-zinc-800",
  secondary: "border-2 border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--sun)]",
  danger: "border-2 border-red-800 bg-red-600 text-white hover:bg-red-700",
};

export function Button({ variant = "primary", className = "", children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`focus-ink min-h-11 rounded-md px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
