#!/usr/bin/env python3
"""
DSH Agent Package Rule Checker - Validates if the agent package complies with DSH specifications.
"""

import sys
import json
import os
import re
import argparse
from pathlib import Path

# Fix Windows console UTF-8 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')




VALID_AGENT_TYPES = {'agent', 'team'}

class VerificationLogger:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def report_error(self, message):
        self.errors.append(message)

    def report_warning(self, message):
        self.warnings.append(message)

    @property
    def passed(self):
        return len(self.errors) == 0

    def output_summary(self):
        reports = []
        if self.errors:
            reports.append(f"❌ Found {len(self.errors)} error(s):")
            for err in self.errors:
                reports.append(f"   - {err}")
        if self.warnings:
            reports.append(f"⚠️  Found {len(self.warnings)} warning(s):")
            for warn in self.warnings:
                reports.append(f"   - {warn}")
        if self.passed:
            reports.append("✅ Congratulations! The agent package is fully compliant.")
        return "\n".join(reports)

def parse_yaml_simplified(lines):
    """
    A simplified YAML parser that handles one level of nested dicts/lists without external libraries.
    """
    result = {}
    current_key = None
    
    for line in lines:
        if line.strip().startswith('#'):
            continue
            
        stripped = line.lstrip()
        if not stripped:
            continue
        indent = len(line) - len(stripped)
        
        # List item support
        if stripped.startswith('-') and len(stripped) > 1:
            val = stripped[1:].strip().strip('"').strip("'")
            if current_key:
                if not isinstance(result.get(current_key), list):
                    result[current_key] = []
                result[current_key].append(val)
            continue
            
        if ':' in stripped:
            key, _, val = stripped.partition(':')
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            
            if indent > 0 and current_key:
                # Nested property (like en/zh under displayName)
                if not isinstance(result.get(current_key), dict):
                    result[current_key] = {}
                if val:
                    result[current_key][key] = val
            else:
                # Root property
                current_key = key
                if val:
                    result[key] = val
                else:
                    result[key] = {}
    return result

def parse_markdown_yaml_header(md_path):
    """
    Parse YAML frontmatter header line by line from markdown.
    Returns (dictionary_of_kv, error_message_or_none).
    """
    try:
        lines = md_path.read_text(encoding='utf-8').splitlines()
    except Exception as e:
        return None, f"Cannot open or read markdown file: {e}"

    if not lines or not lines[0].strip() == '---':
        return None, "Missing YAML header delimiter '---' at the first line."

    header_block = []
    found_closing = False
    for line in lines[1:]:
        if line.strip() == '---':
            found_closing = True
            break
        header_block.append(line)

    if not found_closing:
        return None, "YAML header was never closed with a matching '---'."

    kv_pairs = parse_yaml_simplified(header_block)

    # Extra structural checking: check raw content for forbidden tools key
    raw_header = "\n".join(header_block)
    if re.search(r'^\s*tools\s*:', raw_header, re.MULTILINE):
        return kv_pairs, "FORBIDDEN_TOOLS_DETECTED"

    return kv_pairs, None

def check_string_field(metadata, field, logger, location="plugin.json"):
    """Verify that a field exists and is a valid string."""
    if field not in metadata:
        logger.report_error(f"[{location}] Missing mandatory field '{field}'")
        return False

    value = metadata[field]
    if not isinstance(value, str):
        logger.report_error(f"[{location}] Field '{field}' must be a string.")
        return False

    if not value.strip():
        logger.report_error(f"[{location}] Field '{field}' cannot be empty.")
        return False

    return True

