declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config?: unknown);
    send(command: unknown): Promise<{ MessageId?: string }>;
  }
  export class SendMessageCommand { constructor(input: unknown); }
}

declare module '@aws-sdk/client-ssm' {
  export class SSMClient {
    constructor(config?: unknown);
    send(command: unknown): Promise<{ Parameter?: { Value?: string } }>;
  }
  export class GetParameterCommand { constructor(input: unknown); }
}
