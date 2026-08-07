import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'error';

export type ToastMessage = {
  kind: ToastKind;
  text: string;
};

type ToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
};

// Fixed-position popup for feedback on POST/PATCH/DELETE actions, in the
// site's cream/gold palette rather than the plain red/green FormFeedback
// banners (which stay inline for form-level validation).
export const Toast = ({ toast, onDismiss, durationMs = 4000 }: ToastProps) => {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.kind === 'success';

  return (
    <div className="fixed left-1/2 top-6 z-[100] flex w-max max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] px-4 py-3 text-sm shadow-xl">
      {isSuccess ? (
        <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#D8B46A]" />
      ) : (
        <XCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-red-700" />
      )}
      <span className={isSuccess ? 'text-[#2B241E]' : 'text-red-700'}>{toast.text}</span>
    </div>
  );
};
