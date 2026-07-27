import { createTheme } from "@mui/material/styles";

// Same token system as the earlier HTML prototype — spice-drawer
// palette (mustard + curry-leaf green), Fraunces for display text,
// Inter for UI. Kept consistent so the visual identity carries over
// as this moves from a static demo page into the real portal.
const theme = createTheme({
  palette: {
    background: { default: "#F5F2EA", paper: "#FFFFFF" },
    text: { primary: "#2B2620", secondary: "#6B6255" },
    primary: { main: "#B8860B", dark: "#8F6A08" }, // mustard
    secondary: { main: "#3F6B3F" }, // leaf green
    error: { main: "#B23A2E" }, // chili
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
    h2: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
    h3: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
  },
  shape: { borderRadius: 14 },
});

export default theme;
