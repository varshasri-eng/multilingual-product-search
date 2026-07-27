import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

// Structural placeholder per the mentor's "leave space for now" —
// shows the trail but Category/Subcategory aren't real routes yet
// (no listing pages exist), so only Home links anywhere real.
export default function Breadcrumbs({ category, subcategory, productName }) {
  const parts = [category, subcategory, productName].filter(Boolean);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
      <Typography
        component={RouterLink}
        to="/"
        sx={{ fontSize: "0.82rem", color: "text.secondary", textDecoration: "none" }}
      >
        Home
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