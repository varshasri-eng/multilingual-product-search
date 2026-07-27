import { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

// Local-only for now — nothing to wire it to yet since there's no
// cart. Reports its value up via onChange so a future cart feature
// can hook in without changing this component.
export default function QuantitySelector({ max = 99, onChange, disabled = false }) {
  const [qty, setQty] = useState(1);

  const update = (next) => {
    const clamped = Math.max(1, Math.min(max, next));
    setQty(clamped);
    if (onChange) onChange(clamped);
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: "1.5px solid #E4DDCC",
        borderRadius: "999px",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <IconButton
        size="small"
        onClick={() => update(qty - 1)}
        disabled={disabled || qty <= 1}
        sx={{ borderRadius: 0 }}
        aria-label="decrease quantity"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography sx={{ width: 32, textAlign: "center", fontWeight: 600 }}>
        {qty}
      </Typography>
      <IconButton
        size="small"
        onClick={() => update(qty + 1)}
        disabled={disabled || qty >= max}
        sx={{ borderRadius: 0 }}
        aria-label="increase quantity"
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}