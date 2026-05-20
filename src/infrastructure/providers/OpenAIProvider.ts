import OpenAI from "openai";
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

function mapEffortToOpenAI(effort: EffortLevel): 'low' | 'medium' | 'high' {
  const map: Record<EffortLevel, 'low' | 'medium' | 'high'> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'high',
    max: 'high',
  }
  return map[effort] ?? 'high'
}

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function convertMessages(messages: AgentMessage[]): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      // user 消息可能包含 text 和 tool_result 块
      const toolResults = msg.content.filter(
        (b) => b.type === "tool_result",
      ) as ToolResultContentBlock[];
      const textBlocks = msg.content.filter((b) => b.type === "text") as {
        type: "text";
        text: string;
      }[];

      // tool_result 块转为 OpenAI tool 消息
      for (const tr of toolResults) {
        result.push({
          role: "tool",
          tool_call_id: tr.tool_use_id,
          content: tr.content,
        });
      }

      // text 块转为 user 消息
      if (textBlocks.length > 0) {
        const text = textBlocks.map((b) => b.text).join("\n");
        result.push({ role: "user", content: text });
      }
    } else if (msg.role === "assistant") {
      const textBlocks = msg.content.filter((b) => b.type === "text") as {
        type: "text";
        text: string;
      }[];
      const thinkingBlocks = msg.content.filter(
        (b) => b.type === "thinking",
      ) as {
        type: "thinking";
        text: string;
      }[];
      const toolUseBlocks = msg.content.filter(
        (b) => b.type === "tool_use",
      ) as {
        type: "tool_use";
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }[];

      const text = textBlocks.map((b) => b.text).join("\n");
      const reasoningContent =
        thinkingBlocks.map((b) => b.text).join("\n") || undefined;

      if (toolUseBlocks.length > 0) {
        // assistant 消息带 tool calls
        const toolCalls = toolUseBlocks.map((b) => ({
          id: b.id ?? "",
          type: "function" as const,
          function: {
            name: b.name ?? "",
            arguments: JSON.stringify(b.input ?? {}),
          },
        }));
        const assistantMsg: OpenAIMessage & { reasoning_content?: string } = {
          role: "assistant",
          content: text || null,
          tool_calls: toolCalls,
        };
        if (reasoningContent) {
          assistantMsg.reasoning_content = reasoningContent;
        }
        result.push(assistantMsg as OpenAIMessage);
      } else {
        const assistantMsg: OpenAIMessage & { reasoning_content?: string } = {
          role: "assistant",
          content: text,
        };
        if (reasoningContent) {
          assistantMsg.reasoning_content = reasoningContent;
        }
        result.push(assistantMsg as OpenAIMessage);
      }
    }
  }

  return result;
}

function convertTools(
  tools: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }[],
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

export class OpenAIProvider implements IProvider {
  readonly id = "openai";
  readonly model: string;
  private client: OpenAI;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.model = config.model || "gpt-4o";
    this.config = config;
    this.client = new OpenAI({
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
    const apiTools = convertTools(tools);
    const apiMessages = convertMessages(messages);

    const activeModel = getActiveModel(this.config)
    const thinkingMode = activeModel?.thinkingMode ?? false
    const effort = activeModel?.effort ?? 'high'
    const modelMaxTokens = activeModel?.maxTokens ?? 8192

    const baseParams = {
      model: this.model,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...apiMessages,
      ],
      tools: apiTools.length > 0 ? apiTools : undefined,
      stream: true as const,
      stream_options: { include_usage: true },
    };

    const params = {
      ...baseParams,
      max_tokens: modelMaxTokens,
      ...(this.config.temperature !== undefined
        ? { temperature: this.config.temperature }
        : {}),
      ...(thinkingMode
        ? {
            reasoning_effort: mapEffortToOpenAI(effort),
            extra_body: { thinking: { type: "enabled" as const } },
          }
        : {}),
    };

    const stream = await this.client.chat.completions.create(params, {
      signal,
    });

    // 跟踪 tool_calls 累积状态
    type ToolAccum = { id: string; name: string; arguments: string };
    const toolAccumMap = new Map<number, ToolAccum>();

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]
        ?.delta as OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
        reasoning_content?: string;
      };
      const finishReason = chunk.choices?.[0]?.finish_reason;

      // usage
      if (chunk.usage) {
        yield {
          type: "usage",
          inputTokens: chunk.usage.prompt_tokens ?? 0,
          outputTokens: chunk.usage.completion_tokens ?? 0,
          cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens ?? undefined,
          reasoningTokens: chunk.usage.completion_tokens_details?.reasoning_tokens ?? undefined,
        };
      }

      if (!delta) continue;

      // reasoning_content delta (for reasoning models like o1, o3)
      if (delta.reasoning_content) {
        yield { type: "thinking_delta", text: delta.reasoning_content };
      }

      // text delta
      if (delta.content) {
        yield { type: "text_delta", text: delta.content };
      }

      // tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (tc.id) {
            // tool_call_start — 首次出现该 tool_call
            toolAccumMap.set(idx, {
              id: tc.id,
              name: tc.function?.name ?? "",
              arguments: tc.function?.arguments ?? "",
            });
            yield {
              type: "tool_call_start",
              id: tc.id,
              name: tc.function?.name ?? "",
            };
          } else {
            const existing = toolAccumMap.get(idx);
            if (existing) {
              // tool_call_delta
              if (tc.function?.arguments) {
                existing.arguments += tc.function.arguments;
                yield {
                  type: "tool_call_delta",
                  id: existing.id,
                  arguments: tc.function.arguments,
                };
              }
            }
          }
        }
      }

      // finish_reason === tool_calls → 发出 tool_call_end
      if (finishReason === "tool_calls") {
        for (const [, accum] of toolAccumMap) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(accum.arguments);
          } catch {
            input = { _raw: accum.arguments };
          }
          yield {
            type: "tool_call_end",
            id: accum.id,
            name: accum.name,
            input,
          };
        }
        toolAccumMap.clear();
      }
    }
  }
}
