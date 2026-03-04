import { Navigate } from 'react-router';

/** Redirects bare "/" to "/pl/" — Polish only */
export default function LanguageRedirect() {
  return <Navigate to="/pl/" replace />;
}
