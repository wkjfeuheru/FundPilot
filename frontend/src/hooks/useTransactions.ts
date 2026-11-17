import { useCallback } from 'react'
import { getCashAccount, listTrades } from '../api/endpoints/trades'
import { useRemote } from './useFunds'
import useSettlementRefresh from './useSettlementRefresh'
export default function useTransactions(query: string) {
  const { revision, reload } = useSettlementRefresh()
  const load = useCallback(() => listTrades(query), [query])
  return { orders: useRemote(load, revision), cash: useRemote(getCashAccount, revision), reload }
}
