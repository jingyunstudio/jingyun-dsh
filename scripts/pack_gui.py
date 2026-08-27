import os
import sys
import json
import subprocess
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

# Global state to keep track of build logs and status
build_status = "idle"  # idle, building, success, failed
build_logs = []
build_process = None

HTML_PAGE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jingyun.Studio - 桌面终端打包控制台</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card: #18181b;
      --border: #27272a;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --primary-glow: rgba(59, 130, 246, 0.15);
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --success: #10b981;
      --error: #ef4444;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      overflow-x: hidden;
    }

    .glow-bg {
      position: absolute;
      top: -10%;
      left: 30%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0) 70%);
      z-index: -1;
      pointer-events: none;
    }

    .container {
      width: 100%;
      max-width: 760px;
      background-color: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      padding: 40px;
      position: relative;
    }

    header {
      margin-bottom: 32px;
      text-align: center;
    }

    header h1 {
      font-size: 26px;
      font-weight: 600;
      background: linear-gradient(135deg, #ffffff 30%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    header p {
      color: var(--text-muted);
      font-size: 13.5px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
    }

    .form-group input {
      background-color: #09090b;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .helper-text {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .btn-submit {
      background-color: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .btn-submit:hover:not(:disabled) {
      background-color: var(--primary-hover);
      transform: translateY(-1px);
    }

    .btn-submit:disabled {
      background-color: var(--border);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .terminal-container {
      margin-top: 32px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background-color: #0c0c0e;
      overflow: hidden;
    }

    .terminal-header {
      background-color: #141416;
      border-bottom: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .terminal-dots {
      display: flex;
      gap: 6px;
    }

    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-red { background-color: var(--error); }
    .dot-yellow { background-color: #f59e0b; }
    .dot-green { background-color: var(--success); }

    .terminal-title {
      font-size: 12px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .terminal-body {
      height: 280px;
      padding: 16px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #34d399;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .terminal-line {
      white-space: pre-wrap;
      word-break: break-all;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background-color: var(--border);
    }

    .status-badge.idle { color: var(--text-muted); }
    .status-badge.building { color: var(--primary); animation: pulse 1.5s infinite; }
    .status-badge.success { color: var(--success); background-color: rgba(16, 185, 129, 0.1); }
    .status-badge.failed { color: var(--error); background-color: rgba(239, 68, 68, 0.1); }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .success-actions {
      margin-top: 20px;
      display: flex;
      gap: 16px;
    }

    .btn-action {
      flex: 1;
      padding: 12px;
      border: 1px solid var(--border);
      background-color: var(--card);
      color: var(--text);
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    .btn-action:hover {
      background-color: var(--border);
      border-color: var(--text-muted);
    }

    .loader-spin {
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      border-top: 2px solid #ffffff;
      width: 16px;
      height: 16px;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="glow-bg"></div>
  <div class="container">
    <header>
      <h1>Jingyun.Studio - 桌面客户端打包控制台</h1>
      <p>自动提取项目配置与 4 大环境包 (Node/Git/Python/Jingyun)，一键构建正规中文安装包 (.exe)</p>
    </header>

    <form id="packForm" onsubmit="startBuild(event)" class="grid">
      <div class="form-group">
        <label for="appName">应用名称 (App Name)</label>
        <input type="text" id="appName" name="appName" value="Jingyun.Studio" required>
        <div class="helper-text">客户端软件对外显示的名称。</div>
      </div>

      <div class="form-group">
        <label for="bundleId">应用包名 (Bundle ID)</label>
        <input type="text" id="bundleId" name="bundleId" value="com.jingyun.dstudio" required>
        <div class="helper-text">系统唯一包名，推荐采用 com.jingyun.dstudio 格式。</div>
      </div>

      <div class="form-group">
        <label for="appVersion">应用版本号 (Version)</label>
        <input type="text" id="appVersion" name="appVersion" value="0.1.0" required>
        <div class="helper-text">客户端软件发布版本号。</div>
      </div>

      <div class="form-group">
        <label for="customLogo">应用 Logo 图标 (Icon Path)</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="customLogo" name="customLogo" placeholder="可通过右侧按钮直接选择本地图片文件..." style="flex: 1;">
          <button type="button" onclick="document.getElementById('logoFileInput').click()" class="btn-action" style="padding: 10px 16px; width: auto; font-size: 13px; margin: 0; white-space: nowrap; height: 44px; display: flex; align-items: center; gap: 6px;">
            📁 选择本地文件
          </button>
          <input type="file" id="logoFileInput" accept=".png,.ico,.jpg,.jpeg" style="display: none;" onchange="handleFileSelect(event)">
        </div>
        <div class="helper-text">默认采用内置标准图标，点击右侧按钮直接弹出选择窗口。</div>
      </div>

      <div class="form-group">
        <label for="apiUrl">SaaS 服务地址 (API URL)</label>
        <input type="text" id="apiUrl" name="apiUrl" value="https://api.jingyun.studio" required>
        <div class="helper-text">后端 API 服务接口地址。</div>
      </div>

      <div class="form-group">
        <label for="tenantHost">租户 Key (Tenant Host)</label>
        <input type="text" id="tenantHost" name="tenantHost" placeholder="如: default" required>
        <div class="helper-text">分配的租户唯一 Key 标识。</div>
      </div>

      <div class="form-group">
        <label for="domain">客户端加载域名 (Domain URL)</label>
        <input type="text" id="domain" name="domain" placeholder="如: https://yourdomain.com" required>
        <div class="helper-text">桌面客户端窗口启动后默认加载的 Web 页面地址。</div>
      </div>

      <div class="full-width" style="margin-top: 8px;">
        <button type="submit" id="btnSubmit" class="btn-submit">
          <span>开始一键打包生成客户端 (.exe)</span>
        </button>
      </div>
    </form>

    <div class="terminal-container">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
        </div>
        <div class="terminal-title">BUILD TERMINAL LOG</div>
        <div id="statusBadge" class="status-badge idle">准备就绪</div>
      </div>
      <div id="terminal" class="terminal-body">
        <div class="terminal-line" style="color: #a1a1aa;">等待启动指令，构建过程将自动整合项目配置与三大工具环境包...</div>
      </div>
    </div>

    <div id="successActions" class="success-actions" style="display: none;">
      <button onclick="openExplorer()" class="btn-action">
        📂 打开生成包文件夹
      </button>
    </div>
  </div>

  <script>
    let logInterval = null;

    window.addEventListener('DOMContentLoaded', () => {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.appName) document.getElementById('appName').value = data.appName;
          if (data.bundleId) document.getElementById('bundleId').value = data.bundleId;
          if (data.appVersion) document.getElementById('appVersion').value = data.appVersion;
          if (data.customLogo !== undefined) document.getElementById('customLogo').value = data.customLogo;
          if (data.apiUrl) document.getElementById('apiUrl').value = data.apiUrl;
          if (data.tenantHost) document.getElementById('tenantHost').value = data.tenantHost;
          if (data.domain) document.getElementById('domain').value = data.domain;
        })
        .catch(err => console.error("加载本地 JSON 配置失败:", err));
    });

    function startBuild(event) {
      event.preventDefault();
      
      const appName = document.getElementById('appName').value;
      const bundleId = document.getElementById('bundleId').value;
      const appVersion = document.getElementById('appVersion').value;
      const customLogo = document.getElementById('customLogo').value;
      const apiUrl = document.getElementById('apiUrl').value;
      const tenantHost = document.getElementById('tenantHost').value;
      const domain = document.getElementById('domain').value;

      document.getElementById('btnSubmit').disabled = true;
      document.getElementById('btnSubmit').innerHTML = '<div class="loader-spin"></div> 正在进行构建打包...';
      
      const statusBadge = document.getElementById('statusBadge');
      statusBadge.className = 'status-badge building';
      statusBadge.innerText = '正在打包...';

      document.getElementById('terminal').innerHTML = '<div class="terminal-line" style="color: #60a5fa;">[System] 正在初始化应用名称、品牌 Logo 与参数配置...</div>';
      document.getElementById('successActions').style.display = 'none';

      fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `appName=${encodeURIComponent(appName)}&bundleId=${encodeURIComponent(bundleId)}&appVersion=${encodeURIComponent(appVersion)}&customLogo=${encodeURIComponent(customLogo)}&apiUrl=${encodeURIComponent(apiUrl)}&tenantHost=${encodeURIComponent(tenantHost)}&domain=${encodeURIComponent(domain)}`
      })
      .then(res => res.json())
      .then(data => {
        if (logInterval) clearInterval(logInterval);
        logInterval = setInterval(pollLogs, 1000);
      });
    }

    function pollLogs() {
      fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        const terminal = document.getElementById('terminal');
        
        let logHtml = '';
        data.logs.forEach(line => {
          let color = '#34d399';
          if (line.includes('Error') || line.includes('failed') || line.includes('error') || line.includes('Exception')) {
            color = '#f87171';
          } else if (line.includes('Info') || line.includes('Built') || line.includes('Finished') || line.includes('[Config]') || line.includes('[Icon]')) {
            color = '#60a5fa';
          }
          logHtml += `<div class="terminal-line" style="color: ${color};">${escapeHtml(line)}</div>`;
        });
        terminal.innerHTML = logHtml;
        terminal.scrollTop = terminal.scrollHeight;

        const statusBadge = document.getElementById('statusBadge');
        if (data.status === 'success') {
          clearInterval(logInterval);
          statusBadge.className = 'status-badge success';
          statusBadge.innerText = '打包成功';
          
          document.getElementById('btnSubmit').disabled = false;
          document.getElementById('btnSubmit').innerHTML = '<span>开始一键打包生成客户端 (.exe)</span>';
          document.getElementById('successActions').style.display = 'flex';
        } else if (data.status === 'failed') {
          clearInterval(logInterval);
          statusBadge.className = 'status-badge failed';
          statusBadge.innerText = '打包失败';
          
          document.getElementById('btnSubmit').disabled = false;
          document.getElementById('btnSubmit').innerHTML = '<span>重新启动打包</span>';
        }
      });
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('logo', file);

      fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.filePath) {
          document.getElementById('customLogo').value = data.filePath;
        }
      });
    }

    function openExplorer() {
      fetch('/api/open', { method: 'POST' });
    }
  </script>
