import { Navigate } from 'react-router';

/** Global catch-all — redirect to home */
export default function CatchAll() {
  return <Navigate to="/" replace />;
}
