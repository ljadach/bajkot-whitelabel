import { useEffect } from 'react';
import { Outlet } from 'react-router';

/** Layout wrapper for /pl/ routes. Sets HTML lang attribute. */
export default function LangLayout() {
  useEffect(() => {
    document.documentElement.lang = 'pl';
  }, []);

  return <Outlet />;
}
