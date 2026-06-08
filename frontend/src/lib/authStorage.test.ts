import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTokens,
  loadCachedUserProfile,
  saveCachedUserProfile,
  saveTokens,
} from './authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('caches and restores user profile', () => {
    const user = {
      id: 'u1',
      email: 'user@example.com',
      name: 'Jane',
      avatar_url: null,
    }
    saveCachedUserProfile(user)
    expect(loadCachedUserProfile()).toEqual(user)
  })

  it('clears cached profile when tokens are cleared', () => {
    saveTokens({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    saveCachedUserProfile({
      id: 'u1',
      email: 'user@example.com',
      name: 'Jane',
      avatar_url: null,
    })
    clearTokens()
    expect(loadCachedUserProfile()).toBeNull()
  })
})
