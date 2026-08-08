import { createContext, useContext, useState, useEffect } from "react";
import { getSettings } from "../api/settings";

const BrandingContext = createContext(null);

const DEFAULTS = {
  site_name: "Store2Home",
  tagline: "Fresh groceries, delivered to your door",
  logo_url: null,
  favicon_url: null,
  primary_color: "#e89208",
  secondary_color: "#1f2937",
  accent_color: "#f59e0b",
  hero_title: "Fresh groceries, delivered to your door",
  hero_subtitle: "Shop your favourite Indian groceries in your own language.",
  hero_cta: "Start shopping",
  contact_email: null,
  contact_phone: null,
  address: null,
  footer_text: "© Store2Home. Fresh groceries, delivered.",
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
};

export function BrandingProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((r) => { setSettings({ ...DEFAULTS, ...r.data }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  // apply CSS custom properties for dynamic colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", settings.primary_color);
    root.style.setProperty("--color-secondary", settings.secondary_color);
    root.style.setProperty("--color-accent", settings.accent_color);
  }, [settings.primary_color, settings.secondary_color, settings.accent_color]);

  // update favicon
  useEffect(() => {
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = settings.favicon_url;
    }
  }, [settings.favicon_url]);

  return (
    <BrandingContext.Provider value={{ settings, loaded, setSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext) || { settings: DEFAULTS, loaded: true, setSettings: () => {} };
}
