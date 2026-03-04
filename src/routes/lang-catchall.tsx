import { Navigate } from 'react-router';

/** Catch-all — redirect to /pl/ */
export default function LangCatchall() {
  return <Navigate to="/pl/" replace />;
}
