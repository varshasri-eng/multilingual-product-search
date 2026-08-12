import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Chip, CircularProgress, Alert, Select, MenuItem, Paper, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Stack,
} from "@mui/material";
import { getAdminOrders, removeOrderItem, replaceOrderItem, searchProducts } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  pending: { bg: "#FFF3E0", fg: "#B8860B" },
  invoiced: { bg: "#EAF1FB", fg: "#2E5A9C" },
  paid: { bg: "#E8EFE3", fg: "#3F6B3F" },
  processed: { bg: "#E8EFE3", fg: "#3F6B3F" },
  completed: { bg: "#E8EFE3", fg: "#3F6B3F" },
  cancelled: { bg: "#FDECEA", fg: "#B23A2E" },
};

export default function OrdersPanel() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which item's "replace" dialog is open, if any: { orderId, item }
  const [editing, setEditing] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const searchTimer = useRef(null);

  // Row-level "remove" in flight, so only that row's button disables.
  const [removingItemId, setRemovingItemId] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdminOrders(token, statusFilter || undefined)
      .then((data) => setOrders(data.results || []))
      .catch(() => setError("Couldn't load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge a partial order response (order_id, status, total_amount,
  // items) back into the list without losing customer_name/email/
  // created_at, which those endpoints don't return.
  const mergeUpdatedOrder = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.order_id === updatedOrder.order_id ? { ...o, ...updatedOrder } : o))
    );
  };

  const handleRemove = (orderId, item) => {
    if (!window.confirm(`Remove ${item.quantity} × ${item.product_name} from this order?`)) return;
    setRemovingItemId(item.order_item_id);
    removeOrderItem(token, orderId, item.order_item_id)
      .then(mergeUpdatedOrder)
      .catch((err) => {
        window.alert(err?.response?.data?.error || "Couldn't remove that item.");
      })
      .finally(() => setRemovingItemId(null));
  };

  const openEdit = (orderId, item) => {
    setEditing({ orderId, item });
    setEditQuantity(String(item.quantity));
    setSelectedProduct(null);
    setProductQuery("");
    setProductOptions([]);
    setSaveError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
  };

  // Debounced product search as the admin types, reusing the same
  // search the storefront uses.
  useEffect(() => {
    if (!editing) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!productQuery.trim()) {
      setProductOptions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      searchProducts(productQuery.trim())
        .then((data) => setProductOptions(data.results || []))
        .catch(() => setProductOptions([]));
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [productQuery, editing]);

  const handleSaveEdit = () => {
    if (!editing) return;
    const { orderId, item } = editing;

    const updates = {};
    const quantityNum = Number(editQuantity);
    if (editQuantity !== "" && quantityNum !== item.quantity) {
      if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
        setSaveError("Quantity must be a positive whole number.");
        return;
      }
      updates.quantity = quantityNum;
    }
    if (selectedProduct && selectedProduct.product_id !== item.product_id) {
      updates.product_id = selectedProduct.product_id;
    }

    if (Object.keys(updates).length === 0) {
      setSaveError("Change the quantity or pick a different product first.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    replaceOrderItem(token, orderId, item.order_item_id, updates)
      .then((updatedOrder) => {
        mergeUpdatedOrder(updatedOrder);
        closeEdit();
      })
      .catch((err) => {
        setSaveError(err?.response?.data?.error || "Couldn't save that change.");
        setSaving(false);
      });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h3" sx={{ fontSize: "1.2rem" }}>Orders</Typography>
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          sx={{ minWidth: 160, fontSize: "0.85rem" }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="invoiced">Invoiced</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="processed">Processed</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      </Box>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && orders.length === 0 && (
        <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
          No orders{statusFilter ? ` with status "${statusFilter}"` : ""} yet.
        </Typography>
      )}

      {!loading && orders.map((order) => {
        const colors = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
        const editable = order.status === "pending";
        return (
          <Paper key={order.order_id} variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>
                  Order #{order.order_id} — {order.customer_name}
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  {order.customer_email} · {new Date(order.created_at).toLocaleString()}
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
                sx={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: "0.85rem", py: 0.5, gap: 2,
                }}
              >
                <Typography sx={{ fontSize: "inherit" }}>
                  {item.quantity} × {item.product_name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography sx={{ fontSize: "inherit", color: "text.secondary", whiteSpace: "nowrap" }}>
                    ${Number(item.price_at_order).toFixed(2)} each · delivers {item.delivery_date}
                  </Typography>
                  {editable && (
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => openEdit(order.order_id, item)}>
                        Replace
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={removingItemId === item.order_item_id}
                        onClick={() => handleRemove(order.order_id, item)}
                      >
                        {removingItemId === item.order_item_id ? "Removing…" : "Remove"}
                      </Button>
                    </Stack>
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        );
      })}

      <Dialog open={!!editing} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "'Fraunces', serif" }}>
          Replace item{editing ? `: ${editing.item.product_name}` : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
              Change the quantity, swap in a different product (e.g. a different brand of the
              same item), or both. Leave a field as-is to keep it unchanged.
            </Typography>

            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              inputProps={{ min: 1 }}
            />

            <Autocomplete
              options={productOptions}
              getOptionLabel={(opt) => opt.product_name || ""}
              isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
              value={selectedProduct}
              onChange={(e, value) => setSelectedProduct(value)}
              inputValue={productQuery}
              onInputChange={(e, value) => setProductQuery(value)}
              noOptionsText={productQuery.trim() ? "No matching products" : "Type to search products"}
              renderInput={(params) => (
                <TextField {...params} label="Replace with product (leave blank to keep same)" size="small" />
              )}
            />

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeEdit} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}