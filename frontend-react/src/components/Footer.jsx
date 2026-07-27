import { Box, Typography, Container } from "@mui/material";

// Placeholder only, per "leave space for now" — reserves the layout
// slot so adding real footer content later (links, socials, etc.)
// doesn't shift the rest of the page.
export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid #E4DDCC",
        backgroundColor: "background.paper",
        py: 4,
        mt: 6,
      }}
    >
      <Container maxWidth="md">
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", textAlign: "center" }}>
          Store2Home — footer content coming soon
        </Typography>
      </Container>
    </Box>
  );
}