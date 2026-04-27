import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

export function useCheckoutReturn(t: (key: string, opts?: { defaultValue: string }) => string) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkoutStatus = params.get('checkout');
    if (!checkoutStatus) return;

    if (checkoutStatus === 'success') {
      toast.success(t('billing.checkoutSuccess', { defaultValue: 'Subscription active.' }));
    } else if (checkoutStatus === 'cancelled') {
      toast.message(t('billing.checkoutCancelled', { defaultValue: 'Checkout cancelled.' }));
    }

    params.delete('checkout');
    params.delete('session_id');
    const nextSearch = params.toString();
    void navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate, t]);
}
