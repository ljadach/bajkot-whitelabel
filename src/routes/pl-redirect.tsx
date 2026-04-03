import { Navigate, useParams } from 'react-router';

/** Backwards compat: /pl/whatever → /whatever */
export default function PlRedirect() {
  const { '*': rest } = useParams();
  return <Navigate to={`/${rest ?? ''}`} replace />;
}
