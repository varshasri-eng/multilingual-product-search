import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import DeliveryDatePicker from "./DeliveryDatePicker";

// Appears when adding an item to cart — prompts for a delivery date
// right then, per-item, rather than deferring it to checkout.
export default function ScheduleDeliveryModal({ open, onClose, productId, productName, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState("");

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: "'Fraunces', serif" }}>
        Schedule Delivery
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mb: 2 }}>
          When would you like <b>{productName}</b> delivered?
        </Typography>
        <DeliveryDatePicker productId={productId} onDateChange={setSelectedDate} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedDate}
          sx={{ boxShadow: "none", textTransform: "none" }}
        >
          Confirm & Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
}
