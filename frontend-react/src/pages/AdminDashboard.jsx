import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, Container, Typography, Tabs, Tab, AppBar, Toolbar } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import OrdersPanel from "../components/OrdersPanel";

// Protected shell only — tab content (Orders, Search Logs,
// Stock & Delivery Rules) gets built as separate pieces and dropped
// into the three placeholder sections below, one at a time.
export default function AdminDashboard() {
  const { customer, loading } = useAuth();
  const [tab, setTab] = useState(0);

  if (loading) return null; // wait for auth check to resolve before deciding

  // Not an admin (or not logged in at all) — don't render anything
  // admin-related, just bounce to the normal site.
  if (!customer || customer.role !== "admin") {
    return <Navigate to="/products/1" replace />;
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ backgroundColor: "background.paper", borderBottom: "1px solid #E4DDCC" }}
      >
        <Toolbar>
          <Typography
            sx={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "1.3rem",
              color: "primary.dark",
            }}
          >
            Store2Home — Admin
          </Typography>
        </Toolbar>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="Orders" />
          <Tab label="Search Logs" />
          <Tab label="Stock & Delivery Rules" />
        </Tabs>
      </AppBar>

      <Container maxWidth="md" sx={{ pt: 4, pb: 10 }}>
        {tab === 0 && <OrdersPanel />}
        {tab === 1 && <Typography color="text.secondary">Search logs panel — coming next.</Typography>}
        {tab === 2 && <Typography color="text.secondary">Stock & delivery rules panel — coming next.</Typography>}
      </Container>
    </Box>
  );
}