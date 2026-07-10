import { useParams, Navigate } from "react-router-dom";
import { adminPath } from "../../utils/adminPaths";

/** Legacy route — redirects to project detail Files tab. */
export default function ProjectDocuments() {
  const { id } = useParams();
  return <Navigate to={`${adminPath("projects", id)}?tab=files`} replace />;
}