</body>
</html>
"""

def get_current_config(base_dir):
    cfg_path = os.path.join(base_dir, "packages/jingyun-dsh/jingyun-config.json")
    tauri_conf_path = os.path.join(base_dir, "src-tauri/tauri.conf.json")
    
    config = {
        "appName": "Jingyun.Studio",
        "bundleId": "com.jingyun.dstudio",
        "appVersion": "0.1.0",
        "customLogo": "",
        "apiUrl": "",
        "tenantHost": "",
        "domain": ""
    }

    if os.path.exists(tauri_conf_path):
        try:
            with open(tauri_conf_path, 'r', encoding='utf-8') as f:
                t_cfg = json.load(f)
                if "productName" in t_cfg and t_cfg["productName"]: config["appName"] = t_cfg["productName"]
                if "identifier" in t_cfg and t_cfg["identifier"]: config["bundleId"] = t_cfg["identifier"]
                if "version" in t_cfg and t_cfg["version"]: config["appVersion"] = t_cfg["version"]
        except Exception:
            pass

    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, 'r', encoding='utf-8') as f:
                j_cfg = json.load(f)
                if j_cfg.get("api_url"): config["apiUrl"] = j_cfg["api_url"]
                if j_cfg.get("tenant_host"): config["tenantHost"] = j_cfg["tenant_host"]
                if j_cfg.get("domain"): config["domain"] = j_cfg["domain"]
                if j_cfg.get("custom_name"): config["appName"] = j_cfg["custom_name"]
                if j_cfg.get("custom_logo") is not None: config["customLogo"] = j_cfg["custom_logo"]
        except Exception:
            pass

    return config

class PackServer(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
        
    def do_GET(self):
        url_parsed = urlparse(self.path)
        if url_parsed.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif url_parsed.path == "/api/config":
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            cfg = get_current_config(base_dir)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
        elif url_parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "status": build_status,
                "logs": build_logs[-500:]
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global build_status, build_logs
        url_parsed = urlparse(self.path)
        if url_parsed.path == "/api/build":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            params = parse_qs(post_data)
            
            bundle_id = params.get('bundleId', ['com.jingyun.dstudio'])[0]
            app_version = params.get('appVersion', ['0.1.0'])[0]
            app_name = params.get('appName', ['Jingyun.Studio'])[0]
            custom_logo = params.get('customLogo', [''])[0]
            api_url = params.get('apiUrl', [''])[0]
            tenant_host = params.get('tenantHost', [''])[0]
            domain = params.get('domain', [''])[0]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"result": "queued"}).encode("utf-8"))

            threading.Thread(target=run_build_thread, args=(bundle_id, app_version, app_name, custom_logo, api_url, tenant_host, domain)).start()
        elif url_parsed.path == "/api/upload-logo":
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)

            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            upload_dir = os.path.join(base_dir, "src-tauri/icons")
            if not os.path.exists(upload_dir): os.makedirs(upload_dir)
            
            file_path = ""
            if b'filename="' in raw_body:
                header_part = raw_body.split(b'\r\n\r\n')[0]
                fname = "uploaded_logo.png"
                if b'filename="' in header_part:
                    try:
                        fname_str = header_part.split(b'filename="')[1].split(b'"')[0].decode('utf-8', errors='ignore')
                        ext = os.path.splitext(fname_str)[1]
                        if ext: fname = f"uploaded_logo{ext}"
                    except Exception: pass
                
                body_content = raw_body.split(b'\r\n\r\n', 1)[1]
                body_content = body_content.rsplit(b'\r\n--', 1)[0]
                
                target_save = os.path.join(upload_dir, fname)
                with open(target_save, 'wb') as f:
                    f.write(body_content)
                file_path = os.path.abspath(target_save)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"filePath": file_path}).encode("utf-8"))
        elif url_parsed.path == "/api/open":
            self.send_response(200)
            self.end_headers()
            try:
                dest_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src-tauri/target/release/bundle/nsis"))
                if os.path.exists(dest_folder):
                    subprocess.Popen(['explorer.exe', dest_folder])
            except Exception:
                pass
        else:
            self.send_response(404)
            self.end_headers()

def run_build_thread(bundle_id, app_version, app_name="Jingyun.Studio", custom_logo="", api_url="https://api.jingyun.studio", tenant_host="fbeed38e", domain="https://fbeed38e.jingyun.online"):
    global build_status, build_logs
    build_status = "building"
    build_logs = ["[System] 正在初始化客户端打包流程..."]

    logo_path = custom_logo.strip()
    api_url = api_url.strip()
    domain = domain.strip()

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    tauri_conf_path = os.path.join(base_dir, "src-tauri/tauri.conf.json")
    default_cap_path = os.path.join(base_dir, "src-tauri/capabilities/default.json")
    cfg_path = os.path.join(base_dir, "packages/jingyun-dsh/jingyun-config.json")
    vendor_dir = os.path.join(base_dir, "src-tauri/resources/vendor")

    # Update jingyun-config.json for jingyun-dsh plugin (Clean 5 core fields)
    cfg_data = {
        "api_url": api_url if api_url else "https://api.jingyun.studio",
        "tenant_host": tenant_host if tenant_host else "fbeed38e",
        "domain": domain if domain else "https://fbeed38e.jingyun.online",
        "custom_name": app_name if app_name else "Jingyun.Studio",
        "custom_logo": logo_path if logo_path else ""
    }
    
    try:
        with open(cfg_path, 'w', encoding='utf-8') as f:
            json.dump(cfg_data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

    try:
        # Step 0: Prepare vendor workspace and dependencies
        build_logs.append("[Vendor] 正在增量编译 workspace 插件并装配运行环境依赖...")
        if not os.path.exists(vendor_dir):
            os.makedirs(vendor_dir)

        pnpm_cmd = "pnpm.cmd build" if sys.platform == "win32" else "pnpm build"
        subprocess.run(pnpm_cmd, shell=True, cwd=base_dir, check=False)

        zip_cmd = "node scripts/prepare_vendor.js"
        subprocess.run(zip_cmd, shell=True, cwd=base_dir, check=False)
        build_logs.append("[Vendor] 已成功完成 @deepseek-ai 核心与 packages 插件的资源装配！")

        # Step 0.5: Generate dynamic Splashscreen
        splash_template_path = os.path.join(base_dir, "src-tauri/resources/splash/index.html")
        dist_temp_dir = os.path.join(base_dir, "dist_tauri_temp")
        if not os.path.exists(dist_temp_dir):
            os.makedirs(dist_temp_dir)
        
        splash_html = ""
        if os.path.exists(splash_template_path):
            with open(splash_template_path, 'r', encoding='utf-8') as f:
                splash_html = f.read()
            splash_html = splash_html.replace("Jingyun.Studio", app_name).replace("Jingyun Studio", app_name)
        
        if splash_html:
            with open(os.path.join(dist_temp_dir, "index.html"), 'w', encoding='utf-8') as f:
                f.write(splash_html)

        # Step 1: Update tauri.conf.json
        build_logs.append(f"[Config] 自动应用提取配置: 应用名={app_name}, 终端域名={domain}")
        if os.path.exists(tauri_conf_path):
            with open(tauri_conf_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            config["productName"] = app_name
            config["identifier"] = bundle_id
            config["version"] = app_version
            
            if "app" in config and "windows" in config["app"]:
                for win in config["app"]["windows"]:
                    win["label"] = "main"
                    win["title"] = app_name
                    win["url"] = "index.html"
                    win["decorations"] = False
                    win["maximized"] = True

            has_custom_logo = bool(logo_path and os.path.exists(logo_path))
            icon_folder = "icons_generated" if has_custom_logo else "icons"
            
            if "bundle" in config:
                config["bundle"]["icon"] = [
                    f"{icon_folder}/32x32.png",
                    f"{icon_folder}/128x128.png",
                    f"{icon_folder}/128x128@2x.png",
                    f"{icon_folder}/icon.icns",
                    f"{icon_folder}/icon.ico"
                ]
                if "windows" in config["bundle"] and "nsis" in config["bundle"]["windows"]:
                    config["bundle"]["windows"]["nsis"]["installerIcon"] = f"{icon_folder}/icon.ico"
                    config["bundle"]["windows"]["nsis"]["template"] = "installer.nsi"
                    config["bundle"]["windows"]["nsis"]["languages"] = ["SimpChinese"]
                    config["bundle"]["windows"]["nsis"].pop("headerImage", None)
                    config["bundle"]["windows"]["nsis"].pop("sidebarImage", None)
            
            with open(tauri_conf_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

        # Step 2: Update Cargo.toml version
        cargo_toml_path = os.path.join(base_dir, "src-tauri/Cargo.toml")
        if os.path.exists(cargo_toml_path):
            with open(cargo_toml_path, 'r', encoding='utf-8') as f:
                cargo_content = f.read()
            import re
            cargo_new_content = re.sub(r'(version\s*=\s*")[^"]+(")', f'\\g<1>{app_version}\\g<2>', cargo_content, count=1)
            with open(cargo_toml_path, 'w', encoding='utf-8') as f:
                f.write(cargo_new_content)

        # Step 3: Update capabilities/default.json
        if os.path.exists(default_cap_path):
            with open(default_cap_path, 'r', encoding='utf-8') as f:
                cap = json.load(f)
            
            parsed_domain = urlparse(domain)
            host = parsed_domain.netloc.split(":")[0] or "localhost"
            scheme = parsed_domain.scheme or "http"

            parsed_api = urlparse(api_url)
            api_host = parsed_api.netloc.split(":")[0] or "localhost"
            api_scheme = parsed_api.scheme or "http"
            
            allowed_urls = [
                f"{scheme}://{host}/*",
                f"{api_scheme}://{api_host}/*",
                "http://localhost:3080/*",
                "http://localhost:3003/*"
            ]
            if "remote" not in cap:
                cap["remote"] = {}
            cap["remote"]["urls"] = list(set(allowed_urls))
            
            with open(default_cap_path, 'w', encoding='utf-8') as f:
                json.dump(cap, f, indent=2, ensure_ascii=False)

        # Step 4: Generate Icons
        if has_custom_logo:
            gen_folder = os.path.join(base_dir, "src-tauri/icons_generated")
            if not os.path.exists(gen_folder):
                os.makedirs(gen_folder)
                
            cmd = f'npx tauri icon "{logo_path}" --output src-tauri/icons_generated'
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=base_dir, text=True, encoding='utf-8', errors='ignore')
            process.wait()
            build_logs.append("[Icon] 已成功根据自定义 Logo 生成多分辨率客户端图标。")

        # Step 5: Execute tauri:build
        build_logs.append("[Build] 正在使用 100% 简体中文 NSIS 模版编译全功能客户端...")
        
        custom_env = os.environ.copy()
        cargo_bin = os.path.expanduser("~/.cargo/bin")
        if os.path.exists(cargo_bin):
            custom_env["PATH"] = cargo_bin + os.pathsep + custom_env.get("PATH", "")

        cmd = "npx --package @tauri-apps/cli tauri build"
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=base_dir, env=custom_env, text=True, encoding='utf-8', errors='ignore')
        
        for line in process.stdout:
            build_logs.append(line.strip())
            
        process.wait()
        
        if process.returncode == 0:
            build_status = "success"
            build_logs.append("[System] 🎉🎉 中文一键客户端打包成功！输出安装包位于 src-tauri/target/release/bundle/nsis/")
        else:
            build_status = "failed"
            build_logs.append(f"[System] ❌ 打包失败，返回代码: {process.returncode}")

    except Exception as e:
        build_status = "failed"
        build_logs.append(f"[System] ❌ 打包发生异常: {str(e)}")

def main():
    port = 8089
    server_address = ('127.0.0.1', port)
    
    HTTPServer.allow_reuse_address = True
    try:
        httpd = HTTPServer(server_address, PackServer)
    except Exception:
        port = 8090
        server_address = ('127.0.0.1', port)
        httpd = HTTPServer(server_address, PackServer)

    print(f"\n=======================================================")
    print(f"  Jingyun.Studio - 专属打包控制台已启动！")
    print(f"  请在浏览器中打开：http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    
    def open_browser():
        time.sleep(0.2)
        try:
            webbrowser.open(f"http://127.0.0.1:{port}")
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n控制台服务已退出。")
        sys.exit(0)

if __name__ == '__main__':
    main()
