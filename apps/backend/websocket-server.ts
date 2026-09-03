/**
 * Servidor WebSocket para Conexão Reversa
 * Recebe conexões dos agentes municipais e gerencia sincronização
 * 
 * Autor: Eduardo Muniz | DM Technology
 * Versão: 1.0.0
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getDb } from './db';
import { municipios, sincronizacoes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

interface AgentConnection {
  ws: WebSocket;
  municipioId: string;
  lastHeartbeat: Date;
  isAlive: boolean;
}

interface HeartbeatMessage {
  type: 'heartbeat';
  municipio_id: string;
  timestamp: string;
  status: {
    replication_lag: string;
    disk_usage: string;
    memory_usage: string;
    lag_seconds?: number;
    bytes_sent?: number;
    is_healthy?: boolean;
  };
}

interface CommandResponseMessage {
  type: 'command_response';
  command_id: string;
  status: string;
  message: string;
}

type ClientMessage = HeartbeatMessage | CommandResponseMessage;

interface ServerCommand {
  type: 'command';
  command_id: string;
  command: string;
  params?: Record<string, any>;
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
        // Extrair parâmetros da URL
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const municipioId = url.searchParams.get('municipio_id');

        if (!token || !municipioId) {
          ws.close(1008, 'Token ou município ID não fornecido');
          return;
        }

        // Validar token no banco
        const db = await getDb();
        if (!db) {
          ws.close(1011, 'Erro ao conectar ao banco de dados');
          return;
        }
        
        const municipio = await db
          .select()
          .from(municipios)
          .where(eq(municipios.token, token))
          .limit(1);

        if (municipio.length === 0 || municipio[0].codigoIbge !== municipioId) {
          ws.close(1008, 'Token inválido ou município não autorizado');
          return;
        }

        // Registrar conexão
        const connection: AgentConnection = {
          ws,
          municipioId,
          lastHeartbeat: new Date(),
          isAlive: true,
        };

        this.connections.set(municipioId, connection);

        console.log(`[WebSocket] Agente conectado: Município ${municipioId}`);

        // Configurar handlers
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

        // Enviar mensagem de boas-vindas
        this.sendCommand(municipioId, 'status', {});

      } catch (error) {
        console.error('[WebSocket] Erro ao processar conexão:', error);
        ws.close(1011, 'Erro interno do servidor');
      }
    });
  }

  private async handleMessage(municipioId: string, data: Buffer) {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'heartbeat':
          await this.handleHeartbeat(municipioId, message);
          break;

        case 'command_response':
          await this.handleCommandResponse(municipioId, message);
          break;

        default:
          console.warn(`[WebSocket] Tipo de mensagem desconhecido: ${(message as any).type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Erro ao processar mensagem do município ${municipioId}:`, error);
    }
  }

  private async handleHeartbeat(municipioId: string, message: HeartbeatMessage) {
    const connection = this.connections.get(municipioId);
    if (!connection) return;

    // Atualizar timestamp
    connection.lastHeartbeat = new Date();
    connection.isAlive = true;

    // Parsear lag_seconds do formato "0.5s" para número
    let lagSeconds = 0;
    if (message.status.replication_lag) {
      const match = message.status.replication_lag.match(/(\d+\.?\d*)/);
      if (match) {
        lagSeconds = parseFloat(match[1]);
      }
    }

    // Salvar status no banco
    try {
      const db = await getDb();
      if (!db) return;
      
      await db.insert(sincronizacoes).values({
        municipioId: parseInt(municipioId),
        status: message.status.is_healthy ? 'saudavel' : 'degradado',
        lagSeconds: String(lagSeconds),
        bytesSent: message.status.bytes_sent || 0,
        timestamp: new Date(message.timestamp),
      });

      console.log(
        `[WebSocket] Heartbeat recebido: Município ${municipioId} | Lag: ${lagSeconds}s`
      );
    } catch (error: any) {
      console.error(`[WebSocket] Erro ao salvar heartbeat:`, error);
    }
  }

  private async handleCommandResponse(municipioId: string, message: CommandResponseMessage) {
    console.log(
      `[WebSocket] Resposta de comando recebida: Município ${municipioId} | ` +
      `Comando: ${message.command_id} | Status: ${message.status}`
    );

    // TODO: Implementar lógica de processamento de respostas
    // Exemplo: atualizar status de comandos pendentes no banco
  }

  /**
   * Envia comando para um agente específico
   */
  public sendCommand(municipioId: string, command: string, params?: Record<string, any>): boolean {
    const connection = this.connections.get(municipioId);
    
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocket] Agente ${municipioId} não está conectado`);
      return false;
    }

    const commandMessage: ServerCommand = {
      type: 'command',
      command_id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      params,
    };

    try {
      connection.ws.send(JSON.stringify(commandMessage));
      console.log(`[WebSocket] Comando enviado para município ${municipioId}: ${command}`);
      return true;
    } catch (error) {
      console.error(`[WebSocket] Erro ao enviar comando:`, error);
      return false;
    }
  }

  /**
   * Envia comando para todos os agentes conectados
   */
  public broadcastCommand(command: string, params?: Record<string, any>) {
    let successCount = 0;
    
      for (const municipioId of Array.from(this.connections.keys())) {
      if (this.sendCommand(municipioId, command, params)) {
        successCount++;
      }
    }

    console.log(`[WebSocket] Comando broadcast enviado para ${successCount} agentes`);
    return successCount;
  }

  /**
   * Monitor de heartbeat - verifica conexões inativas
   */
  private startHeartbeatMonitor() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      
      for (const [municipioId, connection] of Array.from(this.connections.entries())) {
        // Verificar se último heartbeat foi há mais de 60 segundos
        const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > 60000) {
          console.warn(
            `[WebSocket] Agente ${municipioId} sem heartbeat há ${Math.floor(timeSinceLastHeartbeat / 1000)}s`
          );

          // Se não respondeu ao ping, desconectar
          if (!connection.isAlive) {
            console.error(`[WebSocket] Agente ${municipioId} não responde. Desconectando...`);
            connection.ws.terminate();
            this.connections.delete(municipioId);
            continue;
          }

          // Enviar ping
          connection.isAlive = false;
          connection.ws.ping();
        }
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  /**
   * Retorna lista de agentes conectados
   */
  public getConnectedAgents(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Retorna status de um agente específico
   */
  public getAgentStatus(municipioId: string): AgentConnection | undefined {
    return this.connections.get(municipioId);
  }

  /**
   * Fecha servidor WebSocket
   */
  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.wss.close();
    console.log('[WebSocket] Servidor encerrado');
  }
}
