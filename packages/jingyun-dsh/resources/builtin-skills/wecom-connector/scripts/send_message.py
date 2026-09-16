#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""企业微信消息发送脚本。通过 wecom-cli 直接与企业微信通信。"""

import argparse
import json
import os
import shutil
import subprocess
import sys

# 避免 Windows 终端 GBK 编码无法输出 Emoji 导致的 UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def get_cli_cmd():
    return shutil.which("wecom-cli.cmd") if sys.platform == "win32" else shutil.which("wecom-cli")


def get_target_chat_id(cli_name: str, chat_id: str = None) -> str:
    if chat_id:
        return chat_id

    exec_cmd = [cli_name]
    if sys.platform == "win32" and cli_name.lower().endswith(".cmd"):
        cli_dir = os.path.dirname(os.path.abspath(cli_name))
        wecom_js = os.path.join(cli_dir, "node_modules", "@wecom", "cli", "bin", "wecom.js")
        if os.path.isfile(wecom_js):
            exec_cmd = ["node", wecom_js]

    # 1. 尝试从最近会话列表匹配目标
    try:
        out = subprocess.check_output(
            exec_cmd + ["message", "aibot", "sessions", "list"],
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        data = json.loads(out)
        sessions = data.get("sessions", [])
        if sessions:
            return sessions[0].get("chat_id")
    except Exception:
        pass

    # 2. 尝试获取授权人自身 ID
    try:
        out = subprocess.check_output(
            exec_cmd + ["identity", "whoami"],
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        data = json.loads(out)
        uid = data.get("userId") or data.get("user_id")
        if uid:
            return uid
    except Exception:
        pass

    return None


def main():
    parser = argparse.ArgumentParser(description="通过 wecom-cli 发送消息到企业微信")
    parser.add_argument("--content", help="消息正文内容")
    parser.add_argument("--file", help="从指定文件读取正文内容（推荐在 Windows 环境或发送复杂多行文本时使用）")
    parser.add_argument("--type", choices=["text", "markdown"], default="markdown", help="消息类型")
    parser.add_argument("--chat-id", help="指定目标会话 ID (可选，未指定则发送至最近会话或授权人)")

    args = parser.parse_args()

    content = args.content
    if args.file:
        if not os.path.isfile(args.file):
            print(f"❌ 找不到指定的消息文件：{args.file}")
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

    if not content:
        print("❌ 必须通过 --content 或 --file 提供消息内容。")
        sys.exit(1)

    cli_name = get_cli_cmd()
    if not cli_name:
        print("❌ 未检测到 wecom-cli 命令行工具。")
        print("请先在客户端「连接器」面板中点击「一键安装 CLI」完成安装，并完成扫码授权。")
        sys.exit(1)

    target_chat = get_target_chat_id(cli_name, args.chat_id)
    if not target_chat:
        print("❌ 未找到可发送的最近会话或授权人 ID。")
        print("请确认已完成企微扫码授权，或在企业微信中给机器人发送任意一条消息以建立会话。")
        sys.exit(1)

    payload = {
        "chat_id": target_chat,
        "msg_type": args.type,
    }
    if args.type == "markdown":
        payload["markdown"] = {"content": content}
    else:
        payload["text"] = {"content": content}

    exec_cmd = [cli_name]
    if sys.platform == "win32" and cli_name.lower().endswith(".cmd"):
        cli_dir = os.path.dirname(os.path.abspath(cli_name))
        wecom_js = os.path.join(cli_dir, "node_modules", "@wecom", "cli", "bin", "wecom.js")
        if os.path.isfile(wecom_js):
            exec_cmd = ["node", wecom_js]

    try:
        cmd = exec_cmd + ["message", "aibot", "send", "--json", json.dumps(payload, ensure_ascii=False)]
        out = subprocess.check_output(cmd, text=True, encoding="utf-8", errors="replace")
        print(f"✅ 企业微信消息发送成功：{out.strip()}")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"❌ 发送失败：{e.output or e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
