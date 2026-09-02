/**
 * Servidor WebSocket Simplificado para Conexão Reversa
 * Versão simplificada sem dependência do Drizzle ORM
 * 
 * Autor: Eduardo Muniz | DM Technology
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface AgentConnection {
  ws: WebSocket;
  municipioId: string;
  lastHeartbeat: Date;
  isAlive: boolean;
}

export class WebSocketAgentServer {
  private wss: WebSocketServer;
  private connections: Map<string, AgentConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.startHeartbeatMonitor();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const municipioId = url.searchParams.get('municipio_id');

        if (!token || !municipioId) {
          ws.close(1008, 'Token ou município ID não fornecido');
          return;
        }

        // TODO: Validar token no banco de dados
        // Por enquanto, aceitar qualquer conexão para testes

        const connection: AgentConnection = {
          ws,
          municipioId,
          lastHeartbeat: new Date(),
          isAlive: true,
        };

        this.connections.set(municipioId, connection);
        console.log(`[WebSocket] Agente conectado: Município ${municipioId}`);

        ws.on('message', (data: Buffer) => {
          this.handleMessage(municipioId, data);
        });

        ws.on('pong', () => {
          connection.isAlive = true;
        });

        ws.on('close', () => {
          this.connections.delete(municipioId);
          console.log(`[WebSocket] Agente desconectado: Município ${municipioId}`);
        });

        ws.on('error', (error) => {
          console.error(`[WebSocket] Erro no município ${municipioId}:`, error);
        });

      } catch (error) {
        console.error('[WebSocket] Erro ao processar conexão:', error);
        ws.close(1011, 'Erro interno do servidor');
      }
    });
  }

  private handleMessage(municipioId: string, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'heartbeat') {
        const connection = this.connections.get(municipioId);
        if (connection) {
          connection.lastHeartbeat = new Date();
          connection.isAlive = true;
          console.log(`[WebSocket] Heartbeat: Município ${municipioId}`);
        }
      }
    } catch (error) {
      console.error(`[WebSocket] Erro ao processar mensagem:`, error);
    }
  }

  public sendCommand(municipioId: string, command: string, params?: any): boolean {
    const connection = this.connections.get(municipioId);
    
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const message = {
      type: 'command',
      command_id: `cmd_${Date.now()}`,
      command,
      params,
    };

    try {
      connection.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WebSocket] Erro ao enviar comando:`, error);
      return false;
    }
  }

  private startHeartbeatMonitor() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const entries = Array.from(this.connections.entries());
      
      for (const [municipioId, connection] of entries) {
        const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > 60000) {
          if (!connection.isAlive) {
            connection.ws.terminate();
            this.connections.delete(municipioId);
            continue;
          }
          
          connection.isAlive = false;
          connection.ws.ping();
        }
      }
    }, 30000);
  }

  public getConnectedAgents(): string[] {
    return Array.from(this.connections.keys());
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
