/**
 * 本地 OpenAI 兼容假 API，用来在没有真实 key 的情况下跑通全链路。
 *
 *   node test/mock-server.mjs [端口]
 *
 * 行为约定（供测试断言）：
 *   - Authorization 必须是 Bearer <非空>，否则 401
 *   - model 含 "broken" → 500，用来测故障转移
 *   - model 含 "empty"  → 返回空 content，用来测空响应处理
 *   - 正常情况回显收到的图片数量、mime、system 前缀、prompt 前缀
 */

import http from "node:http";

export function createMockServer() {
  const received = [];
  const server = http.createServer((req, res) => {
    if (!req.url.endsWith("/chat/completions")) {
      res.writeHead(404, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "no such route" } }));
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const auth = req.headers.authorization || "";
      if (!/^Bearer\s+\S+/.test(auth)) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "invalid api key" } }));
      }
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "bad json" } }));
      }

      const userMsg = payload.messages.find((m) => m.role === "user");
      const systemMsg = payload.messages.find((m) => m.role === "system");
      const parts = Array.isArray(userMsg?.content) ? userMsg.content : [];
      const imageParts = parts.filter((p) => p.type === "image_url");
      const textPart = parts.find((p) => p.type === "text");

      received.push({
        model: payload.model,
        maxTokens: payload.max_tokens,
        imageCount: imageParts.length,
        mimes: imageParts.map((p) => /^data:([^;]+)/.exec(p.image_url.url)?.[1] || "url"),
        urls: imageParts.map((p) => p.image_url.url.slice(0, 60)),
        system: systemMsg?.content || null,
        prompt: textPart?.text || null,
        headers: req.headers,
      });

      if (String(payload.model).includes("broken")) {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "upstream exploded" } }));
      }
      if (String(payload.model).includes("empty")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ choices: [{ message: { content: "" } }] }));
      }

      const text = [
        `MOCK-OK model=${payload.model}`,
        `images=${imageParts.length}`,
        `mimes=${received.at(-1).mimes.join("|")}`,
        `system=${(systemMsg?.content || "").slice(0, 24)}`,
        `prompt=${(textPart?.text || "").slice(0, 40).replace(/\s+/g, " ")}`,
      ].join(" ");

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "mock-1",
          choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        }),
      );
    });
  });

  return {
    server,
    received,
    listen: (port = 0) =>
      new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}/v1`));
      }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// 直接运行时当独立服务用
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const mock = createMockServer();
  const url = await mock.listen(Number(process.argv[2]) || 8899);
  process.stdout.write(`mock vision API 已启动: ${url}\n`);
}
