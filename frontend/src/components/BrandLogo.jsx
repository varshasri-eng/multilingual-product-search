import { useBranding } from "../context/BrandingContext";

/**
 * Renders the site logo (image or text fallback) with consistent styling.
 * Props: size = "sm" | "md" | "lg"
 */
export default function BrandLogo({ size = "md" }) {
  const { settings } = useBranding();
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-lg",
    lg: "w-12 h-12 text-xl",
  };

  if (settings.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt={settings.site_name}
        className={`${sizes[size]} rounded-xl object-contain shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-xl bg-gradient-to-br from-brand-400 to-brand-600
                   flex items-center justify-center text-white font-bold shadow-sm`}>
      {settings.site_name ? settings.site_name.charAt(0).toUpperCase() : "S"}
    </div>
  );
}
