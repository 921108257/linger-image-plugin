import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMockServer } from "./mock-server.mjs";
import { encodeImage, analyze } from "../lib/vision.mjs";
import { loadConfig, resolveChannelOrder, validateChannel } from "../lib/config.mjs";
import { getPromptForSkill } from "../lib/prompts.mjs";
import { parseArgs, run } from "../lib/cli.mjs";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AH9AwHkAAAAAElFTkSuQmCC",
  "base64",
);
const JPEG_HEAD = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);

let mock, baseUrl, tmpDir, pngPath, jpgMislabeled, configPath, savedEnvConfig;

before(async () => {
  mock = createMockServer();
  baseUrl = await mock.listen(0);
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "linger-img-"));
  pngPath = path.join(tmpDir, "shot.png");
  fs.writeFileSync(pngPath, PNG_1x1);
  // 内容是 JPEG，扩展名却是 .png —— 截图工具的常见坑
  jpgMislabeled = path.join(tmpDir, "mislabeled.png");
  fs.writeFileSync(jpgMislabeled, JPEG_HEAD);

  configPath = path.join(tmpDir, "cfg.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      defaultChannel: "primary",
      failover: true,
      channels: [
        { name: "primary", baseUrl, model: "mock-vl-max", apiKey: "sk-test-primary" },
        { name: "backup", baseUrl, model: "mock-vl-plus", apiKey: "env:MY_BACKUP_KEY" },
      ],
    }),
  );

  // run() 走 process.env，指向测试配置，避免读到开发机上的真实配置
  savedEnvConfig = process.env.LINGER_IMAGE_CONFIG;
  process.env.LINGER_IMAGE_CONFIG = configPath;
});

after(async () => {
  await mock.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (savedEnvConfig === undefined) delete process.env.LINGER_IMAGE_CONFIG;
  else process.env.LINGER_IMAGE_CONFIG = savedEnvConfig;
});

test("encodeImage: 本地文件转 data URL，按文件头识别 mime", () => {
  const img = encodeImage(pngPath);
  assert.equal(img.kind, "file");
  assert.equal(img.mime, "image/png");
  assert.match(img.url, /^data:image\/png;base64,/);
});

test("encodeImage: 文件头优先于错误的扩展名", () => {
  const img = encodeImage(jpgMislabeled);
  assert.equal(img.mime, "image/jpeg", "内容是 JPEG，应忽略 .png 扩展名");
});

test("encodeImage: http URL 直接透传，不做 base64", () => {
  const img = encodeImage("https://example.com/a.png");
  assert.equal(img.kind, "url");
  assert.equal(img.url, "https://example.com/a.png");
});

test("encodeImage: 缺失文件报出绝对路径", () => {
  assert.throws(() => encodeImage(path.join(tmpDir, "nope.png")), /图片不存在/);
});

test("encodeImage: 超过体积上限时明确报错", () => {
  assert.throws(() => encodeImage(pngPath, { maxImageBytes: 10 }), /超过上限/);
});

test("encodeImage: 剥掉引号和 file:// 前缀", () => {
  assert.equal(encodeImage(`"${pngPath}"`).mime, "image/png");
  const fileUrl = `file:///${pngPath.replace(/\\/g, "/")}`;
  assert.equal(encodeImage(fileUrl).mime, "image/png");
});

test("loadConfig: 读取显式配置文件并解析 env: 引用", () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath, MY_BACKUP_KEY: "sk-from-env" } });
  assert.equal(cfg.channels.length, 2);
  assert.equal(cfg.defaultChannel, "primary");
  assert.equal(cfg.channels[1].apiKey, "sk-from-env");
});

test("loadConfig: env: 引用未设置时 apiKey 为空，validateChannel 能说清", () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath } });
  const backup = cfg.channels.find((c) => c.name === "backup");
  assert.deepEqual(validateChannel(backup), ["apiKey（env:MY_BACKUP_KEY 未设置）"]);
});

