"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  phone: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone");

    if (error) {
      console.error(error);
      return;
    }

    setUsers(data || []);
  }

  return (
  <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
  User Management
</h1>

<p className="mt-1 text-sm text-slate-500">
  View all registered users.
</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
  <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Name</th>
          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Role</th>
           <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Phone</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border-t border-slate-200 px-6 py-4 text-slate-700">
                {user.full_name}
              </td>

              <td className="border-t border-slate-200 px-6 py-4">
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      user.role === "admin"
        ? "bg-red-100 text-red-700"
        : user.role === "manager"
        ? "bg-blue-100 text-blue-700"
        : "bg-slate-100 text-slate-700"
    }`}
  >
    {user.role}
  </span>
</td>

              <td className="border-t border-slate-200 px-6 py-4 text-slate-700">
                {user.phone || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
</div>
  );
}