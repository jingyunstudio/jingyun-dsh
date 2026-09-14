#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书连接器执行脚本
基于官方 @larksuite/cli 发送即时消息。
"""

import argparse
import json
import shutil
import subprocess
import sys


def get_cli_cmd():
    return shutil.which("lark-cli") or shutil.which("lark-cli.cmd")


def main():
    parser = argparse.ArgumentParser(description="通过 lark-cli 发送飞书消息")
    parser.add_argument("--content", required=True, help="消息正文内容")
    parser.add_argument("--receive-id", help="接收对象 ID (chat_id / open_id)")
    parser.add_argument("--receive-id-type", default="chat_id", choices=["chat_id", "open_id", "user_id"], help="接收对象类型")

    args = parser.parse_args()

    cli_name = get_cli_cmd()
    if not cli_name:
        print("❌ 未检测到 lark-cli 命令行工具。")
        print("请在客户端「连接器」中心点击「一键安装 CLI」或确认已全局安装 @larksuite/cli。")
        sys.exit(1)

    target_id = args.receive_id
    if not target_id:
        try:
            out = subprocess.check_output([cli_name, "im", "chat", "list", "--json"], text=True)
            data = json.loads(out)
            chats = data.get("data", {}).get("items") or data.get("items", [])
            if chats:
                target_id = chats[0].get("chat_id")
        except Exception:
            pass

    if not target_id:
        print("❌ 未指定 receive_id 且未能自动获取到可用的飞书群聊。")
        sys.exit(1)

    content_obj = json.dumps({"text": args.content}, ensure_ascii=False)
    cmd = [
        cli_name, "im", "message", "send",
        "--receive-id", target_id,
        "--receive-id-type", args.receive_id_type,
        "--msg-type", "text",
        "--content", content_obj,
        "--json"
    ]

    try:
        out = subprocess.check_output(cmd, text=True)
        print(f"✅ 飞书消息发送成功：{out.strip()}")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"❌ 发送失败：{e.output or e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
