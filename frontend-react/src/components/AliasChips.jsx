import { Box, Chip, Typography } from "@mui/material";

// The signature element: every regional/language name this product is
// actually searchable by, straight from search_terms. This is the part
// of the page that visually IS the project's premise — one product,
// many valid names.
export default function AliasChips({ aliases }) {
  const hasAliases = aliases && aliases.length > 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Also known as
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {hasAliases ? (
          aliases.map((alias) => (
            <Chip
              key={alias}
              label={alias}
              size="small"
              sx={{
                backgroundColor: "#E8EFE3",
                color: "secondary.main",
                fontWeight: 500,
              }}
            />
          ))
        ) : (
          <Chip label="No aliases recorded yet" size="small" variant="outlined" />
        )}
      </Box>
    </Box>
  );
}
