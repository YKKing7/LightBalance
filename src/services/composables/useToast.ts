import { onUnmounted, ref, type Ref } from "vue";

interface ToastOptions {
  duration?: number;
  onHide?: () => void;
}

export function useToast<T>(initialValue: T, options: ToastOptions = {}) {
  const toast = ref(initialValue) as Ref<T>;
  const toastVisible = ref(false);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function clearToastTimer() {
    if (!toastTimer) return;
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  function hideToast() {
    clearToastTimer();
    toastVisible.value = false;
    options.onHide?.();
  }

  function showToast(nextValue: T, duration = options.duration ?? 1800) {
    toast.value = nextValue;
    toastVisible.value = true;
    clearToastTimer();

    toastTimer = setTimeout(() => {
      toastVisible.value = false;
      toastTimer = null;
      options.onHide?.();
    }, duration);
  }

  onUnmounted(clearToastTimer);

  return {
    toast,
    toastVisible,
    showToast,
    hideToast
  };
}
