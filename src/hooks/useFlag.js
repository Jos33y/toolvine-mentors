import { useFlags } from '@/stores/useFlags'

export function useFlag(key) {
  return useFlags((s) => s.values[key])
}

export function useFlagsLoaded() {
  return useFlags((s) => s.loaded)
}
