import AdminLayout, { useAdminData } from "../../components/admin/AdminLayout";

export default function AdminSubscriptions() {
  const { data, loading } = useAdminData("/admin/subscriptions");
  const plans = data?.plans_by_org || [];

  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold">Subscriptions</h1>
      {loading ? <div className="text-slate-500">Loading…</div> : (
        <div className="mt-6 border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {plans.map((o) => (
                <tr key={o.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3">{o.name}</td>
                  <td className="px-4 py-3 font-mono-tabular text-slate-400">{o.slug}</td>
                  <td className="px-4 py-3 capitalize">{o.plan || "trial"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
