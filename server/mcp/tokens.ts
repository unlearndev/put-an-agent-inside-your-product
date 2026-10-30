import { SignJWT, jwtVerify } from 'jose'
import { secret, findUser } from '../auth.ts'
import type { User } from '../permissions.ts'

// Tokens for Stockroom's MCP server. They're only accepted at /mcp (the audience),
// and a browser session cookie, which has a different audience, isn't accepted there.
export const MCP_AUDIENCE = 'stockroom-mcp'

export async function issueMcpToken(user: User, expiresIn = '8h'): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setAudience(MCP_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret())
}

// The user a token was issued for, looked up fresh so a changed role applies straight away.
export async function verifyMcpToken(token: string): Promise<User | undefined> {
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: MCP_AUDIENCE })
    return findUser(Number(payload.sub))
  } catch {
    return undefined
  }
}
