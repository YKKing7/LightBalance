import { nextTick, watch, type Ref } from "vue";

export function useRememberedScroll(pageKey: Readonly<Ref<string>>, scrollElement: Ref<HTMLElement | null>) {
  const scrollPositions = new Map<string, number>();

  watch(
    pageKey,
    async (nextKey, previousKey) => {
      if (previousKey && scrollElement.value) {
        scrollPositions.set(previousKey, scrollElement.value.scrollTop);
      }

      await nextTick();
      if (scrollElement.value) {
        scrollElement.value.scrollTop = scrollPositions.get(nextKey) ?? 0;
      }
    }
  );

  function rememberCurrentScroll() {
    if (!scrollElement.value) return;
    scrollPositions.set(pageKey.value, scrollElement.value.scrollTop);
  }

  return {
    rememberCurrentScroll
  };
}
