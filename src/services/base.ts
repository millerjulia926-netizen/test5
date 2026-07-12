import type { ServiceContext } from "./context.js";

export abstract class BaseService {
  constructor(protected readonly ctx: ServiceContext) {}

  protected get db() {
    return this.ctx.db;
  }
}
