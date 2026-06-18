import AdminLayout, { AdminTable, useAdminData } from "../../components/admin/AdminLayout";

export default function AdminPartners() {
  const { data, loading } = useAdminData("/admin/partners");
  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold">Delivery partners</h1>
      <AdminTable loading={loading} rows={data?.items} columns={[
        { key: "full_name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "vehicle_type", label: "Vehicle" },
        { key: "verification_status", label: "Status" },
        { key: "submitted_at", label: "Submitted", render: (r) => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—" },
      ]} />
    </AdminLayout>
  );
}
