"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/ToastProvider";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Request {
  id: string;
  userId: string;
  teamName: string;
  status: "pending" | "approved" | "declined" | "completed";
  createdAt: string;
  reviewedAt: string | null;
  user: User;
}

export default function PasswordRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/admin/password-requests");
      if (!response.ok) {
        throw new Error("Failed to fetch password reset requests");
      }
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, status: "approved" | "declined") => {
    setActionId(requestId);
    try {
      const response = await fetch(`/api/admin/password-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      toast.success(`Request ${status} successfully!`);
      // Update local state
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status, reviewedAt: new Date().toISOString() }
            : req
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error processing request");
    } finally {
      setActionId(null);
    }
  };

  const filteredRequests = requests.filter(req =>
    req.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.user.name && req.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-white">Password Reset Requests</h1>
        <p className="text-sm text-[#D4CCBB] mt-1">
          Review, approve, or decline password reset requests submitted by team managers.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/10 rounded-xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search by team or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50"
          />
          <div className="absolute left-3 top-2.5 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-[#D4CCBB]">
          Showing {filteredRequests.length} requests
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-xl">
          <p className="text-gray-400">No password reset requests found.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.01]">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase">Team Name</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase">Manager Details</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase">Requested At</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm sm:text-base">{req.teamName}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-gray-200">
                        {req.user.name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{req.user.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">
                        {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          req.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : req.status === "approved"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : req.status === "declined"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.status === "pending" ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleAction(req.id, "approved")}
                            disabled={actionId !== null}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                          >
                            {actionId === req.id && <LoadingSpinner size="sm" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "declined")}
                            disabled={actionId !== null}
                            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 disabled:opacity-50 text-red-400 border border-red-500/20 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                          >
                            {actionId === req.id && <LoadingSpinner size="sm" />}
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Reviewed {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
