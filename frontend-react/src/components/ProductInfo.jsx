import { useState, useEffect } from "react";
import { Box, Paper, Typography, Button, Chip, Snackbar, Alert } from "@mui/material";
import AliasChips from "./AliasChips";
import QuantitySelector from "./QuantitySelector";
import { useCart } from "../context/CartContext";
import ScheduleDeliveryModal from "./ScheduleDeliveryModal";

export default function ProductInfo({ product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const {
    product_name,
    product_code,
    category_name,
    subcategory_name,
    price,
    stock_quantity,
    weight,
    description,
    tags,
    aliases,
    image_url,
  } = product;

  const hasRealImage = image_url && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [image_url]);

  const isOutOfStock = !stock_quantity || stock_quantity <= 0;
  const isLowStock = !isOutOfStock && stock_quantity <= 5;

  const handleAddToCartClick = () => {
    setDeliveryModalOpen(true);
  };

  const handleConfirmDelivery = (deliveryDate) => {
    addItem(product, quantity);
    setConfirmOpen(true);
    // deliveryDate is captured here but not yet stored on the cart
    // item — that's the next step, extending CartContext itself.
  };

  return (
    <Paper variant="outlined" sx={{ p: 4.5, mb: 5 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "280px 1fr" }, gap: 4.5 }}>
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1",
            backgroundColor: "#E8EFE3",
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "secondary.main",
            fontFamily: "'Fraunces', serif",
            fontSize: "3rem",
            fontWeight: 600,
            opacity: isOutOfStock ? 0.4 : 1,
            position: "relative",
          }}
        >
          {hasRealImage ? (
            <Box
              component="img"
              src={image_url}
              alt={product_name}
              onError={() => setImageFailed(true)}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "🌿"
          )}
          {isOutOfStock && (
            <Chip
              label="Out of Stock"
              size="small"
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "error.main",
                color: "white",
                fontWeight: 700,
                fontSize: "0.68rem",
                textTransform: "uppercase",
              }}
            />
          )}
        </Box>

        <Box>
          <Typography
            variant="caption"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "secondary.main",
              display: "block",
              mb: 1,
            }}
          >
            {[category_name, subcategory_name].filter(Boolean).join(" / ")}
          </Typography>

          <Typography variant="h1" sx={{ fontSize: "2.1rem", mb: 0.5, lineHeight: 1.15 }}>
            {product_name}
          </Typography>

          <Typography
            sx={{ fontFamily: "monospace", fontSize: "0.78rem", color: "text.secondary", mb: 2.25 }}
          >
            {product_code}
            {weight ? `  ·  ${weight}` : ""}
          </Typography>

          <AliasChips aliases={aliases} />

          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25, mb: 0.75 }}>
            <Typography variant="h2" sx={{ fontSize: "1.7rem", color: "primary.dark" }}>
              {price ? `$${Number(price).toFixed(2)}` : ""}
            </Typography>
            <Chip
              label={
                isOutOfStock
                  ? "Out of stock"
                  : isLowStock
                  ? `Only ${stock_quantity} left`
                  : `${stock_quantity} in stock`
              }
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                backgroundColor: isOutOfStock ? "#FDECEA" : isLowStock ? "#FFF3E0" : "#E8EFE3",
                color: isOutOfStock ? "error.main" : isLowStock ? "#B8860B" : "secondary.main",
              }}
            />
          </Box>

          {weight && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.secondary", fontWeight: 600, mb: 1 }}
              >
                Weight
              </Typography>
              <Box
                sx={{
                  display: "inline-block",
                  px: 2,
                  py: 0.75,
                  border: "2px solid",
                  borderColor: "primary.main",
                  borderRadius: 2,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "primary.dark",
                  backgroundColor: "#FBF3E1",
                }}
              >
                {weight}
              </Box>
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", fontWeight: 600, mb: 0.5 }}
          >
            Description
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.95rem", mb: 3 }}>
            {description}
          </Typography>

          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", fontWeight: 600, mb: 1 }}
          >
            Quantity
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <QuantitySelector
              max={stock_quantity > 0 ? stock_quantity : 1}
              onChange={setQuantity}
              disabled={isOutOfStock}
            />
            <Button
              variant="contained"
              disabled={isOutOfStock}
              onClick={handleAddToCartClick}
              color={isOutOfStock ? "inherit" : "primary"}
              sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" }, px: 3 }}
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </Box>

          {tags && tags.length > 0 && (
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mt: 3 }}>
              <b style={{ color: "#2B2620" }}>{tags.join(", ")}</b>
            </Typography>
          )}
        </Box>
      </Box>

      <Snackbar
        open={confirmOpen}
        autoHideDuration={2500}
        onClose={() => setConfirmOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setConfirmOpen(false)}>
          Added {quantity} × {product_name} to cart
        </Alert>
      </Snackbar>

      <ScheduleDeliveryModal
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        productId={product.product_id}
        productName={product_name}
        onConfirm={handleConfirmDelivery}
      />
    </Paper>
  );
}