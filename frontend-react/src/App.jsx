import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import AdminDashboard from "./pages/AdminDashboard";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Defaults to product 1 if no id is given, same as the
                  earlier static prototype's ?id= default. */}
              <Route path="/" element={<Navigate to="/products/1" replace />} />
              <Route path="/products/:id" element={<ProductDetailsPage />} />
              <Route path="/orders/:id" element={<OrderConfirmationPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}