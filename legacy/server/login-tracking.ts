/**
 * Sistema de Rastreio de Login Avançado
 * Registra IP, localização, dispositivo, navegador e detecta acessos suspeitos
 */

import { getDb } from './db';
import type { Request } from 'express';
import { eq, and, ne, desc, sql, gt } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

export interface LoginAttemptInput {
  userId: number;
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  location?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  success: boolean;
  timestamp: Date;
  suspicious: boolean;
  suspicionReasons?: string[];
}

export interface ActiveSessionInfo {
  sessionId: string;
  userId: number;
  ip: string;
  device: string | null;
  browser: string | null;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Extrair informações do dispositivo e navegador
 */
function parseUserAgent(userAgent: string) {
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  let device = 'Desktop';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';

  return { browser, os, device };
}

/**
 * Obter localização geográfica por IP
 */
async function getLocationByIP(ip: string) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon
      };
    }
  } catch (error) {
    console.error('[Login Tracking] Erro ao obter localização:', error);
  }
  
  return undefined;
}

/**
 * Detectar acesso suspeito usando Drizzle ORM
 */
async function detectSuspiciousLogin(userId: number, currentAttempt: LoginAttemptInput): Promise<{ suspicious: boolean; reasons: string[] }> {
  const db = await getDb();
  if (!db) {
    return { suspicious: false, reasons: [] };
  }

  const reasons: string[] = [];

  try {
    // Buscar últimos 10 logins bem-sucedidos via Drizzle
    const recentLogins = await db.select()
      .from(schema.loginAttempts)
      .where(and(
        eq(schema.loginAttempts.userId, userId),
        eq(schema.loginAttempts.success, true)
      ))
      .orderBy(desc(schema.loginAttempts.timestamp))
      .limit(10);

    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[0];

      // 1. IP diferente do habitual
      const usualIPs = new Set(recentLogins.map((l) => l.ip));
      if (!usualIPs.has(currentAttempt.ip)) {
        reasons.push('IP não reconhecido');
      }

      // 2. Localização geográfica diferente
      if (currentAttempt.location && lastLogin.country) {
        if (currentAttempt.location.country !== lastLogin.country) {
          reasons.push('Login de país diferente');
        }
      }

      // 3. Dispositivo diferente
      if (currentAttempt.device !== lastLogin.device) {
        reasons.push('Dispositivo não reconhecido');
      }

      // 4. Navegador diferente
      if (currentAttempt.browser !== lastLogin.browser) {
        reasons.push('Navegador não reconhecido');
      }

      // 5. Login muito rápido após último acesso
      if (lastLogin.timestamp) {
        const timeDiff = Date.now() - new Date(lastLogin.timestamp).getTime();
        if (timeDiff < 60000) {
          reasons.push('Login muito rápido após último acesso');
        }
      }
    }

    // 6. Múltiplas tentativas falhadas recentes
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedAttempts = await db.select({ count: sql<number>`count(*)` })
      .from(schema.loginAttempts)
      .where(and(
        eq(schema.loginAttempts.userId, userId),
        eq(schema.loginAttempts.success, false),
        gt(schema.loginAttempts.timestamp, oneHourAgo)
      ));

    if (failedAttempts[0]?.count > 3) {
      reasons.push('Múltiplas tentativas falhadas recentes');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  } catch (error) {
    console.error('[Login Tracking] Erro ao detectar login suspeito:', error);
    return { suspicious: false, reasons: [] };
  }
}

/**
 * Registrar tentativa de login
 */
export async function trackLoginAttempt(req: Request, userId: number, success: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[Login Tracking] Database não disponível');
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const { browser, os, device } = parseUserAgent(userAgent);
  const location = await getLocationByIP(ip);

  const attempt: LoginAttemptInput = {
    userId,
    ip,
    userAgent,
    device,
    browser,
    os,
    location,
    success,
    timestamp: new Date(),
    suspicious: false
  };

  // Detectar acesso suspeito
  if (success) {
    const suspicionCheck = await detectSuspiciousLogin(userId, attempt);
    attempt.suspicious = suspicionCheck.suspicious;
    attempt.suspicionReasons = suspicionCheck.reasons;
  }

  try {
    // Salvar no banco usando Drizzle ORM
    await db.insert(schema.loginAttempts).values({
      userId: attempt.userId,
      ip: attempt.ip,
      userAgent: attempt.userAgent,
      device: attempt.device,
      browser: attempt.browser,
      os: attempt.os,
      country: attempt.location?.country,
      region: attempt.location?.region,
      city: attempt.location?.city,
      latitude: attempt.location?.latitude?.toString(),
      longitude: attempt.location?.longitude?.toString(),
      success: attempt.success,
      suspicious: attempt.suspicious,
      suspicionReasons: attempt.suspicionReasons?.join(', '),
      timestamp: attempt.timestamp
    });

    if (attempt.suspicious && success) {
      console.log(`[Login Tracking] Login suspeito detectado para usuário ${userId}:`, attempt.suspicionReasons);
    }

    console.log(`[Login Tracking] Login ${success ? 'bem-sucedido' : 'falhado'} registrado: user=${userId}, ip=${ip}, device=${device}`);
  } catch (error) {
    console.error('[Login Tracking] Erro ao registrar tentativa de login:', error);
  }
}

/**
 * Criar sessão ativa
 */
export async function createActiveSession(userId: number, sessionId: string, req: Request): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const { browser, os, device } = parseUserAgent(userAgent);

  try {
    await db.insert(schema.activeSessions).values({
      sessionId,
      userId,
      ip,
      userAgent,
      device,
      browser,
      os,
      createdAt: new Date(),
      lastActivity: new Date(),
    });
  } catch (error) {
    console.error('[Login Tracking] Erro ao criar sessão ativa:', error);
  }
}

/**
 * Atualizar última atividade da sessão
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(schema.activeSessions)
      .set({ lastActivity: new Date() })
      .where(eq(schema.activeSessions.sessionId, sessionId));
  } catch (error) {
    console.error('[Login Tracking] Erro ao atualizar atividade da sessão:', error);
  }
}

/**
 * Encerrar sessão
 */
export async function terminateSession(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.delete(schema.activeSessions)
      .where(eq(schema.activeSessions.sessionId, sessionId));
  } catch (error) {
    console.error('[Login Tracking] Erro ao encerrar sessão:', error);
  }
}

/**
 * Listar sessões ativas do usuário
 */
export async function getUserActiveSessions(userId: number): Promise<ActiveSessionInfo[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const sessions = await db.select({
      sessionId: schema.activeSessions.sessionId,
      userId: schema.activeSessions.userId,
      ip: schema.activeSessions.ip,
      device: schema.activeSessions.device,
      browser: schema.activeSessions.browser,
      createdAt: schema.activeSessions.createdAt,
      lastActivity: schema.activeSessions.lastActivity,
    })
      .from(schema.activeSessions)
      .where(eq(schema.activeSessions.userId, userId))
      .orderBy(desc(schema.activeSessions.lastActivity));
    
    return sessions;
  } catch (error) {
    console.error('[Login Tracking] Erro ao listar sessões ativas:', error);
    return [];
  }
}

/**
 * Encerrar todas as sessões do usuário exceto a atual
 */
export async function terminateOtherSessions(userId: number, currentSessionId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    await db.delete(schema.activeSessions)
      .where(
        and(
          eq(schema.activeSessions.userId, userId),
          ne(schema.activeSessions.sessionId, currentSessionId)
        )
      );
    
    return 0;
  } catch (error) {
    console.error('[Login Tracking] Erro ao encerrar outras sessões:', error);
    return 0;
  }
}
