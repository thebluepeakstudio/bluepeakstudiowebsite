import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { convertLead } from "../../api/leads.api";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

export default function ConvertToClientBanner({ lead, onConverted }) {
  if (!lead) return null;

  if (lead.isConverted && lead.convertedClientId) {
    const clientId = lead.convertedClientId._id || lead.convertedClientId;
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Converted to client.{" "}
        <Link to={adminPath("clients", clientId)} className="font-semibold underline">
          View client profile
        </Link>
      </div>
    );
  }

  if (lead.status !== "Won") return null;

  const handleConvert = async () => {
    try {
      const { data } = await convertLead(lead._id);
      toast.success("Lead converted to client");
      onConverted?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Conversion failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-admin-primary/30 bg-blue-50 px-4 py-3">
      <p className="text-sm text-admin-text">This lead is won. Convert it to a client record.</p>
      <Button onClick={handleConvert}>Convert to Client</Button>
    </div>
  );
}
