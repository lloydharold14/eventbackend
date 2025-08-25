// Event Bus Implementation
// Based on architecture rules for Event-Driven Architecture

import { DomainEvent, EventHandler, EventBus as IEventBus, EventEnvelope } from '../types/events';
import { Logger } from '@aws-lambda-powertools/logger';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const logger = new Logger({ serviceName: 'event-bus' });

export interface EventBusConfig {
  eventBridgeBusName: string;
  sqsQueueUrl?: string;
  snsTopicArn?: string;
  region: string;
  enableLocalHandlers: boolean;
  enableEventBridge: boolean;
  enableSQS: boolean;
  enableSNS: boolean;
}

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  serviceName: string;
  priority: number;
}

export interface EventRoutingRule {
  eventType: string;
  targets: {
    eventBridge?: boolean;
    sqs?: boolean;
    sns?: boolean;
    local?: boolean;
  };
  filters?: {
    aggregateType?: string;
    region?: string;
    priority?: number;
  };
}

// AWS Event Bus Implementation
export class AWSEventBus implements IEventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private routingRules: Map<string, EventRoutingRule> = new Map();
  private eventBridgeClient: EventBridgeClient;
  private sqsClient: SQSClient;
  private snsClient: SNSClient;
  private config: EventBusConfig;

  constructor(config: EventBusConfig) {
    this.config = config;
    this.eventBridgeClient = new EventBridgeClient({ region: config.region });
    this.sqsClient = new SQSClient({ region: config.region });
    this.snsClient = new SNSClient({ region: config.region });
  }

  public subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription: EventSubscription = {
      eventType,
      handler,
      serviceName: 'unknown',
      priority: 0
    };

    this.subscriptions.get(eventType)!.push(subscription);
    
    // Sort by priority (higher priority first)
    this.subscriptions.get(eventType)!.sort((a, b) => b.priority - a.priority);

    logger.info('Event subscription added', {
      eventType,
      serviceName: subscription.serviceName,
      priority: subscription.priority
    });
  }

  public unsubscribe(eventType: string, handler: EventHandler): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      const index = subscriptions.findIndex(sub => sub.handler === handler);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        logger.info('Event subscription removed', { eventType });
      }
    }
  }

  public async publish(event: DomainEvent): Promise<void> {
    try {
      const routingRule = this.getRoutingRule(event.eventType);
      const envelope = this.createEventEnvelope(event);

      // Publish to local handlers
      if (this.config.enableLocalHandlers && routingRule.targets.local) {
        await this.publishToLocalHandlers(event);
      }

      // Publish to EventBridge
      if (this.config.enableEventBridge && routingRule.targets.eventBridge) {
        await this.publishToEventBridge(envelope);
      }

      // Publish to SQS
      if (this.config.enableSQS && routingRule.targets.sqs && this.config.sqsQueueUrl) {
        await this.publishToSQS(envelope);
      }

      // Publish to SNS
      if (this.config.enableSNS && routingRule.targets.sns && this.config.snsTopicArn) {
        await this.publishToSNS(envelope);
      }

      logger.info('Event published successfully', {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        targets: Object.keys(routingRule.targets).filter(key => routingRule.targets[key as keyof typeof routingRule.targets])
      });

    } catch (error) {
      logger.error('Failed to publish event', {
        eventId: event.eventId,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async publishBatch(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }

  public addRoutingRule(rule: EventRoutingRule): void {
    this.routingRules.set(rule.eventType, rule);
    logger.info('Routing rule added', { eventType: rule.eventType, targets: rule.targets });
  }

  public removeRoutingRule(eventType: string): void {
    this.routingRules.delete(eventType);
    logger.info('Routing rule removed', { eventType });
  }

  public getSubscriptions(eventType: string): EventSubscription[] {
    return this.subscriptions.get(eventType) || [];
  }

  public getRoutingRules(): Map<string, EventRoutingRule> {
    return this.routingRules;
  }

  // Private methods
  private async publishToLocalHandlers(event: DomainEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.eventType) || [];
    
    const handlerPromises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.handler.canHandle(event.eventType)) {
          await subscription.handler.handle(event);
          logger.debug('Local handler executed successfully', {
            eventType: event.eventType,
            serviceName: subscription.serviceName
          });
        }
      } catch (error) {
        logger.error('Local handler failed', {
          eventType: event.eventType,
          serviceName: subscription.serviceName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't throw here to allow other handlers to execute
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  private async publishToEventBridge(envelope: EventEnvelope): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'event-management-platform',
          DetailType: envelope.event.eventType,
          Detail: JSON.stringify(envelope),
          EventBusName: this.config.eventBridgeBusName,
          Time: envelope.timestamp
        }
      ]
    });

    await this.eventBridgeClient.send(command);
  }

  private async publishToSQS(envelope: EventEnvelope): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.config.sqsQueueUrl!,
      MessageBody: JSON.stringify(envelope),
      MessageAttributes: {
        'EventType': {
          DataType: 'String',
          StringValue: envelope.event.eventType
        },
        'AggregateType': {
          DataType: 'String',
          StringValue: envelope.event.aggregateType
        },
        'CorrelationId': {
          DataType: 'String',
          StringValue: envelope.event.correlationId
        }
      }
    });

    await this.sqsClient.send(command);
  }

  private async publishToSNS(envelope: EventEnvelope): Promise<void> {
    const command = new PublishCommand({
      TopicArn: this.config.snsTopicArn!,
      Message: JSON.stringify(envelope),
      MessageAttributes: {
        'EventType': {
          DataType: 'String',
          StringValue: envelope.event.eventType
        },
        'AggregateType': {
          DataType: 'String',
          StringValue: envelope.event.aggregateType
        }
      }
    });

    await this.snsClient.send(command);
  }

  private createEventEnvelope(event: DomainEvent): EventEnvelope {
    return {
      event,
      metadata: {
        userId: event.metadata?.userId,
        sessionId: event.metadata?.sessionId,
        userAgent: event.metadata?.userAgent,
        ipAddress: event.metadata?.ipAddress,
        region: event.metadata?.region,
        locale: event.metadata?.locale,
        source: 'event-management-platform',
        version: '1.0.0'
      },
      routingKey: `${event.aggregateType}.${event.eventType}`,
      timestamp: event.timestamp,
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  private getRoutingRule(eventType: string): EventRoutingRule {
    return this.routingRules.get(eventType) || {
      eventType,
      targets: {
        local: true,
        eventBridge: true,
        sqs: false,
        sns: false
      }
    };
  }
}

// Local Event Bus Implementation (for testing and development)
export class LocalEventBus implements IEventBus {
  private subscriptions: Map<string, EventHandler[]> = new Map();
  private logger = new Logger({ serviceName: 'local-event-bus' });

  public subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(handler);
    this.logger.info('Local event subscription added', { eventType });
  }

  public unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.logger.info('Local event subscription removed', { eventType });
      }
    }
  }

  public async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscriptions.get(event.eventType) || [];
    
    const handlerPromises = handlers.map(async (handler) => {
      try {
        if (handler.canHandle(event.eventType)) {
          await handler.handle(event);
          this.logger.debug('Local event handler executed', {
            eventType: event.eventType,
            eventId: event.eventId
          });
        }
      } catch (error) {
        this.logger.error('Local event handler failed', {
          eventType: event.eventType,
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  public async publishBatch(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }
}

// Event Bus Factory
export class EventBusFactory {
  public static createEventBus(config: EventBusConfig): IEventBus {
    if (config.enableEventBridge || config.enableSQS || config.enableSNS) {
      return new AWSEventBus(config);
    } else {
      return new LocalEventBus();
    }
  }
}

// Event Bus Configuration Builder
export class EventBusConfigBuilder {
  private config: Partial<EventBusConfig> = {
    enableLocalHandlers: true,
    enableEventBridge: false,
    enableSQS: false,
    enableSNS: false
  };

  public withEventBridge(busName: string, region: string): EventBusConfigBuilder {
    this.config.enableEventBridge = true;
    this.config.eventBridgeBusName = busName;
    this.config.region = region;
    return this;
  }

  public withSQS(queueUrl: string, region: string): EventBusConfigBuilder {
    this.config.enableSQS = true;
    this.config.sqsQueueUrl = queueUrl;
    this.config.region = region;
    return this;
  }

  public withSNS(topicArn: string, region: string): EventBusConfigBuilder {
    this.config.enableSNS = true;
    this.config.snsTopicArn = topicArn;
    this.config.region = region;
    return this;
  }

  public withLocalHandlers(enabled: boolean = true): EventBusConfigBuilder {
    this.config.enableLocalHandlers = enabled;
    return this;
  }

  public build(): EventBusConfig {
    if (!this.config.region) {
      throw new Error('Region is required when using AWS services');
    }

    return this.config as EventBusConfig;
  }
}
