import type { EmailService } from "./email-service";

export const consoleEmailService: EmailService = {
  async send(message) {
    console.log("[email]", JSON.stringify(message, null, 2));
  },
};
