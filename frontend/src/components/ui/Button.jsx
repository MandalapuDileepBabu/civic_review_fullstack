import { Link } from "react-router-dom";

const variants = {
  primary: "bg-civic-600 text-white hover:bg-civic-700 shadow-sm",
  secondary: "border-2 border-civic-600 text-civic-700 hover:bg-civic-50",
  ghost: "text-civic-700 hover:bg-civic-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  to,
  ...props
}) {
  const cls = `inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-civic-500 focus:ring-offset-2 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}
