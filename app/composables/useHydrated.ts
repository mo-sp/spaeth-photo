/**
 * True only after hydration. `import.meta.client` is already true while Vue is
 * hydrating and would produce exactly the server/client mismatch this is meant
 * to avoid — the first client render has to match the prerendered HTML.
 */
export function useHydrated(): Readonly<Ref<boolean>> {
  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })
  return hydrated
}
