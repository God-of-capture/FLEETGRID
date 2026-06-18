import AdminLayout, { AdminTable, useAdminData } from "../../components/admin/AdminLayout";

export default function AdminUsers() {
  const { data, loading } = useAdminData("/admin/users");
  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold">Users</h1>
      <AdminTable loading={loading} rows={data?.items} columns={[
        { key: "full_name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "roles", label: "Roles", render: (r) => (r.roles || []).join(", ") },
        { key: "organization_id", label: "Org", render: (r) => r.organization_id?.slice(0, 8) || "—" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "Yes" : "No" },
      ]} />
    </AdminLayout>
  );
}