class AgentSpecificationValidator:
    def __init__(self, package_path):
        self.package_path = Path(package_path).resolve()
        self.logger = VerificationLogger()

    def run_all_checks(self):
        if not self.package_path.exists() or not self.package_path.is_dir():
            self.logger.report_error(f"Target directory does not exist or is not a directory: {self.package_path}")
            return self.logger



        meta_folders = ['.dsh-plugin']
        manifest_file = None
        used_meta_dir = None
        for folder in meta_folders:
            candidate = self.package_path / folder / 'plugin.json'
            if candidate.exists():
                manifest_file = candidate
                used_meta_dir = folder
                break

        if not manifest_file:
            self.logger.report_error("No plugin.json configuration file discovered under .dsh-plugin/.")
            return self.logger

        try:
            manifest_data = json.loads(manifest_file.read_text(encoding='utf-8'))
        except json.JSONDecodeError as err:
            self.logger.report_error(f"Failed to decode plugin.json: {err}")
            return self.logger

        self._check_file_layout(used_meta_dir)
        self._check_manifest_metadata(manifest_data)
        self._check_all_markdown_files(manifest_data)
        self._check_todo_placeholders(manifest_data)

        return self.logger

    def _check_todo_placeholders(self, manifest_data):
        """Ensure the package contains no lingering '[TODO' template parameters or 'TODO' blocks."""
        def contains_todo(text):
            return bool(re.search(r'(?i)\[?\s*TODO\b', str(text)))

        # 1. Check primary fields in manifest
        essential_fields = ['name', 'description']
        for field in essential_fields:
            val = str(manifest_data.get(field, ''))
            if contains_todo(val):
                self.logger.report_error(f"plugin.json: Field '{field}' still contains template placeholder 'TODO'.")

        # Check string fields
        string_fields = ['displayName', 'profession', 'displayDescription', 'defaultInitPrompt']
        for field in string_fields:
            val = str(manifest_data.get(field, ''))
            if contains_todo(val):
                self.logger.report_error(f"plugin.json: Field '{field}' still contains template placeholder 'TODO'.")

        # 2. Audit Markdown prompt files for TODO count
        agents_dir = self.package_path / 'agents'
        if agents_dir.exists() and agents_dir.is_dir():
            for md_file in agents_dir.glob('*.md'):
                if md_file.name == 'member-placeholder.md':
                    continue
                try:
                    content = md_file.read_text(encoding='utf-8')
                    # Count template occurrences case-insensitively
                    todo_matches = re.findall(r'(?i)TODO', content)
                    todo_count = len(todo_matches)
                    if todo_count > 2:
                        self.logger.report_error(
                            f"agents/{md_file.name}: Has {todo_count} unfinished 'TODO' block(s). Please fill in the details."
                        )
                except Exception as e:
                    self.logger.report_error(f"agents/{md_file.name}: Error checking TODOs: {e}")

    def _check_file_layout(self, meta_dir_name):
        """Audit filesystem placement and constraints."""
        forbidden_directories = ('hooks', 'commands')
        for bad_dir in forbidden_directories:
            if (self.package_path / bad_dir).exists():
                self.logger.report_error(f"Disallowed folder discovered in package root: '{bad_dir}/'. Please remove it.")
        
        if (self.package_path / '.lsp.json').exists():
            self.logger.report_error("Disallowed metadata file discovered: '.lsp.json'. Please remove it.")

        # Resource folders must sit at package root, not nested in metadata directory
        nested_check = ('agents', 'skills', 'bin', 'avatars')
        meta_root = self.package_path / meta_dir_name
        for nested in nested_check:
            if (meta_root / nested).exists():
                self.logger.report_error(f"Folder '{nested}/' is nested inside metadata folder '{meta_dir_name}/'. Place it in package root instead.")

        if not (self.package_path / 'agents').exists():
            self.logger.report_error("Mandatory folder 'agents/' not found in package root.")

        if not (self.package_path / 'README.md').exists():
            self.logger.report_warning("It is highly recommended to include a README.md file in the package root.")

    def _check_manifest_metadata(self, data):
        """Validate structure and parameters in plugin.json."""
        # 1. Base mandatory fields
        mandatory = ('name', 'version', 'description')
        for item in mandatory:
            if item not in data:
                self.logger.report_error(f"plugin.json: Missing mandatory field '{item}'.")

        package_name = data.get('name', '')
        if package_name:
            if len(package_name) < 2 or not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', package_name):
                self.logger.report_error(
                    f"plugin.json: Field 'name' ({package_name}) must be a valid kebab-case string, at least 2 characters long."
                )

        plugin_prop = data.get('plugin', '')
        if plugin_prop and plugin_prop != package_name:
            self.logger.report_error(f"plugin.json: Field 'plugin' ({plugin_prop}) must match 'name' ({package_name}).")

        # 2. Type configuration
        agent_type = data.get('agentType') or data.get('expertType', '')
        if agent_type not in VALID_AGENT_TYPES:
            self.logger.report_error(f"plugin.json: Field 'agentType' must be one of {VALID_AGENT_TYPES}, got '{agent_type}'.")
            return

        agent_name = data.get('agentName', '')
        if not agent_name:
            self.logger.report_error("plugin.json: Missing mandatory field 'agentName' linking to primary MD file.")
        else:
            primary_md_path = self.package_path / 'agents' / f'{agent_name}.md'
            if not primary_md_path.exists():
                self.logger.report_error(
                    f"plugin.json: Primary agentName '{agent_name}' has no matching Markdown file at: agents/{agent_name}.md"
                )
            if agent_name == 'team-lead':
                self.logger.report_error("plugin.json: Primary agentName cannot be named 'team-lead'. Add a unique prefix.")

        # 3. Presentation string fields
        check_string_field(data, 'displayName', self.logger)
        check_string_field(data, 'profession', self.logger)
        check_string_field(data, 'displayDescription', self.logger)
        check_string_field(data, 'defaultInitPrompt', self.logger)

        # Description length validation
        desc_val = data.get('displayDescription', '')
        if desc_val and not desc_val.startswith('[TODO'):
            length = len(desc_val)
            if length < 10 or length > 120:
                self.logger.report_warning(
                    f"plugin.json: Field 'displayDescription' has {length} characters. Recommended range: 10-120."
                )

        # Common metadata validation for both agent and team types
        # 1. Category check
        cat_id = data.get('categoryId', '')
        if not cat_id:
            self.logger.report_error("plugin.json: Missing categoryId representing its business sector.")
        elif cat_id.startswith('[TODO'):
            self.logger.report_warning("plugin.json: categoryId still contains template placeholder.")

        # 2. Fixed tags and quick prompts constraints (exactly 3 items each)
        tags = data.get('tags', [])
        if not isinstance(tags, list) or len(tags) != 3:
            self.logger.report_error(f"plugin.json: Field 'tags' must contain exactly 3 tags, got {len(tags) if isinstance(tags, list) else 'not a list'}.")

        quick_prompts = data.get('quickPrompts', [])
        if not isinstance(quick_prompts, list) or len(quick_prompts) != 3:
            self.logger.report_error(
                f"plugin.json: Field 'quickPrompts' must contain exactly 3 items, got {len(quick_prompts) if isinstance(quick_prompts, list) else 'not a list'}."
            )

        # 3. First quickPrompt matching defaultInitPrompt
        if isinstance(quick_prompts, list) and len(quick_prompts) > 0:
            first_qp = quick_prompts[0]
            default_prompt = data.get('defaultInitPrompt', '')
            if isinstance(first_qp, str):
                if first_qp != default_prompt and not default_prompt.startswith('[TODO'):
                    self.logger.report_warning("plugin.json: 'defaultInitPrompt' should match the first quickPrompts item.")

        # 4. Check avatar file existence
        avatar_rel = data.get('avatar', '')
        if avatar_rel:
            avatar_full = self.package_path / avatar_rel
            gitkeep_exist = (self.package_path / 'avatars' / '.gitkeep').exists()
            if not avatar_full.exists() and not gitkeep_exist:
                self.logger.report_warning(f"plugin.json: Avatar asset not found at path: {avatar_rel}")

        # Team requirements
        if agent_type == 'team':
            # team profession must match display name
            disp = data.get('displayName', '')
            prof = data.get('profession', '')
            if disp and prof and disp != prof:
                if not disp.startswith('[TODO') and not prof.startswith('[TODO'):
                    self.logger.report_error(
                        f"plugin.json: For team packages, 'profession' must match 'displayName'. "
                        f"Found: displayName='{disp}', profession='{prof}'."
                    )

        # Standalone agent requirements: Warn about extraneous team configurations
        elif agent_type == 'agent':
            if 'teamInfo' in data:
                self.logger.report_warning("plugin.json: Field 'teamInfo' is defined, but agentType is 'agent'.")
            if 'members' in data:
                self.logger.report_warning("plugin.json: Field 'members' is defined, but agentType is 'agent'.")

        # Check resource lists
        agents_list = data.get('agents', [])
        if isinstance(agents_list, list):
            for path_str in agents_list:
                if path_str.startswith('[TODO'):
                    continue
                rel_path = path_str[2:] if path_str.startswith('./') else path_str
                resolved_file = self.package_path / rel_path
                if not resolved_file.exists():
                    self.logger.report_error(f"plugin.json: Declared agent file not found: '{path_str}'")

        skills_list = data.get('skills', [])
        if isinstance(skills_list, list):
            for path_str in skills_list:
                if path_str.startswith('[TODO'):
                    continue
                rel_path = path_str[2:] if path_str.startswith('./') else path_str
                resolved_dir = self.package_path / rel_path
                if not (resolved_dir / 'SKILL.md').exists():
                    self.logger.report_error(f"plugin.json: Declared skill path has no SKILL.md: '{path_str}'")

        # 4. Team details verification
        if agent_type == 'team':
            team_info = data.get('teamInfo', {})
            if not team_info:
                self.logger.report_error("plugin.json: Team agent package must declare a 'teamInfo' block.")
            else:
                lead_agent = team_info.get('leadAgent', '')
                member_agents = team_info.get('memberAgents', [])
                if lead_agent and lead_agent in member_agents:
                    self.logger.report_error("plugin.json: teamInfo.memberAgents list should not include the team lead agent.")

            members_list = data.get('members', [])
            if not members_list:
                self.logger.report_error("plugin.json: Team agent package must declare a non-empty 'members' list.")
            else:
                has_lead = any(isinstance(m, dict) and m.get('role') == 'lead' for m in members_list)
                if not has_lead:
                    self.logger.report_error("plugin.json: The 'members' array must define at least one member with role='lead'.")

            # settings.json check
            settings_file = self.package_path / 'settings.json'
            if not settings_file.exists():
                self.logger.report_error("Team packages must contain a settings.json file in the package root.")
            else:
                try:
                    set_data = json.loads(settings_file.read_text(encoding='utf-8'))
                    set_agent = set_data.get('agent', '')
                    man_agent = data.get('agentName', '')
                    if set_agent and man_agent and set_agent != man_agent:
                        self.logger.report_error(f"settings.json: Field 'agent' ({set_agent}) does not match plugin.json 'agentName' ({man_agent}).")
                except json.JSONDecodeError as err:
                    self.logger.report_error(f"settings.json: Failed to parse JSON: {err}")

    def _check_all_markdown_files(self, manifest_data):
        """Validate frontmatter rules in MD files under agents/ directory."""
        agents_dir = self.package_path / 'agents'
        if not agents_dir.exists() or not agents_dir.is_dir():
            return

        for md_file in agents_dir.glob('*.md'):
            # Ignore placeholder template files
            if md_file.name == 'member-placeholder.md':
                continue

            header_data, err_flag = parse_markdown_yaml_header(md_file)
            if err_flag == "FORBIDDEN_TOOLS_DETECTED":
                self.logger.report_error(
                    f"agents/{md_file.name}: Violation! The frontmatter contains a forbidden 'tools' configuration."
                )
                continue
            elif err_flag:
                self.logger.report_error(f"agents/{md_file.name}: Frontmatter parsing error: {err_flag}")
                continue

            if not header_data:
                self.logger.report_error(f"agents/{md_file.name}: No frontmatter metadata could be extracted.")
                continue

            # Verify name consistency
            decl_name = header_data.get('name', '')
            file_stem = md_file.stem
            if decl_name and decl_name != file_stem:
                self.logger.report_error(
                    f"agents/{md_file.name}: Frontmatter property 'name' ({decl_name}) does not equal filename stem ({file_stem})."
                )

            if not header_data.get('description'):
                self.logger.report_warning(f"agents/{md_file.name}: Missing 'description' in frontmatter YAML header.")

def main():
    parser = argparse.ArgumentParser(description="Check DSH Agent package structure against specifications.")
    parser.add_argument("path", help="Path to the agent package directory")
    args = parser.parse_args()

    print(f"Auditing agent package: {args.path}...\n")
    validator = AgentSpecificationValidator(args.path)
    result = validator.run_all_checks()
    print(result.output_summary())

    sys.exit(0 if result.passed else 1)

if __name__ == '__main__':
    main()
