import { LogStorage } from "@spring-lane/shared/log-storage";
import { LogPublisher } from "./log-publisher.js";

export class BuildLogger {
  constructor(
    private readonly storage: LogStorage,
    private readonly publisher: LogPublisher,
    private readonly deploymentId: string,
  ) {}

  async log(message: string): Promise<void> {
    const chunk = message.endsWith("\n") ? message : `${message}\n`;
    await this.storage.append(this.deploymentId, chunk);
    await this.publisher.publishChunk(this.deploymentId, chunk);
  }

  createWriter(): (chunk: string) => Promise<void> {
    return async (chunk: string) => {
      await this.storage.append(this.deploymentId, chunk);
      await this.publisher.publishChunk(this.deploymentId, chunk);
    };
  }
}
