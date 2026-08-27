!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "正在配置本地便携运行环境 (Node/Python/Jingyun)..."
  nsExec::Exec 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$v=\"$LOCALAPPDATA\${BUNDLEID}\vendor\";$i=\"$INSTDIR\resources\vendor\";Add-Type -AssemblyName System.IO.Compression.FileSystem;function X($s,$d){if(Test-Path $d){rm $d -Recurse -Force};mkdir $d|Out-Null;[System.IO.Compression.ZipFile]::ExtractToDirectory($s,$d)};X \"$i\node.zip\" \"$v\node\";X \"$i\python.zip\" \"$v\python\";X \"$i\vendor_deps.zip\" \"$v\jingyun\";cp \"$i\workspace\*\" \"$v\jingyun\" -Recurse -Force;mkdir \"$v\jingyun\node_modules\@jingyun-ai\" -Force|Out-Null;cp \"$v\jingyun\packages\jingyun-dsh\" \"$v\jingyun\node_modules\@jingyun-ai\jingyun-dsh\" -Recurse -Force"'
!macroend

