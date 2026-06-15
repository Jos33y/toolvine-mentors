import { NotFound } from '@/pages/NotFound'
import { useFlag } from '@/hooks/useFlag'
import { isOn } from '@/lib/flags'

// fallback: 'null' (default), '404', or any node. '404' is for whole-route gates.
export function FlagGate({ flag, fallback = null, children }) {
  const value = useFlag(flag)

  if (isOn(value)) return children

  if (fallback === '404') return <NotFound />
  return fallback
}
