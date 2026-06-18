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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        User Management
      </h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Phone</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border p-2">
                {user.full_name}
              </td>

              <td className="border p-2">
                {user.role}
              </td>

              <td className="border p-2">
                {user.phone || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}