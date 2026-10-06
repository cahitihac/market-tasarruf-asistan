declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config?: unknown);
    send(command: unknown): Promise<{ MessageId?: string; Attributes?: Record<string, string> }>;
    destroy(): void;
  }
  export class SendMessageCommand { constructor(input: unknown); }
  export class GetQueueAttributesCommand { constructor(input: unknown); }
}
