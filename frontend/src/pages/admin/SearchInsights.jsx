import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getSearchLogs, addSearchTerm } from "../../api/admin";
import { getProducts } from "../../api/products";
import { FiSearch, FiTrendingUp, FiPlus } from "react-icons/fi";

const TERM_TYPES = ["official", "alias", "regional", "typo", "hashtag"];

export default function SearchInsights() {
  const [logs, setLogs] = useState([]);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({ product_id: "", search_term: "", term_type: "alias", language: "" });

  useEffect(() => {
    getSearchLogs({ only_failed: onlyFailed, limit: 100 })
      .then((r) => setLogs(r.data.results || []))
      .catch(() => toast.error("Could not load search logs."));
  }, [onlyFailed]);

  useEffect(() => {
    getProducts()
      .then((r) => setProducts(r.data.products || []))
      .catch(() => {});
  }, []);

  const total = logs.length;
  const found = logs.filter((l) => l.result_found).length;
  const failed = total - found;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.search_term.trim()) {
      return toast.error("Pick a product and enter the missing term.");
    }
    try {
      const res = await addSearchTerm({
        product_id: form.product_id,
        search_term: form.search_term.trim(),
        term_type: form.term_type,
        language: form.language.trim() || undefined,
      });
      if (res.data.added) toast.success(`Added "${form.search_term}" as ${form.term_type}.`);
      else toast(res.data.message || "Term already exists.");
      setForm({ ...form, search_term: "", language: "" });
      setOnlyFailed(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not add term.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Insights</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          What customers searched for and whether it resolved. Failed searches are
          the missing aliases — add them below.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Searches</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Found</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{found}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Missed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{failed}</p>
        </div>
      </div>

      {/* Search logs table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiSearch className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Search Log</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyFailed}
              onChange={(e) => setOnlyFailed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-500 accent-brand-500"
            />
            Only failed searches
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2.5 font-semibold">Query</th>
                <th className="px-5 py-2.5 font-semibold">Result</th>
                <th className="px-5 py-2.5 font-semibold">Matched product</th>
                <th className="px-5 py-2.5 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                    No searches recorded yet — go search something on the store!
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.log_id} className="border-t border-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-800">"{l.search_query}"</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${l.result_found ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                        {l.result_found ? "Found" : "Missed"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {l.matched_product_name || "—"}
                    </td>
                    <td className="px-5 py-2.5 text-gray-400">
                      {l.searched_at ? new Date(l.searched_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add missing term */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiPlus className="text-brand-500" />
          <h2 className="font-semibold text-gray-800">Add a missing search term</h2>
        </div>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            className="input lg:col-span-2"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
            <option value="">Product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="New search term (e.g. ashwagandha)"
            value={form.search_term}
            onChange={(e) => setForm({ ...form, search_term: e.target.value })}
          />
          <select
            className="input"
            value={form.term_type}
            onChange={(e) => setForm({ ...form, term_type: e.target.value })}>
            {TERM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
            <button type="submit" className="btn-primary flex-shrink-0 px-4">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
