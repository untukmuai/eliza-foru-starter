export class AppError extends Error {
    code: number;
  
    constructor(message: string, code: number = 500) {
      super(message);
      this.code = code;
      Object.setPrototypeOf(this, AppError.prototype);
    }
  }