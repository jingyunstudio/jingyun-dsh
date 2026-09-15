#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
企业微信发送消息技能脚本
基于官方 @wecom/cli 命令行工具发送单聊或群聊消息。
"""

import argparse
import json
import shutil
import subprocess
import sys


def get_cli_cmd():
    return shutil.which("wecom-cli.cmd") if sys.platform == "win32" else shutil.which("wecom-cli")


def get_target_chat_id(cli_name: str, chat_id: str = None) -> str:
    if chat_id:
        return chat_id

    try:
        out = subprocess.check_output([cli_name, "message", "aibot", "sessions", "list"], text=True)
        data = json.loads(out)
        sessions = data.get("sessions", [])
        if sessions:
            return sessions[0].get("chat_id")
    except Exception:
        pass

    try:
        out = subprocess.check_output([cli_name, "identity", "whoami"], text=True)
        data = json.loads(out)
        uid = data.get("userId") or data.get("user_id")
        if uid:
            return uid
    except Exception:
        pass

    return None


def main():
    parser = argparse.ArgumentParser(description="通过 wecom-cli 发送消息到企业微信")
    parser.add_argument("--content", required=True, help="消息正文内容")
    parser.add_argument("--type", choices=["text", "markdown"], default="markdown", help="消息类型")
    parser.add_argument("--chat-id", help="指定目标会话 ID (可选，未指定则发送至最近会话或授权人)")

    args = parser.parse_args()

    cli_name = get_cli_cmd()
    if not cli_name:
        print("❌ 未检测到 wecom-cli 命令行工具。请先在客户端连接器面板中完成企业微信连接与授权。")
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
        payload["markdown"] = {"content": args.content}
    else:
        payload["text"] = {"content": args.content}

    try:
        cmd = [cli_name, "message", "aibot", "send", "--json", json.dumps(payload, ensure_ascii=False)]
        out = subprocess.check_output(cmd, text=True)
        print(f"✅ 企业微信消息发送成功：{out.strip()}")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"❌ 发送失败：{e.output or e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
