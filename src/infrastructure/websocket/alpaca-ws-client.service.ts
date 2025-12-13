import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';

interface AlpacaAuthMessage {
  action: 'auth';
  key: string;
  secret: string;
}

interface AlpacaListenMessage {
  action: 'listen';
  data: {
    streams: string[];
  };
}

interface AlpacaMessage {
  stream: string;
  data: any;
}

@Injectable()
export class AlpacaWsClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlpacaWsClientService.name);
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isAuthorized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const isPaper = this.configService.get<boolean>('alpaca.isPaper') ?? true;
    this.wsUrl = isPaper
      ? 'wss://paper-api.alpaca.markets/stream'
      : 'wss://api.alpaca.markets/stream';

    // Use API key for WebSocket (not OAuth)
    this.apiKey = this.configService.get<string>('alpaca.wsApiKey');
    this.apiSecret = this.configService.get<string>('alpaca.wsApiSecret');
  }

  async onModuleInit() {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'Alpaca WS keys are not configured. Set ALPACA_WS_API_KEY and ALPACA_WS_API_SECRET to enable trade_updates streaming.',
      );
      return;
    }
    this.logger.log('Initializing Alpaca WebSocket client...');
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.logger.log(`Connecting to Alpaca WebSocket: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(data));
      this.ws.on('error', (error: Error) => this.handleError(error));
      this.ws.on('close', (code: number, reason: Buffer) =>
        this.handleClose(code, reason),
      );
    } catch (error) {
      this.logger.error('Failed to create WebSocket connection', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.logger.log('WebSocket connection opened');
    this.reconnectAttempts = 0;
    this.authenticate();
  }

  private authenticate(): void {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Skipping Alpaca WS authentication (missing keys)');
      return;
    }
    const authMessage: AlpacaAuthMessage = {
      action: 'auth',
      key: this.apiKey,
      secret: this.apiSecret,
    };

    this.logger.log('Sending authentication message...');
    this.send(authMessage);
  }

  private subscribe(): void {
    const listenMessage: AlpacaListenMessage = {
      action: 'listen',
      data: {
        streams: ['trade_updates'],
      },
    };

    this.logger.log('Subscribing to trade_updates stream...');
    this.send(listenMessage);
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      let raw = '';
      if (typeof data === 'string') {
        raw = data;
      } else if (Buffer.isBuffer(data)) {
        raw = data.toString('utf8');
      } else if (Array.isArray(data)) {
        raw = Buffer.concat(data).toString('utf8');
      } else if (data instanceof ArrayBuffer) {
        raw = Buffer.from(data).toString('utf8');
      }

      const message: AlpacaMessage[] = JSON.parse(raw);

      // Alpaca sends array of messages
      if (Array.isArray(message)) {
        message.forEach((msg) => this.processMessage(msg));
      } else {
        this.processMessage(message);
      }
    } catch (error) {
      this.logger.error(
        'Failed to parse WebSocket message',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private processMessage(message: AlpacaMessage): void {
    const { stream, data } = message;

    switch (stream) {
      case 'authorization':
        this.handleAuthorization(data);
        break;
      case 'listening':
        this.handleListening(data);
        break;
      case 'trade_updates':
        this.handleTradeUpdate(message);
        break;
      default:
        this.logger.debug(`Unknown stream: ${stream}`, data);
    }
  }

  private handleAuthorization(data: any): void {
    if (data.status === 'authorized') {
      this.logger.log('✅ WebSocket authenticated successfully');
      this.isAuthorized = true;
      this.subscribe();
    } else {
      this.logger.error('❌ WebSocket authentication failed', data);
      this.isAuthorized = false;
    }
  }

  private handleListening(data: any): void {
    this.logger.log('📡 Subscribed to streams:', data.streams);
  }

  private handleTradeUpdate(message: AlpacaMessage): void {
    this.logger.debug('📊 Trade update received:', message.data.event);
    // Emit event for AlpacaStreamGateway to handle
    this.eventEmitter.emit('alpaca.trade_update', message.data);
  }

  private handleError(error: Error): void {
    this.logger.error('WebSocket error:', error);
  }

  private handleClose(code: number, reason: Buffer): void {
    this.logger.warn(
      `WebSocket connection closed. Code: ${code}, Reason: ${reason.toString()}`,
    );
    this.isAuthorized = false;
    this.ws = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        'Max reconnect attempts reached. Giving up on WebSocket connection.',
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.logger.warn('Cannot send message, WebSocket is not open');
    }
  }

  onModuleDestroy() {
    this.logger.log('Closing Alpaca WebSocket connection...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
