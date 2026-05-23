export type AuthUser = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

export type AuthTokens = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}
