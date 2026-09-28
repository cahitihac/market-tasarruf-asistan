import { randomUUID } from 'node:crypto';

type LifecycleEmail = {
  email: string;
  expiresAt: Date;
  url: string;
};

export type DevelopmentEmail = LifecycleEmail & {
  id: string;
  type: 'verification' | 'password-reset';
  createdAt: Date;
};

export interface EmailProvider {
  sendVerificationEmail(message: LifecycleEmail): Promise<void>;
  sendPasswordResetEmail(message: LifecycleEmail): Promise<void>;
}

class DevelopmentEmailProvider implements EmailProvider {
  readonly outbox: DevelopmentEmail[] = [];

  async sendVerificationEmail(message: LifecycleEmail) {
    this.remember('verification', message);
  }

  async sendPasswordResetEmail(message: LifecycleEmail) {
    this.remember('password-reset', message);
  }

  private remember(type: DevelopmentEmail['type'], message: LifecycleEmail) {
    this.outbox.unshift({ id: randomUUID(), type, createdAt: new Date(), ...message });
    this.outbox.splice(25);
  }
}

export const developmentEmailProvider = new DevelopmentEmailProvider();
export const emailProvider: EmailProvider = developmentEmailProvider;

export function developmentEmailMessages() {
  return developmentEmailProvider.outbox.map(message => ({
    id: message.id,
    type: message.type,
    email: message.email,
    createdAt: message.createdAt,
    expiresAt: message.expiresAt,
    url: message.url,
  }));
}
