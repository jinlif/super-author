/**
 * 使用 Tauri HTTP 插件发送请求，绕过浏览器 CORS 限制。
 *
 * @tauri-apps/plugin-http 的 fetch 要求 headers 必须在 init 中
 * 以 Record<string, string> 格式传入。
 * SDK（OpenAI/Anthropic）可能将 Authorization header 放在 Request 对象中，
 * 这个 wrapper 负责将 Request 对象的 headers 提取到 init.headers。
 */
export const createTauriFetch =
  (apiKey: string) =>
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // 统一转为标准 RequestInit
    let headers: Record<string, string> = {};

    // 1. 从 init 提取 headers（SDK 可能以 Record 或 Headers 格式传入）
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headers[k] = v;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) {
          headers[k] = v;
        }
      } else {
        headers = { ...headers, ...(init.headers as Record<string, string>) };
      }
    }

    // 2. 从 Request 对象提取 headers（SDK 可能先构造了 Request）
    if (input instanceof Request) {
      input.headers.forEach((v, k) => {
        headers[k] = v;
      });
    }

    // 3. 兜底：确保 Authorization header 存在
    if (!headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // 4. 提取 URL
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // 5. 提取 method 和 body
    const method =
      init?.method ||
      (input instanceof Request ? input.method : undefined) ||
      "GET";
    const body =
      init?.body ||
      (input instanceof Request ? input.body : undefined) ||
      undefined;

    console.log(
      `[tauriFetch] %s %s\n  Authorization: %s`,
      method,
      url,
      headers["Authorization"]?.slice(0, 20) + "...",
    );

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body as BodyInit | undefined,
        signal: init?.signal,
      });
      console.log(`[tauriFetch] Response: %d`, response.status);
      return response;
    } catch (err) {
      console.error("[tauriFetch] Error:", err);
      throw err;
    }
  };
