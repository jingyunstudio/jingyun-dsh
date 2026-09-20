#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""企业微信消息发送脚本。通过 DSH 本地 HTTP 网关执行下发与自动自愈。"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

# 避免 Windows 终端输出 Emoji 时因 GBK 编码引发 UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="通过 DSH 连接器服务发送消息到企业微信")
    parser.add_argument("--content", help="消息正文内容")
    parser.add_argument("--file", help="从指定文件读取正文内容（推荐在 Windows 环境或发送多行文本时使用）")
    parser.add_argument("--type", choices=["text", "markdown"], default="markdown", help="消息类型")
    parser.add_argument("--chat-id", help="指定目标会话 ID (可选，未指定则由 DSH 自动解析为最近会话或绑定人)")

    args = parser.parse_args()

    content = args.content
    if args.file:
        if not os.path.isfile(args.file):
            print(f"❌ 找不到指定的消息文件：{args.file}", file=sys.stderr)
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

    if not content or not content.strip():
        print("❌ 必须通过 --content 或 --file 提供消息内容。", file=sys.stderr)
        sys.exit(1)

    port = os.environ.get("DSH_PORT", "3080")
    url = f"http://127.0.0.1:{port}/api/jingyun/connectors/wecom/send"

    payload = {
        "content": content,
    }
    if args.chat_id and args.chat_id.strip():
        payload["chatId"] = args.chat_id.strip()

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            res_data = json.loads(raw)
            if res_data.get("success"):
                target = res_data.get("data", {}).get("chatId") or "默认会话"
                print(f"✅ 企业微信消息发送成功（目标会话/用户: {target}）")
                sys.exit(0)
            else:
                err_msg = res_data.get("error") or "未知错误"
                print(f"❌ 企业微信消息发送失败：{err_msg}", file=sys.stderr)
                sys.exit(1)
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8", errors="replace")
            parsed = json.loads(err_body)
            err_body = parsed.get("error") or err_body
        except Exception:
            pass
        print(f"❌ 请求 DSH 服务失败 (HTTP {e.code}): {err_body or e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"❌ 无法连接到本地 DSH 服务 (端口 {port})：{e.reason}。请确保 DSH 正在运行。", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
