import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

// This visitor's own view history — distinct from RelatedProducts'
// 'history' source, which is aggregate ("others who viewed this also
// viewed"). This is personal: "you looked at these."
export default function RecentlyViewed({ results }) {
  const navigate = useNavigate();

  if (!results || results.length === 0) return null;

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h3" sx={{ fontSize: "1.3rem", mb: 2.5 }}>
        Recently viewed
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 2,
        }}
      >
        {results.map((r) => (
          <Card
            key={r.product_id}
            variant="outlined"
            sx={{
              borderRadius: 2,
              transition: "transform 0.15s, border-color 0.15s",
              "&:hover": { transform: "translateY(-2px)", borderColor: "primary.main" },
            }}
          >
            <CardActionArea onClick={() => navigate(`/products/${r.product_id}`)} sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", mb: 0.5 }}>
                {r.product_name}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                {r.price ? `$${Number(r.price).toFixed(2)}` : ""}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}