export class AuthFlowError extends Error {
  constructor(
    public readonly code:
      | "access_denied"
      | "email_not_verified"
      | "callback_failed"
      | "unexpected",
    message: string
  ) {
    super(message);
    this.name = "AuthFlowError";
  }
}

