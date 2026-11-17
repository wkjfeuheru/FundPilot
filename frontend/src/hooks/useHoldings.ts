import { getHoldings } from '../api/endpoints/assets'
import { useRemote } from './useFunds'
import useSettlementRefresh from './useSettlementRefresh'
export default function useHoldings() {
  const { revision, reload } = useSettlementRefresh()
  return { holdings: useRemote(getHoldings, revision), reload }
}
