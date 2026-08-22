import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiPackage,
  FiSearch,
  FiTrash2,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiX,
} from "react-icons/fi";

import {
  getAdminOrders,
  removeOrderItem,
  replaceOrderItem,
  raiseOrderInvoice,
  updateOrderInvoice,
} from "../../api/admin";
import api from "../../api/client";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");

  const [replaceModal, setReplaceModal] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [replacementQuantity, setReplacementQuantity] = useState(1);
  const [replacing, setReplacing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await getAdminOrders();
      setOrders(res.data.results || []);
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not load orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const toggleOrder = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRemove = async (order, item) => {
    const confirmed = window.confirm(
      `Remove "${item.product_name}" from order ${order.order_number}?`
    );

    if (!confirmed) return;

    try {
      await removeOrderItem(order.id, item.id);
      toast.success("Order item removed.");
      await loadOrders();
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not remove item."
      );
    }
  };

  // ── EDIT INVOICE ────────────────────────────────────────────
  // Edit Invoice never creates anything by itself. It only opens the
  // editor: on an existing invoice it loads that invoice, on a new
  // order it prepares an in-memory draft. The invoice is only ever
  // persisted when the admin clicks "Save Invoice".
  const handleEditInvoice = (order) => {
    if (order.invoice) {
      openInvoiceEditor(order);
      return;
    }

    openDraftInvoiceEditor(order);
  };

  const openInvoiceEditor = (order) => {
    if (!order.invoice) {
      toast.error("This order does not have an invoice yet.");
      return;
    }

    setEditingInvoice({
      orderId: order.id,
      invoice: {
        ...order.invoice,
        discount_amount: Number(
          order.invoice.discount_amount || 0
        ),
        items: (order.invoice.items || []).map((item) => ({
          ...item,
        })),
      },
    });
  };

  // Builds a draft invoice entirely in frontend state from the
  // order's existing items/totals. Nothing is sent to the backend
  // here — this only prepares what the editor needs to display.
  const openDraftInvoiceEditor = (order) => {
    const items = (order.items || []).map((item) => ({
      id: item.id,
      order_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      taxable: false,
      tax_percentage: 0,
      tax_amount: 0,
    }));

    setEditingInvoice({
      orderId: order.id,
      invoice: {
        id: null,
        invoice_number: "Draft",
        subtotal: Number(order.subtotal || 0),
        delivery_fee: Number(order.delivery_fee || 0),
        discount_amount: 0,
        tax_amount: 0,
        total_amount: Number(order.total_amount || 0),
        items,
      },
    });
  };

  const closeInvoiceEditor = () => {
    if (savingInvoice) return;
    setEditingInvoice(null);
  };

  const updateInvoiceItem = (itemId, field, value) => {
    setEditingInvoice((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          items: prev.invoice.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  [field]:
                    field === "tax_percentage"
                      ? value
                      : value,
                }
              : item
          ),
        },
      };
    });
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    const isExistingInvoice = Boolean(editingInvoice.invoice.id);

    const discountAmount = Number(
      editingInvoice.invoice.discount_amount || 0
    );

    try {
      setSavingInvoice(true);

      let res;

      if (isExistingInvoice) {
        // Existing invoice — update it.
        res = await updateOrderInvoice(editingInvoice.orderId, {
          discount_amount: discountAmount,
          items: editingInvoice.invoice.items.map((item) => ({
            id: item.id,
            taxable: item.taxable,
            tax_percentage: Number(item.tax_percentage) || 0,
          })),
        });
      } else {
        // No invoice yet — this is the only place a new invoice
        // gets created.
        res = await raiseOrderInvoice(editingInvoice.orderId, {
          discount_amount: discountAmount,
          items: editingInvoice.invoice.items.map((item) => ({
            order_item_id: item.order_item_id,
            taxable: item.taxable,
            tax_percentage: Number(item.tax_percentage) || 0,
          })),
        });
      }

      toast.success(
        res.data?.message ||
          (isExistingInvoice
            ? "Invoice updated successfully."
            : "Invoice created successfully.")
      );

      setEditingInvoice(null);
      await loadOrders();
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not save invoice."
      );
    } finally {
      setSavingInvoice(false);
    }
  };

  const openReplace = (order, item) => {
    setReplaceModal({ order, item });
    setProductSearch("");
    setProducts([]);
    setSelectedProduct(null);
    setReplacementQuantity(item.quantity || 1);
  };

  const closeReplace = () => {
    setReplaceModal(null);
    setProductSearch("");
    setProducts([]);
    setSelectedProduct(null);
    setReplacementQuantity(1);
  };

  const searchProducts = async (value) => {
    setProductSearch(value);

    if (!value.trim()) {
      setProducts([]);
      return;
    }

    try {
      setProductLoading(true);

      const res = await api.get("/products", {
        params: {
          search: value,
        },
      });

      setProducts(
        res.data.products ||
        res.data.results ||
        []
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not search products."
      );
    } finally {
      setProductLoading(false);
    }
  };

  const handleReplace = async () => {
    if (!replaceModal || !selectedProduct) {
      toast.error("Please select a replacement product.");
      return;
    }

    const quantity = Number(replacementQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive whole number.");
      return;
    }

    try {
      setReplacing(true);

      await replaceOrderItem(
        replaceModal.order.id,
        replaceModal.item.id,
        {
          replacement_product_id: selectedProduct.id,
          quantity,
        }
      );

      toast.success("Order item replaced.");
      closeReplace();
      await loadOrders();
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not replace item."
      );
    } finally {
      setReplacing(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      order.order_number?.toLowerCase().includes(q) ||
      order.customer_name?.toLowerCase().includes(q) ||
      order.status?.toLowerCase().includes(q) ||
      order.items?.some((item) =>
        item.product_name?.toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer orders and replace unavailable items.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2.5 bg-white
                     border border-gray-200 rounded-xl text-sm
                     font-medium text-gray-700 hover:bg-gray-50"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
        <div className="relative">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2
                       text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, customer, product..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200
                       rounded-xl text-sm outline-none
                       focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
          Loading orders...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100
                        p-12 text-center">
          <FiPackage
            className="mx-auto text-gray-300 mb-3"
            size={40}
          />
          <p className="font-semibold text-gray-700">
            No orders found
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Orders placed by customers will appear here.
          </p>
        </div>
      )}

      {/* Orders */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const isExpanded = expanded[order.id];

          return (
            <div
              key={order.id}
              className="bg-white border border-gray-100
                         rounded-2xl shadow-sm overflow-hidden"
            >

              {/* Order header */}
              <button
                onClick={() => toggleOrder(order.id)}
                className="w-full text-left p-5 hover:bg-gray-50
                           transition-colors"
              >
                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl bg-brand-50
                                    text-brand-600 flex items-center
                                    justify-center">
                      <FiPackage size={21} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-gray-900">
                          {order.order_number}
                        </h2>

                        <span
                          className="px-2 py-0.5 rounded-full
                                     bg-yellow-50 text-yellow-700
                                     text-xs font-semibold"
                        >
                          {order.status}
                        </span>

                        {order.ready_to_ship === false && (
                          <span
                            className="px-2 py-0.5 rounded-full
                                       bg-red-50 text-red-600
                                       text-xs font-semibold"
                            title="One or more items are no longer
                                   fulfillable (deactivated, removed,
                                   or a stock issue)."
                          >
                            Not ready to ship
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {order.customer_name || "Unknown customer"}
                        {" · "}
                        {order.items?.length || 0} item
                        {order.items?.length === 1 ? "" : "s"}
                      </p>
                    </div>

                  </div>

                  {isExpanded ? (
                    <FiChevronUp className="text-gray-400" />
                  ) : (
                    <FiChevronDown className="text-gray-400" />
                  )}

                </div>
              </button>

              {/* Expanded order */}
              {isExpanded && (
                <div className="border-t border-gray-100">

                  {/* Items */}
                  <div className="p-5 space-y-3">

                    <h3 className="text-sm font-semibold text-gray-700">
                      Order Items
                    </h3>

                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-100 rounded-xl
                                   p-4"
                      >
                        <div className="flex items-center justify-between">

                          <div>
                            <p className="font-semibold text-gray-900">
                              {item.product_name}
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              Quantity: {item.quantity}
                              {" · "}
                              {item.unit || "unit"}
                              {" · "}
                              ${item.unit_price.toFixed(2)}
                            </p>

                            <p className="text-xs text-gray-400 mt-1">
                              Current stock:{" "}
                              {item.stock_quantity ?? "Unknown"}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              ${item.line_total.toFixed(2)}
                            </p>

                            <div className="flex gap-2 mt-3">

                              <button
                                onClick={() =>
                                  openReplace(order, item)
                                }
                                className="flex items-center gap-1.5
                                           px-3 py-1.5 rounded-lg
                                           bg-blue-50 text-blue-700
                                           text-xs font-semibold
                                           hover:bg-blue-100"
                              >
                                <FiRefreshCw size={13} />
                                Replace
                              </button>

                              <button
                                onClick={() =>
                                  handleRemove(order, item)
                                }
                                className="flex items-center gap-1.5
                                           px-3 py-1.5 rounded-lg
                                           bg-red-50 text-red-600
                                           text-xs font-semibold
                                           hover:bg-red-100"
                              >
                                <FiTrash2 size={13} />
                                Remove
                              </button>

                            </div>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 border-t border-gray-100
                                  px-5 py-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2 text-sm">

                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Subtotal
                          </span>
                          <span className="font-medium">
                            ${order.subtotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Delivery
                          </span>
                          <span className="font-medium">
                            ${order.delivery_fee.toFixed(2)}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-2
                                        flex justify-between">
                          <span className="font-bold">
                            Total
                          </span>
                          <span className="font-bold text-lg">
                            ${order.total_amount.toFixed(2)}
                          </span>
                        </div>
                          <button
                              onClick={() => handleEditInvoice(order)}
                              className="mt-4 w-full px-4 py-2.5 rounded-xl
                                        bg-brand-600 text-white text-sm font-semibold
                                        hover:bg-brand-700"
                            >
                              Edit Invoice
                            </button>
                          </div>

                      </div>
                    </div>
                  </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Invoice editor modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40
                        flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl
                          w-full max-w-2xl max-h-[90vh]
                          overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between
                            p-5 border-b border-gray-100">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Invoice
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {editingInvoice.invoice.invoice_number}
                </p>
              </div>

              <button
                onClick={closeInvoiceEditor}
                disabled={savingInvoice}
                className="p-2 rounded-lg hover:bg-gray-100
                           disabled:opacity-50"
              >
                <FiX />
              </button>

            </div>

            {/* Invoice content */}
            <div className="p-5 overflow-y-auto max-h-[65vh]">

              <div className="mb-5">
                <h3 className="font-semibold text-gray-900">
                  Items
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  California tax can be adjusted for this invoice.
                </p>
              </div>

              <div className="space-y-3">

                {editingInvoice.invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-100
                               rounded-xl p-4"
                  >

                    {/* Product row */}
                    <div className="flex items-start
                                    justify-between gap-4">

                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {item.product_name}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          {item.quantity} × $
                          {Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>

                      <p className="font-semibold text-gray-900">
                        ${Number(item.line_total).toFixed(2)}
                      </p>

                    </div>

                    {/* Tax controls */}
                    <div className="mt-4 pt-3
                                    border-t border-gray-100
                                    flex flex-wrap items-center
                                    gap-5">

                      {/* Taxable */}
                      <label className="flex items-center gap-2
                                        text-sm text-gray-700
                                        cursor-pointer">

                        <input
                          type="checkbox"
                          checked={Boolean(item.taxable)}
                          onChange={(e) =>
                            updateInvoiceItem(
                              item.id,
                              "taxable",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4"
                        />

                        Taxable
                      </label>

                      {/* Tax percentage */}
                      <label className="flex items-center gap-2
                                        text-sm text-gray-700">

                        CA Tax

                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.tax_percentage}
                          disabled={!item.taxable}
                          onChange={(e) =>
                            updateInvoiceItem(
                              item.id,
                              "tax_percentage",
                              e.target.value
                            )
                          }
                          className="w-20 px-2.5 py-1.5
                                     border border-gray-200
                                     rounded-lg text-sm
                                     text-right
                                     disabled:bg-gray-100
                                     disabled:text-gray-400"
                        />

                        <span className="text-gray-400">
                          %
                        </span>
                      </label>

                      {/* Tax amount */}
                      <div className="ml-auto text-right">

                        <p className="text-xs text-gray-400">
                          Tax
                        </p>

                        <p className="text-sm font-semibold
                                      text-gray-800">
                          $
                          {(
                            Number(item.line_total || 0) *
                            (
                              item.taxable
                                ? Number(item.tax_percentage || 0)
                                : 0
                            ) /
                            100
                          ).toFixed(2)}
                        </p>

                      </div>

                    </div>

                  </div>
                ))}

              </div>

              {/* Invoice totals */}
              <div className="mt-6 border-t border-gray-200
                              pt-4">

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span className="font-medium">
                      $
                      {Number(
                        editingInvoice.invoice.subtotal || 0
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Delivery
                    </span>

                    <span className="font-medium">
                      $
                      {Number(
                        editingInvoice.invoice.delivery_fee || 0
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Discount
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingInvoice.invoice.discount_amount || 0}
                        onChange={(e) =>
                          setEditingInvoice((prev) => ({
                            ...prev,
                            invoice: {
                              ...prev.invoice,
                              discount_amount: e.target.value,
                            },
                          }))
                        }
                        className="w-24 px-2 py-1 border border-gray-200
                                  rounded-lg text-right text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      CA Tax
                    </span>

                    <span className="font-medium">
                      $
                      {editingInvoice.invoice.items
                        .reduce(
                          (sum, item) =>
                            sum +
                            (
                              Number(item.line_total || 0) *
                              (
                                item.taxable
                                  ? Number(
                                      item.tax_percentage || 0
                                    )
                                  : 0
                              ) /
                              100
                            ),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200
                                  pt-3 mt-3
                                  flex justify-between">

                    <span className="font-bold text-gray-900">
                      Total
                    </span>

                    <span className="font-bold text-lg
                                      text-gray-900">

                      $
                      {Math.max(
                        0,
                        Number(
                          editingInvoice.invoice.subtotal || 0
                        ) +
                          Number(
                            editingInvoice.invoice.delivery_fee || 0
                          ) -
                          Number(
                            editingInvoice.invoice.discount_amount || 0
                          ) +
                          editingInvoice.invoice.items.reduce(
                            (sum, item) =>
                              sum +
                              (
                                Number(item.line_total || 0) *
                                (
                                  item.taxable
                                    ? Number(
                                        item.tax_percentage || 0
                                      )
                                    : 0
                                ) /
                                100
                              ),
                            0
                          )
                      ).toFixed(2)}

                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end
                            gap-3 p-5 border-t border-gray-100">

              <button
                onClick={closeInvoiceEditor}
                disabled={savingInvoice}
                className="px-4 py-2.5 rounded-xl
                           border border-gray-200
                           text-sm font-semibold
                           text-gray-700
                           hover:bg-gray-50
                           disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveInvoice}
                disabled={savingInvoice}
                className="px-5 py-2.5 rounded-xl
                           bg-brand-600 text-white
                           text-sm font-semibold
                           hover:bg-brand-700
                           disabled:opacity-50"
              >
                {savingInvoice
                  ? "Saving..."
                  : "Save Invoice"}
              </button>

            </div>

          </div>
        </div>
      )}
      {/* Replace modal */}
      {replaceModal && (
        <div className="fixed inset-0 z-50 bg-black/40
                        flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl
                          w-full max-w-lg">

            {/* Modal header */}
            <div className="flex items-center justify-between
                            p-5 border-b border-gray-100">

              <div>
                <h2 className="font-bold text-gray-900">
                  Replace Order Item
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Replace "{replaceModal.item.product_name}"
                </p>
              </div>

              <button
                onClick={closeReplace}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <FiX />
              </button>

            </div>

            <div className="p-5">

              {/* Product search */}
              <label className="text-sm font-semibold text-gray-700">
                Search replacement product
              </label>

              <div className="relative mt-2">
                <FiSearch
                  className="absolute left-3 top-1/2
                             -translate-y-1/2 text-gray-400"
                />

                <input
                  autoFocus
                  value={productSearch}
                  onChange={(e) =>
                    searchProducts(e.target.value)
                  }
                  placeholder="Search by product name..."
                  className="w-full pl-10 pr-4 py-2.5
                             border border-gray-200 rounded-xl
                             text-sm outline-none
                             focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Results */}
              <div className="mt-3 max-h-52 overflow-y-auto">

                {productLoading && (
                  <p className="text-sm text-gray-400 p-3">
                    Searching...
                  </p>
                )}

                {!productLoading &&
                  productSearch &&
                  products.length === 0 && (
                    <p className="text-sm text-gray-400 p-3">
                      No products found.
                    </p>
                  )}

                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full text-left p-3 rounded-xl
                                mb-1 border transition-colors
                                ${
                                  selectedProduct?.id === product.id
                                    ? "border-brand-300 bg-brand-50"
                                    : "border-transparent hover:bg-gray-50"
                                }`}
                  >
                    <div className="flex justify-between">

                      <div>
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          ${Number(
                            product.discounted_price ||
                            product.price ||
                            0
                          ).toFixed(2)}
                          {" · "}
                          {product.unit || "unit"}
                        </p>
                      </div>

                      <span className="text-xs text-gray-500">
                        Stock: {product.stock_quantity ?? "Unknown"}
                      </span>

                    </div>
                  </button>
                ))}
              </div>

              {/* Selected product */}
              {selectedProduct && (
                <div className="mt-4 p-3 bg-brand-50 rounded-xl">

                  <p className="text-xs text-brand-600 font-semibold">
                    Replacement selected
                  </p>

                  <p className="font-semibold text-gray-900 mt-1">
                    {selectedProduct.name}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Stock:{" "}
                    {selectedProduct.stock_quantity ?? "Unknown"}
                  </p>

                </div>
              )}

              {/* Quantity */}
              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-700">
                  Replacement quantity
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={replacementQuantity}
                  onChange={(e) =>
                    setReplacementQuantity(e.target.value)
                  }
                  className="mt-2 w-full border border-gray-200
                             rounded-xl px-3 py-2.5 text-sm
                             outline-none focus:ring-2
                             focus:ring-brand-100"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-6">

                <button
                  onClick={closeReplace}
                  className="px-4 py-2.5 rounded-xl
                             text-sm font-medium text-gray-600
                             hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleReplace}
                  disabled={!selectedProduct || replacing}
                  className="px-4 py-2.5 rounded-xl
                             bg-brand-600 text-white text-sm
                             font-semibold disabled:opacity-50
                             hover:bg-brand-700"
                >
                  {replacing ? "Replacing..." : "Replace Item"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}