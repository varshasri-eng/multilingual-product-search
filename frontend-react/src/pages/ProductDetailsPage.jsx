import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Container, Alert, CircularProgress } from "@mui/material";
import SearchBar from "../components/SearchBar";
import ProductInfo from "../components/ProductInfo";
import RelatedProducts from "../components/RelatedProducts";
import RecentlyViewed from "../components/RecentlyViewed";
import SearchResults from "../components/SearchResults";
import Breadcrumbs from "../components/Breadcrumbs";
import Footer from "../components/Footer";
import CartButton from "../components/CartButton";
import AuthButton from "../components/AuthButton";
import { getProduct, getRelatedByProductId, searchProducts, getRecentlyViewed } from "../api";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const productId = id || "1"; // default product if no route param

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // null = no search run yet; distinct from an empty array (search
  // ran, found nothing)
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const loadProduct = useCallback(async (pid) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProduct(pid);
      setProduct(data);
      const relatedData = await getRelatedByProductId(pid);
      setRelated(relatedData.results || []);
      // getProduct() above already logged this visit server-side, so
      // this history read reflects prior visits, excluding the one
      // that just happened.
      const recentData = await getRecentlyViewed(pid);
      setRecentlyViewed(recentData.results || []);
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the API. Is the backend running on localhost:5000?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProduct(productId);
    // Clear any previous search results when navigating to a new product
    setSearchQuery(null);
    setSearchResults([]);
  }, [productId, loadProduct]);

  const handleSearch = async (keyword) => {
    try {
      // Real multi-result search — every direct match, not one top
      // match's related items.
      const data = await searchProducts(keyword);
      setSearchQuery(keyword);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      setSearchQuery(keyword);
      setSearchResults([]);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ backgroundColor: "background.paper", borderBottom: "1px solid #E4DDCC" }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            sx={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "1.3rem",
              color: "primary.dark",
              whiteSpace: "nowrap",
            }}
          >
            Store2Home
          </Typography>
          <SearchBar onSearch={handleSearch} />
          <AuthButton />
          <CartButton />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pt: 5, pb: 10 }}>
        {searchQuery !== null && (
          <SearchResults query={searchQuery} results={searchResults} />
        )}

        {loading && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && product && (
          <>
            <Breadcrumbs
              category={product.category_name}
              subcategory={product.subcategory_name}
              productName={product.product_name}
            />
            <ProductInfo product={product} />
            <RelatedProducts title="Related products" results={related} />
            <RecentlyViewed results={recentlyViewed} />
          </>
        )}
      </Container>

      <Footer />
    </Box>
  );
}