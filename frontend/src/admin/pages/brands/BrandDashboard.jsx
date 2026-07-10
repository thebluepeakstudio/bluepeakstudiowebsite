import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { getBrandDashboard } from "../../api/brands.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import ServicesPillList from "../../components/projects/ServicesPillList";
import { getProjectLabel } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

export default function BrandDashboard() {
  const { clientId, brandId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBrandDashboard(brandId)
      .then(({ data: res }) => setData(res.data))
      .catch(() => {
        toast.error("Brand not found");
        navigate(adminPath("clients", clientId));
      })
      .finally(() => setLoading(false));
  }, [brandId, clientId, navigate]);

  if (loading) return <CardSkeleton />;
  if (!data?.brand) return null;

  const { brand, services, mrr, outstanding, lifetimeRevenue, recurringRevenue } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" onClick={() => navigate(adminPath("clients", clientId))}>
          <ArrowLeft size={18} /> Back to client
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-admin-text">{brand.name}</h1>
          {brand.industry && <p className="text-admin-textMuted">{brand.industry}</p>}
        </div>
        <Badge status={brand.status}>{brand.status}</Badge>
        <Link to={`${adminPath("services")}?clientId=${clientId}&brandId=${brandId}`}>
          <Button variant="secondary">
            <FolderKanban size={16} /> New service
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-admin-textMuted">Services</p>
          <p className="text-2xl font-bold">{services?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-admin-textMuted">MRR</p>
          <p className="text-2xl font-bold">{formatCurrency(mrr)}</p>
        </Card>
        <Card>
          <p className="text-xs text-admin-textMuted">Outstanding</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(outstanding)}</p>
        </Card>
        <Card>
          <p className="text-xs text-admin-textMuted">Lifetime revenue</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(lifetimeRevenue)}</p>
          {recurringRevenue > 0 && (
            <p className="mt-1 text-xs text-admin-textMuted">
              Recurring: {formatCurrency(recurringRevenue)}
            </p>
          )}
        </Card>
      </div>

      <Card title="Services under this brand">
        <Table
          columns={[
            { key: "name", label: "Service", render: (r) => getProjectLabel(r) },
            {
              key: "billingModel",
              label: "Billing",
              render: (r) => (r.billingModel === "recurring" ? "Recurring" : "One-time"),
            },
            {
              key: "services",
              label: "Deliverables",
              render: (r) => (
                <ServicesPillList services={r.services} servicesCount={r.servicesCount} />
              ),
            },
            { key: "workStatus", label: "Status" },
            {
              key: "totalPrice",
              label: "Value",
              render: (r) => formatCurrency(r.totalPrice ?? r.totalAmount),
            },
            {
              key: "link",
              label: "",
              render: (r) => (
                <Link
                  to={adminPath("services", r._id)}
                  className="text-xs text-admin-primary hover:underline"
                >
                  View
                </Link>
              ),
            },
          ]}
          data={services || []}
          emptyMessage="No services under this brand yet"
        />
      </Card>
    </div>
  );
}
