import { useState, useEffect } from "react";
import {
  FiShoppingBag, FiClock, FiTruck, FiCheckCircle, FiXCircle,
  FiMapPin, FiPackage,
} from "react-icons/fi";
import { getMyOrders } from "../../api/orders";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  pending:   { icon: <FiClock size={14} />,       bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200",  label: "Pending" },
  confirmed: { icon: <FiShoppingBag size={14} />, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Confirmed" },
  processing:{ icon: <FiShoppingBag size={14} />, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Processing" },
  out_for_delivery: { icon: <FiTruck size={14} />, bg: "bg-purple-50", text: "text-purple-700",  border: "border-purple-200",  label: "Out for Delivery" },
  delivered: { icon: <FiCheckCircle size={14} />, bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   label: "Delivered" },
  cancelled: { icon: <FiXCircle size={14} />,     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     label: "Cancelled" },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => toast.error("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Header />
        <div className="card text-center py-16 text-gray-400">Loading orders…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Header />

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-gray-100 rounded-2xl mb-4">
            <FiShoppingBag className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-1">No orders yet</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Once you place your first order, you'll be able to track it here in real time.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-brand-50
                          text-brand-700 text-sm font-medium px-4 py-2 rounded-xl">
            <FiClock size={14} /> Head to Home to start shopping
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
            return (
              <div key={order.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                      {" · "}
                      {order.order_type === "pickup"
                        ? <span className="inline-flex items-center gap-1"><FiPackage size={11} /> Pickup</span>
                        : <span className="inline-flex items-center gap-1"><FiMapPin size={11} /> Delivery</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium
                                     px-2.5 py-0.5 rounded-full border
                                     ${s.bg} ${s.text} ${s.border}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-gray-50 pt-3 space-y-1.5">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.product_name}
                        <span className="text-gray-400 text-xs"> × {item.quantity}</span>
                      </span>
                      <span className="text-gray-600">${Number(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {(order.delivery_fee > 0 || order.requested_time_slot) && (
                  <div className="border-t border-gray-50 mt-3 pt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    {order.delivery_fee > 0 && (
                      <span>Delivery fee: ${Number(order.delivery_fee).toFixed(2)}</span>
                    )}
                    {order.requested_time_slot && (
                      <span>Slot: {order.requested_time_slot}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <p className="text-gray-500 text-sm mt-0.5">Track and manage your grocery orders</p>
    </div>
  );
}
