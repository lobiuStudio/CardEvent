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

export async function sendEmail(message: EmailMessage, service: EmailService = getEmailService()): Promise<boolean> {
  try {
    await service.send(message);
    return true;
  } catch (error) {
    console.error("Failed to send email", error);
    return false;
  }
}
