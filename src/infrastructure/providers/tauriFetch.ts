import { fetch } from "@tauri-apps/plugin-http";

/**
 * Tauri 插件 http fetch，绕过浏览器 CORS 限制，
 * 通过 Rust 后端直接发起 HTTP 请求。
 *
 * 包装一层 debug 日志，方便排查请求问题。
 */
export const tauriFetch: typeof fetch = async (input, init) => {
  // 打印请求信息（仅开发调试用）
  if (init && init.headers) {
    const headers = init.headers as Record<string, string>;
    const authHeader =
      headers["Authorization"] || headers["authorization"] || "(none)";
    const masked =
      authHeader.length > 20 ? authHeader.slice(0, 15) + "..." : authHeader;
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    console.log(
      `[tauriFetch] %s %s\n  Authorization: %s`,
      init.method || "GET",
      urlStr,
      masked,
    );
  }

  try {
    const response = await fetch(input, init);
    console.log(
      `[tauriFetch] Response: %d %s`,
      response.status,
      response.statusText,
    );
    return response;
  } catch (err) {
    console.error("[tauriFetch] Error:", err);
    throw err;
  }
};
