/**
 * WebSocket Server para Dados em Tempo Real
 * Atualiza indicadores, notificações e status automaticamente
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : '*',
      methods: ['GET', 'POST']
    },
    path: '/api/socket'
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join room por unidade/equipe
    socket.on('join:unit', (unitId: string) => {
      socket.join(`unit:${unitId}`);
      console.log(`[WebSocket] Socket ${socket.id} joined unit:${unitId}`);
    });

    socket.on('join:team', (teamId: string) => {
      socket.join(`team:${teamId}`);
      console.log(`[WebSocket] Socket ${socket.id} joined team:${teamId}`);
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  // Emitir atualização de indicadores a cada 30 segundos
  setInterval(() => {
    if (io) {
      io.emit('indicators:update', {
        timestamp: new Date().toISOString(),
        message: 'Indicadores atualizados'
      });
    }
  }, 30000);

  return io;
}

/**
 * Emitir atualização de indicador específico
 */
export function emitIndicatorUpdate(indicatorCode: string, data: any) {
  if (io) {
    io.emit('indicator:update', {
      code: indicatorCode,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Emitir notificação para usuário específico
 */
export function emitNotification(userId: number, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

/**
 * Emitir atualização de qualidade de dados
 */
export function emitQualityUpdate(unitId: string, data: any) {
  if (io) {
    io.to(`unit:${unitId}`).emit('quality:update', data);
  }
}

/**
 * Emitir atualização de tarefa ACS
 */
export function emitTaskUpdate(acsId: number, task: any) {
  if (io) {
    io.to(`acs:${acsId}`).emit('task:update', task);
  }
}

export function getIO() {
  return io;
}
