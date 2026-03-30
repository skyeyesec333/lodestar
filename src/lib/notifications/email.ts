export async function sendConsultationRequestEmail(params: {
  expertId: string;
  expertName: string;
  userId: string;
  context: string;
  timing: string;
}): Promise<void> {
  // TODO: wire to Resend / SendGrid when email provider is configured.
  console.log("[ConsultationRequest]", params);
}
