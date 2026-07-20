export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailPort {
  send(message: TransactionalEmail): Promise<void>;
}
