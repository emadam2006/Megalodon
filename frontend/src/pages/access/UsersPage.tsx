import React, { useEffect, useState } from "react";
import { Users, Plus, Trash2, RefreshCw, Shield, AlertCircle, Check, X } from "lucide-react";
import { api } from "../../api/client";
import { User } from "../../types";

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`]/;

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [error, setError] = useState<string | null>(null);

  // Policy validation checks
  const isUsernameLengthValid = username.trim().length >= 3;
  const isUsernamePatternValid = /^[a-zA-Z0-9_\-.]+$/.test(username.trim());
  const isUsernameValid = isUsernameLengthValid && isUsernamePatternValid;

  const isPasswordLengthValid = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = SPECIAL_CHARS_REGEX.test(password);

  const isPolicySatisfied =
    isUsernameValid &&
    isPasswordLengthValid &&
    hasUpperCase &&
    hasLowerCase &&
    hasDigit &&
    hasSpecialChar;

  const fetchUsers = () => {
    setLoading(true);
    api
      .getUsers()
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isUsernameValid) {
      setError("Username must be at least 3 characters and contain only letters, numbers, _, -, or .");
      return;
    }

    if (!isPolicySatisfied) {
      setError("Password does not meet the complexity requirements (8+ chars, upper, lower, number, special char).");
      return;
    }

    try {
      await api.createUser({
        username: username.trim(),
        email: email.trim(),
        password,
        role_names: [role],
      });
      setUsername("");
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Role-Based Access Control (RBAC)</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Manage operator accounts, administrative permissions, and auditor access
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Table */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Active Operator Accounts</h3>
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Assigned Roles</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{u.username}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300">{u.email}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).map((r) => (
                          <span
                            key={r.id}
                            className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300"
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono border bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
                          {u.is_active ? "ACTIVE" : "DISABLED"}
                        </span>
                        {u.must_change_credentials && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 font-semibold">
                            PENDING SETUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!u.is_superuser && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Form */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Create Operator Account</h3>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-neutral-900 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between mb-1 font-sans">
                <label className="text-zinc-600 dark:text-neutral-400">Username *</label>
                <span className={`text-[10px] ${isUsernameValid ? "text-emerald-500" : "text-zinc-400"}`}>
                  {username.length}/3+
                </span>
              </div>
              <input
                type="text"
                required
                minLength={3}
                maxLength={64}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@megalodon.local"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>

            {/* Policy Checklist */}
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800 space-y-1 font-sans">
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-neutral-400 uppercase tracking-wider block">
                Security Policy Checklist
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className={`flex items-center gap-1 ${isUsernameValid ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                  {isUsernameValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Username 3+ chars</span>
                </div>
                <div className={`flex items-center gap-1 ${isPasswordLengthValid ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                  {isPasswordLengthValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Password 8+ chars</span>
                </div>
                <div className={`flex items-center gap-1 ${hasUpperCase && hasLowerCase ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                  {hasUpperCase && hasLowerCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Upper & lowercase</span>
                </div>
                <div className={`flex items-center gap-1 ${hasDigit && hasSpecialChar ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                  {hasDigit && hasSpecialChar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Number & symbol</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Role Permission</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              >
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="OPERATOR">OPERATOR (Rules & Policies)</option>
                <option value="AUDITOR">AUDITOR (Read & Audit Only)</option>
                <option value="VIEWER">VIEWER (Read Only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!isPolicySatisfied}
              className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold font-sans text-xs transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
