import AdminLayout, { AdminTable, useAdminData } from "../../components/admin/AdminLayout";

export default function AdminOrganizations() {
  const { data, loading } = useAdminData("/admin/organizations");
  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold">Organizations</h1>
      <AdminTable loading={loading} rows={data?.items} columns={[
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "plan", label: "Plan" },
        { key: "user_count", label: "Users" },
        { key: "delivery_count", label: "Deliveries" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "Yes" : "No" },
      ]} />
    </AdminLayout>
  );
}
