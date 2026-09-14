#!/usr/bin/env python3
"""
DSH Agent Packaging Tool - Runs specification checks and aggregates eligible files into a zip archive.
"""

import sys
import os
import zipfile
import argparse
from pathlib import Path

# Fix Windows console UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


# Sibling import path setup
sys.path.insert(0, str(Path(__file__).parent.resolve()))
from check_agent_rules import AgentSpecificationValidator

def verify_and_compress_agent(agent_path, output_directory=None):
    """
    Validates a DSH agent package, and zips it up if successful.
    """
    agent_path = Path(agent_path).resolve()
    if not agent_path.exists() or not agent_path.is_dir():
        print(f"Error: Target path does not exist or is not a folder: {agent_path}")
        return None

    # Step 1. Pre-validation checks
    print("Initiating rule check before packaging...")
    validator = AgentSpecificationValidator(agent_path)
    rules_result = validator.run_all_checks()
    print(rules_result.output_summary())
    
    if not rules_result.passed:
        print("\nPackaging Aborted: Please correct the specification errors listed above.")
        return None

    print("\nVerification successful. Gathering files for packaging...")

    # Step 2. Determine target output path
    package_name = agent_path.name
    if output_directory:
        out_path = Path(output_directory).resolve()
        out_path.mkdir(parents=True, exist_ok=True)
    else:
        out_path = agent_path.parent

    archive_filename = out_path / f"{package_name}.zip"

    # Supported metadata hidden folder names (not excluded during compression)
    metadata_folders = {'.dsh-plugin'}

    try:
        compressed_count = 0
        with zipfile.ZipFile(archive_filename, 'w', zipfile.ZIP_DEFLATED) as zip_handle:
            # Walk directory recursively
            for path_item in sorted(agent_path.rglob('*')):
                if not path_item.is_file():
                    continue

                relative_ref = path_item.relative_to(agent_path)
                path_tokens = relative_ref.parts

                # Filter logic: Check if any parent folder/file is hidden
                skip = False
                for token in path_tokens:
                    # Ignore standard hidden files/folders (starting with dot) unless they are metadata folders
                    if token.startswith('.') and token not in metadata_folders:
                        skip = True
                        break
                    # Ignore common runtime junk & VCS folders
                    if token in ('__pycache__', 'node_modules', '.git', '.github', '.vscode', '.idea'):
                        skip = True
                        break
                
                if skip:
                    continue

                # Filter specific file basenames
                if path_item.name in ('.gitkeep', '.DS_Store', 'Thumbs.db'):
                    continue

                # Place in zip with a single parent root named after the package
                # Use .as_posix() to ensure path separators inside the zip are always forward slashes '/'
                archive_name = (Path(package_name) / relative_ref).as_posix()
                zip_handle.write(path_item, archive_name)
                print(f"  [+] Compressed: {archive_name}")
                compressed_count += 1

        print(f"\nCompressing complete! Logged {compressed_count} files.")
        print(f"Archive saved at: {archive_filename}")
        print(f"Archive File Size: {archive_filename.stat().st_size / 1024:.2f} KB")
        return archive_filename

    except Exception as e:
        print(f"Error during compression: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Pack a verified DSH agent directory into a ZIP archive.")
    parser.add_argument("agent_dir", help="Path to the agent directory to compress")
    parser.add_argument("output_dir", nargs="?", help="Optional directory destination to store the ZIP file")
    
    args = parser.parse_args()

    print(f"Processing archive packing for agent folder: {args.agent_dir}")
    target_zip = verify_and_compress_agent(args.agent_dir, args.output_dir)
    
    if target_zip:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
