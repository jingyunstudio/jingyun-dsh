#!/usr/bin/env python3
"""
DSH Agent Local Installer Tool - Verifies compliance and physically deploys/hot-syncs the agent to ~/.dsh/agents.
"""

import sys
import json
import os
import shutil
import argparse
from pathlib import Path

# Fix Windows console UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Sibling import path setup
sys.path.insert(0, str(Path(__file__).parent.resolve()))
from check_agent_rules import AgentSpecificationValidator

def retrieve_metadata_json_path(root_dir):
    """Scan folders for manifest file, preferring .dsh-plugin."""
    meta_subdirectories = ['.dsh-plugin']
    for folder in meta_subdirectories:
        candidate = Path(root_dir) / folder / 'plugin.json'
        if candidate.exists():
            return candidate, folder
    return None, None

def write_session_marker(agent_path, session_id):
    if session_id:
        try:
            (Path(agent_path) / '.created-by-session').write_text(session_id.strip(), encoding='utf-8')
            print(f"  [+] Logged session identifier: {session_id}")
        except Exception as e:
            print(f"Warning: could not write session marker: {e}")

def install_agent_locally(agent_path, session_id=None):
    """
    Zips the agent folder in memory, encodes as Base64, and posts to local DSH loopback HTTP API.
    The local daemon safely unpacks it to ~/.dsh/agents/ to bypass OS filesystem sandboxing constraints.
    """
    import io
    import base64
    import zipfile
    import urllib.request
    import urllib.error

    agent_path = Path(agent_path).resolve()
    manifest_file, used_meta_dir = retrieve_metadata_json_path(agent_path)
    
    if not manifest_file:
        print("Error: plugin.json manifest file not discovered in the package.")
        return False

    try:
        manifest_data = json.loads(manifest_file.read_text(encoding='utf-8'))
    except Exception as e:
        print(f"Error: Unable to parse plugin.json: {e}")
        return False

    slug = manifest_data.get('name', '').strip()
    if not slug:
        print("Error: Field 'name' (slug) is missing in plugin.json.")
        return False

    print("Attempting hot-sync installation via local DSH loopback API...")

    # 1. Zip folder entirely in memory (no disk writing)
    zip_buffer = io.BytesIO()
    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(agent_path):
                # Skip version control and build caches
                if '.git' in root or '__pycache__' in root or '.dsh-plugin' in root:
                    continue
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, agent_path)
                    zip_file.write(file_path, rel_path)
        
        # Inject manifest.json into ZIP root
        if manifest_file.exists():
            with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED) as zip_file:
                zip_file.write(manifest_file, 'manifest.json')
    except Exception as e:
        print(f"  [-] Failed to pack agent in memory: {e}")
        return False

    zip_buffer.seek(0)
    base64_data = base64.b64encode(zip_buffer.read()).decode('utf-8')

    # 2. Post to DSH local loopback port 3080
    url = "http://localhost:3080/api/jingyun/assets/import-zip"
    payload = {
        "filename": f"{slug}.zip",
        "dataBase64": base64_data,
        "targetType": "agent"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if res_data.get('success'):
                print("  [+] Sync via Loopback API complete!")
                if session_id:
                    write_session_marker(agent_path, session_id)
                return True
            else:
                print(f"  [-] API sync failed: {res_data.get('error') or res_data.get('message')}")
                return False
    except urllib.error.URLError as http_err:
        print(f"  [-] Loopback server unreachable: {http_err.reason if hasattr(http_err, 'reason') else http_err}")
        return False
    except Exception as e:
        print(f"  [-] Unexpected error during API request: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Verify prompt file rules and deploy/install the agent locally."
    )
    parser.add_argument("agent_dir", help="Path to the target agent development directory")
    parser.add_argument("--session-id", help="Optional session token for UI correlation tagging")
    args = parser.parse_args()

    agent_path = Path(args.agent_dir).resolve()
    print(f"Starting installation workflow for: {agent_path}")

    # Step 1. Run core rule checks (including TODO verification)
    validator = AgentSpecificationValidator(agent_path)
    rules_result = validator.run_all_checks()
    if not rules_result.passed:
        print("\n❌ Verification Failed. Structural specifications must be met before installation.")
        print(rules_result.output_summary())
        sys.exit(1)
    
    # Check for warnings
    if rules_result.warnings:
        print("\n⚠️  Warnings detected, but proceeding with installation:")
        for warn in rules_result.warnings:
            print(f"   - {warn}")

    # Step 2. Execute hot-sync installation
    success = install_agent_locally(agent_path, args.session_id)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
