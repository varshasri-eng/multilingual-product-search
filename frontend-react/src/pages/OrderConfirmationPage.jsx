import { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box, Container, Typography, Paper, Chip, CircularProgress, Alert, Divider, Link,
} from "@mui/material";
import { getOrder } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  pending: { bg: "#FFF3E0", fg: "#B8860B" },
  invoiced: { bg: "#EAF1FB", fg: "#2E5A9C" },
  paid: { bg: "#E8EFE3", fg: "#3F6B3F" },
  processed: { bg: "#E8EFE3", fg: "#3F6B3F" },
  completed: { bg: "#E8EFE3", fg: "#3F6B3F" },
  cancelled: { bg: "#FDECEA", fg: "#B23A2E" },
};

const STATUS_MESSAGES = {
  pending: "We've received your order and it's waiting for review.",
  invoiced: "Your invoice is ready — see the amount below.",
  paid: "Payment received — thanks! Your order will be processed soon.",
  processed: "Your order has been processed and is on its way.",
  completed: "Your order is complete.",
  cancelled: "This order was cancelled.",
};

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { customer, token, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !customer) return;
    setLoading(true);
    setError(null);
    getOrder(token, id)
      .then(setOrder)
      .catch((err) => {
        setError(err?.response?.data?.error || "Couldn't load this order.");
      })
      .finally(() => setLoading(false));
  }, [id, token, customer, authLoading]);

  if (authLoading) return null;

  if (!customer) {
    return (
      <Container maxWidth="sm" sx={{ pt: 8 }}>
        <Alert severity="info">Log in to view your order confirmation.</Alert>
      </Container>
    );
  }

  const colors = order ? (STATUS_COLORS[order.status] || STATUS_COLORS.pending) : STATUS_COLORS.pending;

  return (
    <Container maxWidth="sm" sx={{ pt: 6, pb: 10 }}>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && order && (
        <>
          <Typography
            sx={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.6rem", mb: 0.5 }}
          >
            Thanks for your order!
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            {STATUS_MESSAGES[order.status] || "Here's where things stand."}
          </Typography>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Order #{order.order_id}</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  Placed {new Date(order.created_at).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Chip
                  label={order.status}
                  size="small"
                  sx={{
                    backgroundColor: colors.bg, color: colors.fg,
                    fontWeight: 600, textTransform: "uppercase", fontSize: "0.68rem", mb: 0.5,
                  }}
                />
                <Typography sx={{ fontWeight: 700, color: "primary.dark" }}>
                  ${Number(order.total_amount).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {order.items.map((item) => (
              <Box
                key={item.order_item_id}
                sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", py: 0.5 }}
              >
                <Typography sx={{ fontSize: "inherit" }}>
                  {item.quantity} × {item.product_name}
                </Typography>
                <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
                  ${Number(item.price_at_order).toFixed(2)} each · delivers {item.delivery_date}
                </Typography>
              </Box>
            ))}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Invoice</Typography>
            {order.invoice ? (
              <Box sx={{ fontSize: "0.85rem" }}>
                <Typography sx={{ fontSize: "inherit" }}>
                  Invoice #{order.invoice.invoice_id} · ${Number(order.invoice.amount).toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
                  Issued {new Date(order.invoice.issued_at).toLocaleString()}
                </Typography>
                {order.invoice.paid_at && (
                  <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
                    Paid {new Date(order.invoice.paid_at).toLocaleString()}
                    {order.invoice.payment_note ? ` · ${order.invoice.payment_note}` : ""}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                Not yet issued — we'll invoice you once your order's been reviewed.
              </Typography>
            )}
          </Paper>

          <Typography sx={{ mt: 3, fontSize: "0.85rem" }}>
            <Link component={RouterLink} to={`/orders/${order.order_id}`}>
              Check back here anytime
            </Link>{" "}
            to see the latest status.
          </Typography>
        </>
      )}
    </Container>
  );
}
