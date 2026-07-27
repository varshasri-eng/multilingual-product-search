import { IconButton, Badge } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useCart } from "../context/CartContext";

// Shows a real, live item count. No cart page to click through to
// yet — that's the next piece, same "leave space for now" pattern
// as breadcrumbs/footer.
export default function CartButton() {
  const { itemCount } = useCart();

  return (
    <IconButton aria-label="cart">
      <Badge badgeContent={itemCount} color="error">
        <ShoppingCartOutlinedIcon sx={{ color: "primary.dark" }} />
      </Badge>
    </IconButton>
  );
}
