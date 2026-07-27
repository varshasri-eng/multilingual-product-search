import { Box, Card, CardActionArea, Typography, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function RelatedProducts({ title, results }) {
  const navigate = useNavigate();

  if (!results || results.length === 0) return null;

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h3" sx={{ fontSize: "1.3rem", mb: 2.5 }}>
        {title}
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
            <CardActionArea
              onClick={() => navigate(`/products/${r.product_id}`)}
              sx={{ p: 2 }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", mb: 0.75 }}>
                {r.product_name}
              </Typography>
              <Chip
                label={r.source}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  backgroundColor: r.source === "history" ? "#FDECEA" : "#E8EFE3",
                  color: r.source === "history" ? "error.main" : "secondary.main",
                }}
              />
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
