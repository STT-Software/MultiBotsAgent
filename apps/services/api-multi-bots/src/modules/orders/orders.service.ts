import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type {
  IOrderRepository,
  IAgentRepository,
  IUserRepository,
  IChannelRepository,
  IEmailQueueRepository,
} from '@multibotagents/db';
import type { Order, OutgoingMessageEvent } from '@multibotagents/types';
import { EmailTemplate } from '@multibotagents/types';
import { ORDER_REPOSITORY } from './constants';
import { CreateOrderDto, UpdateOrderDto, QueryOrderDto } from './dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject('AGENT_REPO')
    private readonly agentRepository: IAgentRepository,
    @Inject('USER_REPO')
    private readonly userRepository: IUserRepository,
    @Inject('CHANNEL_REPO')
    private readonly channelRepo: IChannelRepository,
    @Inject('EMAIL_QUEUE_REPO')
    private readonly emailQueueRepository: IEmailQueueRepository,
    @Inject('SQS_CLIENT')
    private readonly sqsClient: SQSClient,
  ) {}

  /**
   * Crea un nuevo pedido, valida el agente y encola las notificaciones por WhatsApp e Email.
   */
  async createOrder(companyId: string, dto: CreateOrderDto): Promise<Order> {
    // 1. Validar que el agente exista y pertenezca a la misma empresa
    const agent = await this.agentRepository.findById(dto.agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${dto.agentId}`);
    }
    if (agent.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos sobre el agente seleccionado.');
    }
    if (agent.tipo !== 'cotizador') {
      throw new BadRequestException('El agente seleccionado no es del tipo cotizador.');
    }

    // 2. Crear la orden en base de datos
    const orderData: Omit<Order, 'id'> = {
      companyId,
      agentId: dto.agentId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      items: dto.items,
      total: dto.total,
      status: dto.status,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const order = await this.orderRepository.create(orderData);
    this.logger.log(`Pedido creado exitosamente en BD con ID: ${order.id}`);

    // Construir resumen de ítems para notificaciones
    const itemsSummary = order.items
      .map((item) => `${item.cantidad}x ${item.nombre} ($${item.subtotal})`)
      .join(', ');

    // 3. Notificación de WhatsApp al cliente
    await this.sendWhatsAppNotification(order, itemsSummary);

    // 4. Notificación de Email al cliente
    await this.sendClientEmailNotification(order, itemsSummary);

    // 5. Notificación de Email a los operadores de la empresa
    await this.sendOperatorEmailNotification(order, companyId, itemsSummary);

    return order;
  }

  /**
   * Obtiene todos los pedidos filtrados por empresa y parámetros opcionales.
   */
  async getOrders(companyId: string, query: QueryOrderDto): Promise<Order[]> {
    // Si se especifica agentId, validar que pertenezca a la empresa
    if (query.agentId) {
      const agent = await this.agentRepository.findById(query.agentId);
      if (!agent || agent.companyId !== companyId) {
        throw new ForbiddenException('No tienes permisos sobre el agente solicitado.');
      }
    }

    const filter: Partial<Order> = { companyId };
    if (query.agentId) filter.agentId = query.agentId;
    if (query.customerPhone) filter.customerPhone = query.customerPhone;
    if (query.status) filter.status = query.status;

    return this.orderRepository.findAll(filter);
  }

  /**
   * Obtiene un pedido específico por ID validando pertenencia a la empresa.
   */
  async getOrder(id: string, companyId: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Pedido no encontrado: ${id}`);
    }
    if (order.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para ver este pedido.');
    }
    return order;
  }

  /**
   * Actualiza los datos de un pedido.
   */
  async updateOrder(id: string, companyId: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Pedido no encontrado: ${id}`);
    }
    if (order.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para modificar este pedido.');
    }

    const updateData: Partial<Order> = {};
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.items !== undefined) updateData.items = dto.items;
    if (dto.total !== undefined) updateData.total = dto.total;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updatedOrder = await this.orderRepository.update(id, updateData);
    this.logger.log(`Pedido ${id} actualizado correctamente`);
    return updatedOrder;
  }

  /**
   * Cancela un pedido (actualiza estado a cancelled).
   */
  async cancelOrder(id: string, companyId: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Pedido no encontrado: ${id}`);
    }
    if (order.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para cancelar este pedido.');
    }

    if (order.status === 'cancelled') {
      return order; // Ya está cancelado
    }

    const updatedOrder = await this.orderRepository.update(id, { status: 'cancelled' });
    this.logger.log(`Pedido ${id} cancelado correctamente`);
    return updatedOrder;
  }

  // ─── Helpers de Notificaciones ──────────────────────────────────────────────

  /**
   * Envía notificación de WhatsApp de forma asíncrona a través de la cola SQS.
   */
  private async sendWhatsAppNotification(order: Order, itemsSummary: string): Promise<void> {
    const outgoingQueueUrl = process.env.WHATSAPP_OUTGOING_QUEUE_URL;
    if (!outgoingQueueUrl) {
      this.logger.warn('WHATSAPP_OUTGOING_QUEUE_URL no está configurada, omitiendo envío de WhatsApp');
      return;
    }

    try {
      const channel = await this.channelRepo.findByAgentId(order.agentId);
      if (!channel) {
        this.logger.warn(`No se encontró canal de WhatsApp activo para el agente ${order.agentId}`);
        return;
      }

      // Limpieza del número del destinatario
      const recipientPhone = order.customerPhone.replace('whatsapp_', '').replace(/\+/g, '').trim();

      const messageContent = `¡Hola, ${order.customerName}! Tu pedido ha sido registrado con éxito.\n\n` +
        `📦 *Resumen del pedido:* ${itemsSummary}\n` +
        `💰 *Total:* $${order.total}\n` +
        `📋 *Estado:* Pendiente de confirmación.`;

      const outgoingEvent: OutgoingMessageEvent = {
        channelId: channel.id,
        phoneNumberId: channel.phoneNumberId ?? '',
        recipientPhone,
        conversationId: `whatsapp_${recipientPhone}`,
        messages: [
          {
            type: 'text',
            content: messageContent,
          },
        ],
        escalated: false,
      };

      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: outgoingQueueUrl,
          MessageBody: JSON.stringify(outgoingEvent),
        }),
      );

      this.logger.log(`Notificación de WhatsApp para ${recipientPhone} encolada exitosamente.`);
    } catch (err) {
      this.logger.error(
        `Error al encolar notificación de WhatsApp: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Encola un email de confirmación para el cliente.
   */
  private async sendClientEmailNotification(order: Order, itemsSummary: string): Promise<void> {
    try {
      await this.emailQueueRepository.enqueue({
        to: order.customerEmail,
        template: EmailTemplate.ORDER_CLIENT,
        payload: {
          username: order.customerName,
          orderId: order.id,
          total: String(order.total),
          itemsSummary,
        },
      });
      this.logger.log(`Email de confirmación de pedido encolado para el cliente: ${order.customerEmail}`);
    } catch (err) {
      this.logger.error(
        `Error al encolar email para el cliente: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Encola un email para notificar a todos los operadores/usuarios de la empresa sobre el nuevo pedido.
   */
  private async sendOperatorEmailNotification(
    order: Order,
    companyId: string,
    itemsSummary: string,
  ): Promise<void> {
    try {
      const operators = await this.userRepository.findAll({ companyId });
      for (const operator of operators) {
        if (!operator.email) continue;
        await this.emailQueueRepository.enqueue({
          to: operator.email,
          template: EmailTemplate.ORDER_OPERATOR,
          payload: {
            username: operator.email,
            orderId: order.id,
            clientName: order.customerName,
            clientPhone: order.customerPhone,
            total: String(order.total),
            itemsSummary,
          },
        });
      }
      this.logger.log(
        `Emails de nuevo pedido encolados para ${operators.length} operadores de la empresa ${companyId}`,
      );
    } catch (err) {
      this.logger.error(
        `Error al encolar emails para los operadores: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
