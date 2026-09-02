import {
  Bot,
  Building2,
  CircleUserRound,
  Crown,
  Diamond,
  Gem,
  Landmark,
  Plane,
  Shield,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { AVATAR_OPTIONS } from "@/lib/party/client-id";

const ICONS: Record<string, LucideIcon> = {
  user: CircleUserRound,
  crown: Crown,
  shield: Shield,
  star: Star,
  trophy: Trophy,
  landmark: Landmark,
  building: Building2,
  plane: Plane,
  diamond: Diamond,
  gem: Gem,
  bot: Bot,
  sparkles: Sparkles,
};

const fallback = AVATAR_OPTIONS[0]!;

export function AvatarMark({
  value,
  label,
  size = "md",
  className = "",
}: {
  value?: string | null;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const avatar = AVATAR_OPTIONS.find((a) => a.id === value) ?? fallback;
  const Icon = ICONS[avatar.icon] ?? CircleUserRound;
  const sizes = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-10 w-10 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
    xl: "h-16 w-16 rounded-2xl",
  };
  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  return (
    <span
      role="img"
      aria-label={label ?? avatar.label}
      title={label ?? avatar.label}
      className={`inline-grid shrink-0 place-items-center border border-border/70 shadow-sm ${sizes[size]} ${className}`}
      style={{
        background: `linear-gradient(145deg, ${avatar.accent}, color-mix(in oklab, ${avatar.accent} 52%, var(--card)))`,
        color: "var(--foreground)",
      }}
    >
      <Icon className={iconSizes[size]} strokeWidth={2.4} aria-hidden />
    </span>
  );
}