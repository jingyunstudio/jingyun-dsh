#!/usr/bin/env bash
set -e

APP_DIR="$1"
DMG_PATH="$2"
PRODUCT_NAME="$3"

echo "=========================================================="
echo "  macOS 构建签名修复与 DMG 重打包 (解决 Gatekeeper 损坏错误)"
echo "=========================================================="

if [ -z "$APP_DIR" ] || [ -z "$DMG_PATH" ] || [ -z "$PRODUCT_NAME" ]; then
  echo "❌ 错误: 参数缺失。"
  echo "用法: $0 <app_dir> <dmg_path> <product_name>"
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "❌ 错误: 目标 App 目录不存在: $APP_DIR"
  exit 1
fi

echo "目标 App: $APP_DIR"
echo "目标 DMG: $DMG_PATH"
echo "应用名称: $PRODUCT_NAME"

# 1. 补全 Bundle 结构 Contents/PkgInfo
echo "===> [1/5] 补全 Contents/PkgInfo"
if [ ! -f "$APP_DIR/Contents/PkgInfo" ]; then
  printf 'APPL????' > "$APP_DIR/Contents/PkgInfo"
  echo "已生成 Contents/PkgInfo (APPL????)"
else
  echo "Contents/PkgInfo 已存在"
fi

# 2. 清理隔离标记与扩展属性
echo "===> [2/5] 清除扩展属性与隔离标记 (xattr -cr)"
xattr -cr "$APP_DIR" || true

# 3. 分步独立签名 (避开 .cstemp 封存竞态缺陷，切勿对最外层使用 --deep)
echo "===> [3/5] 执行分步 Ad-hoc 独立签名..."

# 3.1 对 Resources/vendor 内部所有二进制可执行文件与动态库单独签名
if [ -d "$APP_DIR/Contents/Resources/vendor" ]; then
  echo "正在扫描并签名 Resources/vendor 内置运行时..."
  find "$APP_DIR/Contents/Resources/vendor" -type f \( -name "*.dylib" -o -name "*.so" -o -name "node" -o -name "python" -o -name "python3*" \) -exec codesign --force --sign - {} + 2>/dev/null || true
  find "$APP_DIR/Contents/Resources/vendor" -type f -perm +111 -exec codesign --force --sign - {} + 2>/dev/null || \
  find "$APP_DIR/Contents/Resources/vendor" -type f -perm -0111 -exec codesign --force --sign - {} + 2>/dev/null || true
fi

# 3.2 对 MacOS 目录下的主程序二进制签名
if [ -d "$APP_DIR/Contents/MacOS" ]; then
  for bin in "$APP_DIR/Contents/MacOS/"*; do
    if [ -f "$bin" ]; then
      echo "签名主程序二进制: $(basename "$bin")"
      codesign --force --sign - "$bin"
    fi
  done
fi

# 3.3 对最外层 Bundle 根目录签名（关键：绝不带 --deep，避开 .cstemp 竞态）
echo "签名最外层 App Bundle 目录..."
codesign --force --sign - "$APP_DIR"

# 4. 校验签名合法性
echo "===> [4/5] 校验签名合法性 (codesign --verify --strict)"
codesign --verify --strict "$APP_DIR"
echo "✅ Bundle 签名校验通过: valid on disk / satisfies its Designated Requirement"

# 5. 使用修复后的 .app 重新压制生成标准 DMG
echo "===> [5/5] 使用修复后的 Bundle 重新压制生成标准 DMG"
STAGING_DIR="$(mktemp -d -t dmg_staging_XXXXXX)"
cp -R "$APP_DIR" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

rm -f "$DMG_PATH"
mkdir -p "$(dirname "$DMG_PATH")"
hdiutil create -volname "$PRODUCT_NAME" -srcfolder "$STAGING_DIR" -ov -format UDZO "$DMG_PATH"
rm -rf "$STAGING_DIR"

echo "✅ DMG 重新压制成功: $DMG_PATH"
echo "=========================================================="
