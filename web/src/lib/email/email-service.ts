import { consoleEmailService } from "./console-email-service";
import { smtpEmailService } from "./smtp-email-service";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailService = {
  send(message: EmailMessage): Promise<void>;
};

export function getEmailService(): EmailService {
  return process.env.EMAIL_PROVIDER === "smtp" ? smtpEmailService : consoleEmailService;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailService().send(message);
}
