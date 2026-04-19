import { toast as sonnerToast, type ExternalToast } from "sonner";

const DEFAULTS = {
  success: 4000,
  info: 4000,
  error: 6000,
} as const;

type ToastOptions = Omit<ExternalToast, "duration"> & { duration?: number };

export const toast = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, { duration: DEFAULTS.success, ...options });
  },
  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, { duration: DEFAULTS.error, ...options });
  },
  info(message: string, options?: ToastOptions) {
    return sonnerToast(message, { duration: DEFAULTS.info, ...options });
  },
  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id);
  },
  promise: sonnerToast.promise,
};
