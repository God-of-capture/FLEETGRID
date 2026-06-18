import AdminLayout, { AdminTable, useAdminData } from "../../components/admin/AdminLayout";
import { StatusPill } from "../../components/StatusPill";

export default function AdminDeliveries() {
  const { data, loading } = useAdminData("/admin/deliveries");
  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold">Deliveries</h1>
      <AdminTable loading={loading} rows={data?.items} columns={[
        { key: "tracking_code", label: "Tracking" },
        { key: "customer_name", label: "Customer" },
        { key: "organization_id", label: "Org ID", render: (r) => r.organization_id?.slice(0, 8) + "…" },
        { key: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
        { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
      ]} />
    </AdminLayout>
  );
}
