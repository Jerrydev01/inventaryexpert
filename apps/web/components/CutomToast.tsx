
import { toast } from "sonner";
import { Button } from "./ui/button";
import { AlertCircle, AlertTriangle, Check, Info, X } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";


// 1. Configuration Object (The "Theme" Source of Truth)
const toastStyles = {
  success: {
    icon: Check,
    border: "border-emerald-500/20",
    bg: "bg-emerald-50/90 dark:bg-emerald-950/90", // High opacity for legibility, but slight transparency
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-900 dark:text-emerald-100",
    message: "text-emerald-700 dark:text-emerald-300",
  },
  error: {
    icon: AlertCircle,
    border: "border-red-500/20",
    bg: "bg-red-50/90 dark:bg-red-950/90",
    iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    message: "text-red-700 dark:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/20",
    bg: "bg-amber-50/90 dark:bg-amber-950/90",
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100",
    message: "text-amber-700 dark:text-amber-300",
  },
  info: {
    icon: Info,
    border: "border-blue-500/20",
    bg: "bg-blue-50/90 dark:bg-blue-950/90",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
    message: "text-blue-700 dark:text-blue-300",
  },
};

// 2. The Reusable Component
// This component handles the layout and "beautiful" glassmorphism look
const AgricToast = ({
  t,
  type,
  title,
  message,
}: {
  t: string | number;
  type: keyof typeof toastStyles;
  title: string;
  message: string | React.ReactNode;
}) => {
  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <div
      className={`
        relative flex w-full max-w-md items-start gap-4 
        rounded-2xl border p-4 shadow-xl 
        backdrop-blur-md transition-all duration-300
        ${style.bg} ${style.border}
      `}
    >
      {/* Icon Section with Soft Glow */}
      <div
        className={`
          flex h-10 w-10 shrink-0 items-center justify-center 
          rounded-full shadow-sm ring-1 ring-inset ring-black/5
          ${style.iconBg}
        `}
      >
        <HugeiconsIcon icon={Icon} className={`h-5 w-5 ${style.iconColor}`} strokeWidth={2.5} />
      </div>

      {/* Content Section */}
      <div className="flex-1 pt-0.5">
        <h3 className={`text-sm font-bold leading-tight ${style.title}`}>
          {title}
        </h3>
        <div
          className={`mt-1 text-xs font-medium leading-relaxed ${style.message}`}
        >
          {message}
        </div>
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toast.dismiss(t)}
        className={`
          -mr-1 -mt-1 h-6 w-6 shrink-0 rounded-full 
          opacity-60 hover:bg-black/5 hover:opacity-100 
          dark:hover:bg-white/10
          ${style.title}
        `}
      >
        <HugeiconsIcon icon={X} className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// 3. Exported Utility
export const showToast = {
  success: (title: string, message: string | React.ReactNode) =>
    triggerToast("success", title, message),
  error: (title: string, message: string | React.ReactNode) =>
    triggerToast("error", title, message),
  warning: (title: string, message: string | React.ReactNode) =>
    triggerToast("warning", title, message),
  info: (title: string, message: string | React.ReactNode) =>
    triggerToast("info", title, message),
};

// Internal helper to trigger the toast
// We add 'unstyled: true' (if supported by your version)
// or simple class overrides to remove the default Sonner wrapper styles.
const triggerToast = (
  type: keyof typeof toastStyles,
  title: string,
  message: string | React.ReactNode
) => {
  toast.custom(
    (t) => <AgricToast t={t} type={type} title={title} message={message} />,
    {
      duration: type === "error" ? 5000 : 4000,
      // IMPORTANT: This removes the default white box/padding behavior in recent Sonner versions
      className: "p-0 bg-transparent border-none shadow-none",
    }
  );
};
