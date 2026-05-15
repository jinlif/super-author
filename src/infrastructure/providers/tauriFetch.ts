import { fetch } from "@tauri-apps/plugin-http";

/**
 * Tauri 插件 http fetch，绕过浏览器 CORS 限制，
 * 通过 Rust 后端直接发起 HTTP 请求。
 */
export { fetch as tauriFetch };
