import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
};

const variants = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-zinc-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ variant = "primary", className = "", children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
