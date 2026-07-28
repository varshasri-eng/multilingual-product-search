import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Structural placeholder per the mentor's "leave space for now" —
// shows the trail but Category/Subcategory aren't real routes yet
// (no listing pages exist), so only Home links anywhere real.
//
// Login-awareness: when logged in, "Home" becomes personalized
// ("{Name}'s Home" instead of "Home"). This is ONE reasonable
// interpretation of "breadcrumbs change by login" — worth confirming
// with the mentor whether this is the behavior he meant, since the
// original request didn't specify exactly what should change.
export default function Breadcrumbs({ category, subcategory, productName }) {
  const { customer } = useAuth();
  const parts = [category, subcategory, productName].filter(Boolean);
  const firstName = customer ? customer.name.split(" ")[0] : null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
      <Typography
        component={RouterLink}
        to="/"
        sx={{ fontSize: "0.82rem", color: "text.secondary", textDecoration: "none" }}
      >
        {firstName ? `${firstName}'s Home` : "Home"}
      </Typography>
      {parts.map((part, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>/</Typography>
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: i === parts.length - 1 ? "text.primary" : "text.secondary",
              fontWeight: i === parts.length - 1 ? 600 : 400,
            }}
          >
            {part}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}