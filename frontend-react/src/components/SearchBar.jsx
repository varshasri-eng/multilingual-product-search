import { useState } from "react";
import { Box, TextField, Button } from "@mui/material";

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flex: 1, maxWidth: 560 }}
    >
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search — try a regional name, e.g. 'gongura' or 'haldi'"
        size="small"
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "999px 0 0 999px",
            backgroundColor: "background.default",
          },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        sx={{
          borderRadius: "0 999px 999px 0",
          px: 3,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        }}
      >
        Search
      </Button>
    </Box>
  );
}
