import { useCallback, useState } from 'react'
import { getCashAccount, listTrades } from '../api/endpoints/trades'
import { useRemote } from './useFunds'
export default function useTransactions(query: string) {
  const [revision, setRevision] = useState(0)
  const load = useCallback(() => listTrades(query), [query])
  return { orders: useRemote(load, revision), cash: useRemote(getCashAccount, revision), reload: () => setRevision(r => r + 1) }
}
