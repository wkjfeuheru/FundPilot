import { getBusinessDate } from '../api/endpoints/platform'
import { useRemote } from './useFunds'
import useSettlementRefresh from './useSettlementRefresh'
export default function useBusinessDate() {
  const { revision } = useSettlementRefresh()
  return useRemote(getBusinessDate, revision)
}
