import { useState } from "react";
import { Button, Typography, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { customer, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (customer) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          Hi, {customer.name.split(" ")[0]}
        </Typography>
        <Button
          size="small"
          onClick={logout}
          sx={{ fontSize: "0.8rem", color: "text.secondary", textTransform: "none" }}
        >
          Log out
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Button
        size="small"
        onClick={() => setModalOpen(true)}
        sx={{ fontSize: "0.85rem", color: "primary.dark", textTransform: "none", fontWeight: 600 }}
      >
        Log In
      </Button>
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}