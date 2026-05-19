import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentMessage,
  AgentStreamEvent,
  EffortLevel,
  ProviderConfig,
  ToolResultContentBlock,
} from "../../domain/types/agent";
import type { IProvider } from "./IProvider";
import { tauriFetch } from "./tauriFetch";

function getActiveModel(config: ProviderConfig) {
  return config.models.find((m) => m.modelName === config.model) ?? config.models[0]
}

function mapEffortToAnthropic(effort: EffortLevel): 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
  return effort
}

function convertMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      // user 消息可能包含 text 和 tool_result 块
      const blocks = msg.content.map((b) => {
        if (b.type === "tool_result") {
          const tr = b as ToolResultContentBlock;
          return {
            type: "tool_result" as const,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
            ...(tr.is_error ? { is_error: true } : {}),
          };
        }
        // text 块
        return {
          type: "text" as const,
          text: (b as { type: "text"; text: string }).text,
        };
      });
      // 如果只有单个 text 块，简化为字符串
      if (blocks.length === 1 && blocks[0].type === "text") {
        return { role: "user", content: blocks[0].text };
      }
      return {
        role: "user",
        content: blocks as unknown as Anthropic.MessageParam["content"],
      };
    }
    if (msg.role === "assistant") {
      const blocks = msg.content.map((b) => {
        const block = b as {
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        };
        if (block.type === "text")
          return { type: "text" as const, text: block.text ?? "" };
        if (block.type === "tool_use")
          return {
            type: "tool_use" as const,
            id: block.id ?? "",
            name: block.name ?? "",
            input: block.input ?? {},
          };
        // 保留 thinking 块原样传回（MiMo 等兼容 API 要求多轮对话中保留 thinking 内容块）
        if (block.type === "thinking") {
          return {
            type: "thinking" as const,
            thinking: block.text ?? "",
          };
        }
        return { type: "text" as const, text: block.text ?? "" };
      });
      return {
        role: "assistant",
        content: blocks as unknown as Anthropic.MessageParam["content"],
      };
    }
    return { role: "user", content: "" };
  });
}

function convertTools(
  tools: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }[],
): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));
}

export class ClaudeProvider implements IProvider {
  readonly id = "anthropic";
  readonly model: string;
  private client: Anthropic;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.model = config.model || "claude-sonnet-4-20250514";
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true,
      fetch: tauriFetch,
    });
  }

  async *createMessage(
    systemPrompt: string,
    messages: AgentMessage[],
    tools: {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent> {
    const activeModel = getActiveModel(this.config)
    const thinkingMode = activeModel?.thinkingMode ?? false
    const effort = activeModel?.effort ?? 'high'
    const modelMaxTokens = activeModel?.maxTokens ?? 8192

    const maxTokens = thinkingMode
      ? Math.max(modelMaxTokens, 17000)
      : modelMaxTokens;

    const baseParams = {
      model: this.model,
      system: [{ type: "text" as const, text: systemPrompt }],
      messages: convertMessages(messages),
      tools: convertTools(tools),
      max_tokens: maxTokens,
      stream: true as const,
    };

    const params: Anthropic.MessageCreateParams = {
      ...baseParams,
      ...(this.config.temperature !== undefined
        ? { temperature: this.config.temperature }
        : {}),
      ...(thinkingMode
        ? {
            thinking: { type: "enabled" as const, budget_tokens: 16000 },
            output_config: { effort: mapEffortToAnthropic(effort) },
          }
        : {}),
    };

    const stream = await this.client.messages.create(params, { signal });

    // 跟踪 tool_use block id 和 name（通过 index 关联）
    const toolBlockIds = new Map<number, string>();
    const toolBlockNames = new Map<number, string>();

    for await (const event of stream) {
      if (event.type === "message_start" && event.message.usage) {
        yield {
          type: "usage",
          inputTokens: event.message.usage.input_tokens ?? 0,
          outputTokens: event.message.usage.output_tokens ?? 0,
        };
      }

      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "tool_use") {
          toolBlockIds.set(event.index, block.id);
          toolBlockNames.set(event.index, block.name);
          yield {
            type: "tool_call_start",
            id: block.id,
            name: block.name,
          };
        }
      }

      if (event.type === "content_block_delta") {
        const delta = event.delta;
        if (delta.type === "text_delta") {
          yield { type: "text_delta", text: delta.text };
        } else if (delta.type === "input_json_delta") {
          const blockId =
            toolBlockIds.get(event.index) ?? `tool-${event.index}`;
          yield {
            type: "tool_call_delta",
            id: blockId,
            arguments: delta.partial_json,
          };
        } else if (delta.type === "thinking_delta") {
          yield { type: "thinking_delta", text: delta.thinking };
        }
      }

      if (event.type === "content_block_stop") {
        // tool_call_end 在 content_block_stop 时发出
        const blockId = toolBlockIds.get(event.index);
        if (blockId) {
          const name = toolBlockNames.get(event.index) ?? "";
          // 需要从累积的 delta 中获取完整 input
          // 这里仅通知完成，实际 input 由 AgentLoop 组装
          yield { type: "tool_call_end", id: blockId, name, input: {} };
        }
      }

      if (event.type === "message_delta" && event.usage) {
        yield {
          type: "usage",
          inputTokens: event.usage.input_tokens ?? 0,
          outputTokens: event.usage.output_tokens ?? 0,
        };
      }
    }
  }
}
