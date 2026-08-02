import { useState, useEffect } from "react";
import { Box, TextField, Typography, CircularProgress, Alert } from "@mui/material";
import { getProductAvailability } from "../api";

// Uses a native <input type="date"> rather than a full calendar
// library — its built-in `min` attribute already prevents selecting
// any date before the earliest valid one, which is exactly what's
// needed here without adding a new dependency.
export default function DeliveryDatePicker({ productId, onDateChange }) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProductAvailability(productId)
      .then((data) => {
        setAvailability(data);
        setSelectedDate(data.earliest_delivery_date || "");
        if (onDateChange) onDateChange(data.earliest_delivery_date || "");
      })
      .catch(() => setError("Couldn't load delivery availability."))
      .finally(() => setLoading(false));
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setSelectedDate(e.target.value);
    if (onDateChange) onDateChange(e.target.value);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          Checking delivery availability…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ fontSize: "0.85rem" }}>{error}</Alert>;
  }

  // Fully blocked case: out of stock, no recurring restock cycle —
  // admin hasn't set a rule, so there's genuinely no valid date yet.
  if (!availability.earliest_delivery_date) {
    return (
      <Alert severity="warning" sx={{ fontSize: "0.85rem" }}>
        This item is currently unavailable for scheduled delivery.
      </Alert>
    );
  }

  return (
    <Box>
      {!availability.in_stock && (
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}>
          Currently out of stock — earliest delivery is{" "}
          {new Date(availability.earliest_delivery_date).toLocaleDateString(undefined, {
            weekday: "long", month: "long", day: "numeric",
          })}
          {" "}(next restock: {availability.restock_cycle}).
        </Typography>
      )}
      <TextField
        type="date"
        label="Delivery date"
        value={selectedDate}
        onChange={handleChange}
        size="small"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: availability.earliest_delivery_date }}
        fullWidth
      />
    </Box>
  );
}
