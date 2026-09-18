import { describe, expect, it } from 'vitest'
import { API_TIMEOUT_MS, ApiError, apiClient, unwrapApiResponse } from './httpClient'

describe('httpClient', () => {
  it('解包成功的统一响应结构', () => {
    expect(unwrapApiResponse({ code: 1, message: 'ok', data: { id: '1' } })).toEqual({ id: '1' })
  })

  it('将业务失败转换为 ApiError 并保留错误码', () => {
    expect(() => unwrapApiResponse({ code: 4001, message: 'invalid', data: null })).toThrow(ApiError)
    try {
      unwrapApiResponse({ code: 4001, message: 'invalid', data: null })
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).code).toBe(4001)
      expect((error as ApiError).message).toBe('invalid')
    }
  })

  it('拒绝缺少统一响应字段的载荷', () => {
    expect(() => unwrapApiResponse({ data: [] })).toThrow('Invalid API response')
  })

  it('配置了有限的请求超时', () => {
    expect(apiClient.defaults.timeout).toBe(API_TIMEOUT_MS)
    expect(API_TIMEOUT_MS).toBeGreaterThan(0)
  })
})
