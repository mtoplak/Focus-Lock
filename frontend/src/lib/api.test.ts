import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, isNetworkError } from './api'

describe('isNetworkError', () => {
  it('detects axios errors without a response', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(isNetworkError(err)).toBe(true)
  })

  it('detects ApiError with status 0', () => {
    expect(isNetworkError(new ApiError(0, 'network', 'offline'))).toBe(true)
  })

  it('returns false for HTTP error responses', () => {
    const err = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: {} } as never,
      data: {},
    })
    expect(isNetworkError(err)).toBe(false)
    expect(isNetworkError(new ApiError(401, 'unauthorized', 'bad token'))).toBe(false)
  })
})
