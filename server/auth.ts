import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { Request, Response, NextFunction } from 'express'
import { getDb } from './db.ts'
import type { User } from './permissions.ts'

export const SESSION_COOKIE = 'stockroom_session'

// A development default, so the demo runs without any setup. Set SESSION_SECRET in .env anywhere real.
export function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? 'stockroom-development-secret-not-for-production')
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 32))
}

export function findUser(id: number): User | undefined {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.shop_id, s.name AS shop_name, u.name, u.email, u.role
       FROM users u JOIN shops s ON s.id = u.shop_id WHERE u.id = ?`,
    )
    .get(id) as Record<string, any> | undefined
  return row && { id: row.id, shopId: row.shop_id, shopName: row.shop_name, name: row.name, email: row.email, role: row.role }
}

export function signIn(email: string, password: string): User | undefined {
  const row = getDb().prepare('SELECT id, password_hash FROM users WHERE lower(email) = lower(?)').get(email) as
    | { id: number; password_hash: string }
    | undefined
  if (!row || !checkPassword(password, row.password_hash)) return undefined
  return findUser(row.id)
}

export async function sessionToken(user: User): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(String(user.id)).setAudience('stockroom-web').setIssuedAt().setExpirationTime('12h').sign(secret())
}

async function userFromSession(req: Request): Promise<User | undefined> {
  const cookie = req.headers.cookie?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  if (!cookie) return undefined
  try {
    const { payload } = await jwtVerify(cookie.slice(SESSION_COOKIE.length + 1), secret(), { audience: 'stockroom-web' })
    return findUser(Number(payload.sub))
  } catch {
    return undefined
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await userFromSession(req)
  if (!user) return res.status(401).json({ error: 'Sign in first.' })
  req.user = user
  next()
}
