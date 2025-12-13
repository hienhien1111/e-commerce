import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import type { TradingTokenRepositoryPort } from '@/application/trading/ports/alpaca-token.repository';
import { ALPACA_TOKEN_REPOSITORY } from '@/application/trading/ports/alpaca-token.repository';
import { TradeUpdateEventDto } from '@/infrastructure/dto/trade-update.dto';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  path: '/alpaca/stream',
  cors: {
    origin: '*', // Configure this based on your frontend URL
  },
})
export class AlpacaStreamGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AlpacaStreamGateway.name);
  private userConnections = new Map<string, Socket>();

  constructor(
    @Inject(ALPACA_TOKEN_REPOSITORY)
    private readonly tokenRepository: TradingTokenRepositoryPort,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('✅ AlpacaStreamGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from query params or headers
      const token =
        client.handshake.query.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT and extract userId
      const payload = this.jwtService.verify(token as string);
      const userId = payload.id;

      if (!userId) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Store connection
      this.userConnections.set(userId, client);
      this.logger.log(
        `✅ User ${userId} connected (socket: ${client.id}). Total connections: ${this.userConnections.size}`,
      );

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to Alpaca stream',
        userId,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Find and remove user connection
    for (const [userId, socket] of this.userConnections.entries()) {
      if (socket.id === client.id) {
        this.userConnections.delete(userId);
        this.logger.log(
          `❌ User ${userId} disconnected. Remaining connections: ${this.userConnections.size}`,
        );
        break;
      }
    }
  }

  @OnEvent('alpaca.trade_update')
  async handleTradeUpdate(data: TradeUpdateEventDto) {
    try {
      // Extract account_id from order
      const accountId = data.order?.account_id;

      if (!accountId) {
        this.logger.warn('Trade update missing account_id', data);
        return;
      }

      // Find user by accountId
      const token = await this.tokenRepository.findByAccountId(accountId);

      if (!token) {
        this.logger.warn(`No user found for account_id: ${accountId}`);
        return;
      }

      // Find socket connection for this user
      const socket = this.userConnections.get(token.userId);

      if (!socket) {
        this.logger.debug(
          `User ${token.userId} not connected, skipping trade update`,
        );
        return;
      }

      // Send trade update to frontend
      socket.emit('trade_update', data);
      this.logger.debug(
        `📤 Sent trade update to user ${token.userId} (event: ${data.event})`,
      );
    } catch (error) {
      this.logger.error('Error handling trade update:', error);
    }
  }
}
