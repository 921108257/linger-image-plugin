#!/usr/bin/env node
/**
 * linger-image-plugin 测试驱动器。
 *
 *   node driver.mjs --mock         # 启动 mock 服务，跑一遍三个技能的调用
 *   node driver.mjs --config       # 检查配置文件是否存在并格式正确
 *   node driver.mjs --channels     # 列出渠道
 *
 * 供 /run 技能调用，也可独立跑来验证安装。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMockServer } from "../../../test/mock-server.mjs";
import { run as cliRun } from "../../../lib/cli.mjs";
import { loadConfig } from "../../../lib/config.mjs";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_PNG = path.join(PKG_ROOT, "test", "fixtures", "test.png");

// 确保测试图存在
if (!fs.existsSync(path.dirname(TEST_PNG))) {
  fs.mkdirSync(path.dirname(TEST_PNG), { recursive: true });
}
if (!fs.existsSync(TEST_PNG)) {
  // 1x1 红点 PNG
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(TEST_PNG, png1x1);
}

function log(s) {
  process.stdout.write(`${s}\n`);
}

async function runMock() {
  log("启动 mock vision API...");
  const mock = createMockServer();
  const baseUrl = await mock.listen(0);
  log(`  mock API: ${baseUrl}`);

  const tmpConfig = path.join(PKG_ROOT, ".driver-mock-config.json");
  fs.writeFileSync(
    tmpConfig,
    JSON.stringify({
      defaultChannel: "mock-primary",
      failover: true,
      channels: [
        { name: "mock-primary", baseUrl, model: "mock-vl-max", apiKey: "mock-key" },
        { name: "mock-backup", baseUrl, model: "mock-vl-plus", apiKey: "mock-key" },
      ],
    }),
  );

  const saved = process.env.LINGER_IMAGE_CONFIG;
  process.env.LINGER_IMAGE_CONFIG = tmpConfig;

  log("\n测试三个技能:\n");
  const skills = ["image-vision", "ui-ux-vision", "ui-material-design"];
  let ok = 0;

  for (const skill of skills) {
    const out = [];
    const code = await cliRun([skill, TEST_PNG, "--quiet"], {
      out: (s) => out.push(s),
      err: () => {},
    });
    if (code === 0 && out.join("").includes("MOCK-OK")) {
      log(`  ✓ ${skill}`);
      ok++;
    } else {
      log(`  ✗ ${skill} (退出码 ${code})`);
    }
  }

  log("\n测试故障转移:\n");
  const brokenConfig = path.join(PKG_ROOT, ".driver-broken-config.json");
  fs.writeFileSync(
    brokenConfig,
    JSON.stringify({
      defaultChannel: "broken",
      failover: true,
      channels: [
        { name: "broken", baseUrl, model: "broken-model", apiKey: "k" },
        { name: "backup", baseUrl, model: "mock-ok", apiKey: "k" },
      ],
    }),
  );
  process.env.LINGER_IMAGE_CONFIG = brokenConfig;
  const out2 = [];
  const code2 = await cliRun(["image-vision", TEST_PNG, "--quiet"], {
    out: (s) => out2.push(s),
    err: () => {},
  });
  const failoverOk = code2 === 0 && out2.join("").includes("MOCK-OK model=mock-ok");
  log(failoverOk ? "  ✓ 故障转移成功" : "  ✗ 故障转移失败");

  if (saved === undefined) delete process.env.LINGER_IMAGE_CONFIG;
  else process.env.LINGER_IMAGE_CONFIG = saved;
  fs.unlinkSync(tmpConfig);
  fs.unlinkSync(brokenConfig);
  await mock.close();

  log(`\n总计: ${ok + (failoverOk ? 1 : 0)}/4 通过\n`);
  return ok === 3 && failoverOk ? 0 : 1;
}

async function checkConfig() {
  log("检查配置:\n");
  try {
    const cfg = loadConfig();
    log(`  配置来源: ${cfg.sources.length ? cfg.sources.join(", ") : "环境变量"}`);
    log(`  渠道数: ${cfg.channels.length}`);
    log(`  默认渠道: ${cfg.defaultChannel || "(无)"}`);
    log(`  故障转移: ${cfg.failover ? "开" : "关"}\n`);
    if (!cfg.channels.length) {
      log("  ⚠ 没有配置任何渠道。运行: linger-image config --channel qwen\n");
      return 1;
    }
    return 0;
  } catch (err) {
    log(`  ✗ 配置错误: ${err.message}\n`);
    return 1;
  }
}

async function listChannels() {
  await cliRun(["channels"], { out: log, err: log });
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--mock")) return await runMock();
  if (argv.includes("--config")) return await checkConfig();
  if (argv.includes("--channels")) return await listChannels();

  log("linger-image-plugin 测试驱动器\n");
  log("用法:");
  log("  node driver.mjs --mock         # mock 服务 + 全技能测试");
  log("  node driver.mjs --config       # 检查配置");
  log("  node driver.mjs --channels     # 列出渠道\n");
  return 0;
}

process.exit(await main());
