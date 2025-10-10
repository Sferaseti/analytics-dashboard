import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser } from '@/lib/db/schema';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

type SessionData = {
  user: { id: number };
  role?: string;
  expires: string;
  impersonation?: {
    originalUserId: number;
    originalUserRole: string;
    isImpersonating: boolean;
  };
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionData;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  return await verifyToken(session);
}

export async function setSession(user: NewUser | SessionData) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  let session: SessionData;
  
  // Если передан объект SessionData (для имперсонации), используем его
  if ('expires' in user) {
    session = {
      ...user,
      expires: expiresInOneDay.toISOString(),
    };
  } else {
    // Обычная сессия пользователя
    session = {
      user: { id: user.id! },
      role: user.role,
      expires: expiresInOneDay.toISOString(),
    };
  }
  
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}
