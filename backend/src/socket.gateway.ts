import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Permite enviar telemetría en tiempo real
  sendTelemetry(freezerId: string, lectura: any) {
    this.server.emit(`freezer-temp-${freezerId}`, lectura);
    // Emitir también a un canal general
    this.server.emit('telemetria-general', { freezerId, ...lectura });
  }

  // Permite enviar alertas en tiempo real
  sendAlert(alerta: any) {
    this.server.emit('nueva-alerta', alerta);
  }

  // Suscripción de clientes a canales específicos del chat
  @SubscribeMessage('join-channel')
  handleJoinChannel(client: Socket, payload: { canalId: string }) {
    client.join(payload.canalId);
    console.log(`Cliente ${client.id} se unió al canal de chat: ${payload.canalId}`);
  }

  @SubscribeMessage('leave-channel')
  handleLeaveChannel(client: Socket, payload: { canalId: string }) {
    client.leave(payload.canalId);
    console.log(`Cliente ${client.id} salió del canal de chat: ${payload.canalId}`);
  }

  // Enviar mensaje de chat a los suscriptores del canal
  sendChatMessage(canalId: string, mensaje: any) {
    this.server.to(canalId).emit('nuevo-mensaje', mensaje);
  }
}
