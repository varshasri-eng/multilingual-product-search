import { Box, Card, CardActionArea, Typography, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";

const TERM_TYPE_COLORS = {
  official: { bg: "#E8EFE3", fg: "#3F6B3F" },
  alias: { bg: "#E8EFE3", fg: "#3F6B3F" },
  regional: { bg: "#EAF1FB", fg: "#2E5A9C" },
  typo: { bg: "#FDECEA", fg: "#B23A2E" },
  hashtag: { bg: "#FBF0DC", fg: "#8F6A08" },
};

// Shows EVERY direct match for a keyword — not one top match's
// related items. See api.js's searchProducts() / Flask's /api/search.
export default function SearchResults({ query, results }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h3" sx={{ fontSize: "1.3rem", mb: 0.5 }}>
        Search results
      </Typography>
      <Typography sx={{ fontSize: "0.88rem", color: "text.secondary", mb: 2.5 }}>
        {results.length > 0
          ? `${results.length} match${results.length > 1 ? "es" : ""} for "${query}"`
          : `No matches found for "${query}"`}
      </Typography>

      {results.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 2,
          }}
        >
          {results.map((r) => {
            const colors = TERM_TYPE_COLORS[r.term_type] || TERM_TYPE_COLORS.alias;
            return (
              <Card
                key={r.product_id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  transition: "transform 0.15s, border-color 0.15s",
                  "&:hover": { transform: "translateY(-2px)", borderColor: "primary.main" },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/products/${r.product_id}`)}
                  sx={{ p: 2 }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", mb: 0.5 }}>
                    {r.product_name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.75 }}>
                    matched: "{r.matched_term}"
                  </Typography>
                  <Chip
                    label={r.term_type}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      backgroundColor: colors.bg,
                      color: colors.fg,
                    }}
                  />
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
