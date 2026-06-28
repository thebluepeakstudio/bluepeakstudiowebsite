import { useParams, Navigate } from "react-router-dom";

/** Legacy route — redirects to project detail Files tab. */
export default function ProjectDocuments() {
  const { id } = useParams();
  return <Navigate to={`/admin-panel/projects/${id}?tab=files`} replace />;
}
