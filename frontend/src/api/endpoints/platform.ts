import { ApiError, http, isRecord } from '../http'
export async function getBusinessDate(): Promise<string> {
  const data = await http<unknown>('/api/v1/trading-days/current')
  if (!isRecord(data) || typeof data.businessDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.businessDate)) {
    throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '业务日期暂不可用')
  }
  return data.businessDate
}
