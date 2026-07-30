import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  FiUsers, FiUserPlus, FiLink, FiCopy, FiCheck, FiInfo,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function FamilyGroup() {
  const { customer } = useAuth();
  const [copied, setCopied] = useState(false);

  const hasGroup = !!customer?.household_id;

  const handleCopyId = () => {
    if (!customer?.household_id) return;
    navigator.clipboard.writeText(String(customer.household_id));
    setCopied(true);
    toast.success("Group ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Family Group</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Share a household with family members to coordinate grocery orders
        </p>
      </div>

      {hasGroup ? (
        /* Already in a group */
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <FiUsers className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Your Family Group</p>
                <p className="text-xs text-gray-400">Group ID #{customer.household_id}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Group ID</p>
                <p className="font-mono font-semibold text-gray-800">
                  #{customer.household_id}
                </p>
              </div>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600
                           hover:text-brand-700 transition-colors">
                {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                {copied ? "Copied!" : "Copy ID"}
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-4 flex items-start gap-2">
              <FiInfo size={14} className="mt-0.5 flex-shrink-0 text-brand-400" />
              Share this Group ID with a family member so they can join your household
              during their profile setup.
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Members</h3>
            <div className="text-center py-6 text-gray-400">
              <FiUsers className="mx-auto text-2xl mb-2" />
              <p className="text-sm">Member listing coming soon</p>
            </div>
          </div>
        </div>
      ) : (
        /* Not in a group yet */
        <div className="space-y-4">
          <div className="card text-center py-10">
            <div className="inline-flex items-center justify-center w-14 h-14
                            bg-brand-50 rounded-2xl mb-4">
              <FiUsers className="text-brand-500 text-2xl" />
            </div>
            <h3 className="text-gray-800 font-semibold mb-1">Not in a group yet</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Create or join a family group to share delivery addresses and
              coordinate orders with your household.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="card flex flex-col items-center gap-3 py-8 hover:shadow-md
                         hover:border-brand-200 transition-all cursor-pointer group border-2
                         border-dashed border-gray-200"
              onClick={() => toast("Group creation coming soon!", { icon: "🏠" })}>
              <div className="w-10 h-10 rounded-xl bg-brand-50 group-hover:bg-brand-100
                              flex items-center justify-center transition-colors">
                <FiUserPlus className="text-brand-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">Create a group</p>
                <p className="text-gray-400 text-xs mt-0.5">Start a new family household</p>
              </div>
            </button>

            <button
              className="card flex flex-col items-center gap-3 py-8 hover:shadow-md
                         hover:border-brand-200 transition-all cursor-pointer group border-2
                         border-dashed border-gray-200"
              onClick={() => toast("Group joining coming soon!", { icon: "🔗" })}>
              <div className="w-10 h-10 rounded-xl bg-green-50 group-hover:bg-green-100
                              flex items-center justify-center transition-colors">
                <FiLink className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">Join a group</p>
                <p className="text-gray-400 text-xs mt-0.5">Enter an existing Group ID</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
