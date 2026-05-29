import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { MemoryService } from "../memory.service";
import type { ChatMessage } from "@multibotagents/types";

export class MongoDBChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "mongodb"];

  constructor(
    private readonly memoryService: MemoryService,
    private readonly sessionId: string,
    private readonly limit?: number,
    private readonly includeEscalated: boolean = false
  ) {
    super();
  }

  async getMessages(): Promise<BaseMessage[]> {
    const history = await this.memoryService.getHistory(
      this.sessionId,
      this.limit,
      this.includeEscalated
    );

    return history.map((msg) => {
      switch (msg.type) {
        case "human":
          return new HumanMessage(msg.content);
        case "ai":
          return new AIMessage(msg.content);
        case "system":
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  async addMessage(message: BaseMessage): Promise<void> {
    let type: "human" | "ai" | "system";
    let source: "agent" | "operator" | undefined;

    const messageType = message._getType();
    if (messageType === "human") {
      type = "human";
    } else if (messageType === "ai") {
      type = "ai";
      source = "agent";
    } else {
      type = "system";
    }

    const chatMessage: ChatMessage = {
      type,
      content: message.content as string,
      timestamp: new Date(),
    };

    if (source) {
      chatMessage.source = source;
    }

    await this.memoryService.addMessage(this.sessionId, chatMessage);
  }

  async addUserMessage(message: string): Promise<void> {
    await this.addMessage(new HumanMessage(message));
  }

  async addAIMessage(message: string): Promise<void> {
    await this.addMessage(new AIMessage(message));
  }

  async clear(): Promise<void> {
    await this.memoryService.clearMemory(this.sessionId);
  }
}
