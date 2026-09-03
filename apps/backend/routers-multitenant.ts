/**
 * Router tRPC Multi-Tenant
 * Gestão de parceiros, municípios e sincronizações
 * 
 * Autor: Eduardo Muniz | DM Technology
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { parceiros, municipios, sincronizacoes } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const multitenantRouter = router({
  // ===================================
  // Parceiros
  // ===================================
  
  parceiros: router({
    listar: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      return await db.select().from(parceiros).orderBy(desc(parceiros.createdAt));
    }),

    criar: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        cnpj: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const result = await db.insert(parceiros).values({
          nome: input.nome,
          cnpj: input.cnpj || null,
          email: input.email || null,
          status: 'ativo',
        });

        return { id: Number((result as any).insertId), ...input };
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        cnpj: z.string().optional(),
        email: z.string().optional(),
        status: z.enum(['ativo', 'inativo', 'suspenso']).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const { id, ...data } = input;
        await db.update(parceiros).set(data).where(eq(parceiros.id, id));
        
        return { success: true };
      }),
  }),

  // ===================================
  // Municípios
  // ===================================
  
  municipios: router({
    listar: protectedProcedure
      .input(z.object({
        parceiroId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        let query = db.select().from(municipios);
        
        if (input?.parceiroId) {
          query = query.where(eq(municipios.parceiroId, input.parceiroId)) as any;
        }
        
        return await query.orderBy(desc(municipios.createdAt));
      }),

    criar: protectedProcedure
      .input(z.object({
        codigoIbge: z.string().length(7),
        nome: z.string().min(1),
        uf: z.string().length(2),
        parceiroId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // Gerar token único
        const token = randomBytes(32).toString('hex');
        
        const result = await db.insert(municipios).values({
          codigoIbge: input.codigoIbge,
          nome: input.nome,
          uf: input.uf,
          parceiroId: input.parceiroId || null,
          token,
          status: 'ativo',
        });

        return { id: Number((result as any).insertId), token, ...input };
      }),

    gerarToken: protectedProcedure
      .input(z.object({
        municipioId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const token = randomBytes(32).toString('hex');
        
        await db.update(municipios)
          .set({ token })
          .where(eq(municipios.id, input.municipioId));
        
        return { token };
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        parceiroId: z.number().optional(),
        status: z.enum(['ativo', 'inativo', 'suspenso']).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const { id, ...data } = input;
        await db.update(municipios).set(data).where(eq(municipios.id, id));
        
        return { success: true };
      }),
  }),

  // ===================================
  // Sincronizações
  // ===================================
  
  sincronizacoes: router({
    listar: protectedProcedure
      .input(z.object({
        municipioId: z.number().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        let query = db.select().from(sincronizacoes);
        
        if (input.municipioId) {
          query = query.where(eq(sincronizacoes.municipioId, input.municipioId)) as any;
        }
        
        return await query
          .orderBy(desc(sincronizacoes.timestamp))
          .limit(input.limit);
      }),

    ultimaSync: protectedProcedure
      .input(z.object({
        municipioId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const result = await db
          .select()
          .from(sincronizacoes)
          .where(eq(sincronizacoes.municipioId, input.municipioId))
          .orderBy(desc(sincronizacoes.timestamp))
          .limit(1);
        
        return result[0] || null;
      }),

    estatisticas: protectedProcedure
      .input(z.object({
        municipioId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        // TODO: Implementar estatísticas agregadas
        // - Média de lag
        // - Total de bytes sincronizados
        // - Uptime do agente
        // - Histórico de falhas
        
        return {
          totalSincronizacoes: 0,
          lagMedio: 0,
          bytesSincronizados: 0,
          uptime: 0,
        };
      }),
  }),
});
