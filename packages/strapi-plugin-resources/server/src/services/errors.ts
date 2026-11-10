export class ResourceValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ResourceValidationError";
  }
}

export class ResourceNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message: string) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}