test("loadConfig: 纯环境变量也能合成渠道", () => {
  const cfg = loadConfig({
    cwd: tmpDir,
    env: { LINGER_VISION_API_KEY: "sk-env", LINGER_VISION_BASE_URL: baseUrl, LINGER_VISION_MODEL: "m1" },
  });
  assert.equal(cfg.channels.length, 1);
  assert.equal(cfg.channels[0].name, "env");
  assert.equal(cfg.channels[0].model, "m1");
});

test("resolveChannelOrder: --channel 指定的排第一，其余作为转移候选", () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath, MY_BACKUP_KEY: "k" } });
  const order = resolveChannelOrder(cfg, "backup");
  assert.deepEqual(order.map((c) => c.name), ["backup", "primary"]);
});

test("resolveChannelOrder: 未知渠道名报错并列出可用渠道", () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath } });
  assert.throws(() => resolveChannelOrder(cfg, "ghost"), /不存在.*primary, backup/s);
});

test("resolveChannelOrder: failover 关闭时只返回首选渠道", () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath, LINGER_VISION_FAILOVER: "0" } });
  assert.equal(resolveChannelOrder(cfg).length, 1);
});

test("analyze: 端到端命中 mock，并带回渠道/模型/用量", async () => {
  const cfg = loadConfig({ env: { LINGER_IMAGE_CONFIG: configPath } });
  const r = await analyze({
    channels: [cfg.channels[0]],
    images: [encodeImage(pngPath)],
    prompt: "描述这张图",
    system: "你是分析专家",
  });
  assert.match(r.text, /MOCK-OK model=mock-vl-max/);
  assert.match(r.text, /images=1/);
  assert.match(r.text, /mimes=image\/png/);
  assert.equal(r.channel, "primary");
  assert.equal(r.usage.total_tokens, 120);
});

test("analyze: 首个渠道 500 时自动转移到下一个", async () => {
  const broken = { name: "bad", baseUrl, model: "broken-vl", apiKey: "k", maxTokens: 100, timeoutMs: 5000, headers: {} };
  const good = { name: "good", baseUrl, model: "mock-ok", apiKey: "k", maxTokens: 100, timeoutMs: 5000, headers: {} };
  const r = await analyze({ channels: [broken, good], images: [encodeImage(pngPath)], prompt: "hi" });
  assert.equal(r.channel, "good");
  assert.equal(r.attempts.length, 1);
  assert.match(r.attempts[0].error, /HTTP 500/);
});

test("analyze: 所有渠道失败时汇总每个错误", async () => {
  const bad1 = { name: "b1", baseUrl, model: "broken-1", apiKey: "k", maxTokens: 100, timeoutMs: 5000, headers: {} };
  const bad2 = { name: "b2", baseUrl, model: "broken-2", apiKey: "", maxTokens: 100, timeoutMs: 5000, headers: {} };
  await assert.rejects(
    () => analyze({ channels: [bad1, bad2], images: [encodeImage(pngPath)], prompt: "hi" }),
    (e) => /所有渠道都失败/.test(e.message) && /b1/.test(e.message) && /b2/.test(e.message),
  );
});

test("analyze: 空 key 走不到网络，直接报配置不完整", async () => {
  const noKey = { name: "nk", baseUrl, model: "mock", apiKey: "", maxTokens: 100, timeoutMs: 5000, headers: {} };
  await assert.rejects(
    () => analyze({ channels: [noKey], images: [encodeImage(pngPath)], prompt: "hi" }),
    /配置不完整/,
  );
});

test("analyze: 模型返回空内容时给出 vision 型号提示", async () => {
  const ch = { name: "e", baseUrl, model: "empty-model", apiKey: "k", maxTokens: 100, timeoutMs: 5000, headers: {} };
  await assert.rejects(
    () => analyze({ channels: [ch], images: [encodeImage(pngPath)], prompt: "hi" }),
    /返回空内容.*vision 型号/s,
  );
});

