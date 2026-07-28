import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, TextField, Button, Box, Typography, Alert } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: "'Fraunces', serif" }}>
        {mode === "login" ? "Log In" : "Create Account"}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {mode === "register" && (
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText={mode === "register" ? "At least 8 characters" : ""}
          />

          <Button type="submit" variant="contained" disabled={submitting} sx={{ boxShadow: "none" }}>
            {submitting ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </Button>

          <Typography sx={{ fontSize: "0.85rem", textAlign: "center", color: "text.secondary" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Box
              component="span"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              sx={{ color: "primary.dark", fontWeight: 600, cursor: "pointer" }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </Box>
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}