test("getPromptForSkill: 三个技能各有不同 system 和默认提示词", () => {
  const a = getPromptForSkill("image-vision");
  const b = getPromptForSkill("ui-ux-vision");
  const c = getPromptForSkill("ui-material-design");
  assert.notEqual(a.system, b.system);
  assert.notEqual(b.system, c.system);
  assert.match(b.prompt, /设计 token|组件识别/);
  assert.match(c.prompt, /Midjourney|--ar|提示词/);
});

test("getPromptForSkill: 用户追问覆盖默认提示词", () => {
  const { prompt } = getPromptForSkill("ui-ux-vision", "只看导航栏");
  assert.equal(prompt, "只看导航栏");
});

test("getPromptForSkill: 未知技能列出可用技能", () => {
  assert.throws(() => getPromptForSkill("nope"), /未知技能.*image-vision/s);
});

test("parseArgs: 技能名 + 图片 + 问题分离正确", () => {
  const a = parseArgs(["ui-ux-vision", "./a.png", "看看", "导航"]);
  assert.equal(a.command, "ui-ux-vision");
  assert.deepEqual(a.images, ["./a.png"]);
  assert.equal(a.question, "看看 导航");
});

test("parseArgs: 省略技能名时默认 image-vision", () => {
  assert.equal(parseArgs(["./a.png"]).command, "image-vision");
});

test("parseArgs: 多张图片与选项混排", () => {
  const a = parseArgs(["image-vision", "a.png", "b.jpg", "--channel", "openai", "--json"]);
  assert.deepEqual(a.images, ["a.png", "b.jpg"]);
  assert.equal(a.channel, "openai");
  assert.equal(a.json, true);
});

test("CLI run: 三个技能都能端到端出结果，且 system 提示词各不相同", async () => {
  const seenSystems = new Set();
  for (const skill of ["image-vision", "ui-ux-vision", "ui-material-design"]) {
    let stdout = "";
    const before = mock.received.length;
    const code = await run([skill, pngPath, "--json", "--quiet"], {
      out: (s) => (stdout += s),
      err: () => {},
    });
    assert.equal(code, 0, `${skill} 应该退出码 0`);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.skill, skill);
    assert.equal(parsed.channel, "primary");
    assert.match(parsed.text, /MOCK-OK/);
    seenSystems.add(mock.received[before].system);
  }
  assert.equal(seenSystems.size, 3, "三个技能应发出三种不同的 system 提示词");
});

test("CLI run: channels --json 报告每个渠道缺什么", async () => {
  let stdout = "";
  await run(["channels", "--json"], { out: (s) => (stdout += s), err: () => {} });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.defaultChannel, "primary");
  const backup = parsed.channels.find((c) => c.name === "backup");
  assert.equal(backup.hasKey, false);
  assert.match(backup.missing[0], /apiKey/);
});

test("CLI run: 没给图片时退出码 2", async () => {
  const code = await run(["image-vision"], { out: () => {}, err: () => {} });
  assert.equal(code, 2);
});

test("CLI run: 渠道可为单个技能覆盖模型", async () => {
  const overridePath = path.join(tmpDir, "override.json");
  fs.writeFileSync(
    overridePath,
    JSON.stringify({
      defaultChannel: "p",
      channels: [
        {
          name: "p",
          baseUrl,
          model: "base-model",
          apiKey: "k",
          skills: { "ui-material-design": { model: "design-special-model", maxTokens: 4096 } },
        },
      ],
    }),
  );
  const saved = process.env.LINGER_IMAGE_CONFIG;
  process.env.LINGER_IMAGE_CONFIG = overridePath;
  try {
    const before = mock.received.length;
    await run(["ui-material-design", pngPath, "--quiet"], { out: () => {}, err: () => {} });
    assert.equal(mock.received[before].model, "design-special-model");
    assert.equal(mock.received[before].maxTokens, 4096);
  } finally {
    if (saved === undefined) delete process.env.LINGER_IMAGE_CONFIG;
    else process.env.LINGER_IMAGE_CONFIG = saved;
  }
});
