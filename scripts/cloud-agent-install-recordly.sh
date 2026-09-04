#!/usr/bin/env bash
# Idempotent install of Recordly (screen recorder) for Cursor Cloud agents.
# https://github.com/webadderallorg/Recordly
set -euo pipefail

RECORDLY_VERSION="${RECORDLY_VERSION:-v1.3.3}"
INSTALL_DIR="/opt/recordly"
BIN_LINK="/usr/local/bin/recordly"
APPIMAGE_NAME="Recordly-linux-x64.AppImage"
URL="https://github.com/webadderallorg/Recordly/releases/download/${RECORDLY_VERSION}/${APPIMAGE_NAME}"

if [[ -x "${INSTALL_DIR}/squashfs-root/recordly" ]] \
  && [[ -f "${INSTALL_DIR}/VERSION" ]] \
  && [[ "$(cat "${INSTALL_DIR}/VERSION")" == "${RECORDLY_VERSION}" ]] \
  && [[ -x "${BIN_LINK}" ]]; then
  echo "recordly already installed (${RECORDLY_VERSION})"
  exit 0
fi

echo "Installing Recordly ${RECORDLY_VERSION}..."
TMP="$(mktemp -d)/${APPIMAGE_NAME}"
curl -fsSL -o "${TMP}" -L "${URL}"
chmod +x "${TMP}"

EXTRACT_DIR="$(mktemp -d)"
(
  cd "${EXTRACT_DIR}"
  "${TMP}" --appimage-extract
)

sudo mkdir -p "${INSTALL_DIR}"
sudo rm -rf "${INSTALL_DIR}/squashfs-root"
sudo mv "${EXTRACT_DIR}/squashfs-root" "${INSTALL_DIR}/"
sudo cp "${TMP}" "${INSTALL_DIR}/${APPIMAGE_NAME}"
echo "${RECORDLY_VERSION}" | sudo tee "${INSTALL_DIR}/VERSION" >/dev/null

# AppRun's APPDIR discovery breaks when Electron flags are passed as $1.
# Invoke the binary directly with a fixed APPDIR.
sudo tee "${BIN_LINK}" >/dev/null <<'EOF'
#!/usr/bin/env bash
# Recordly launcher for Cursor Cloud agents (extracted AppImage).
set -euo pipefail
export DISPLAY="${DISPLAY:-:1}"
export APPDIR="/opt/recordly/squashfs-root"
export PATH="${APPDIR}:${APPDIR}/usr/sbin:${PATH:-}"
export LD_LIBRARY_PATH="${APPDIR}/usr/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
exec "${APPDIR}/recordly" \
  --no-sandbox \
  --disable-gpu-sandbox \
  --use-gl=angle \
  --use-angle=swiftshader \
  "$@"
EOF
sudo chmod +x "${BIN_LINK}"

rm -rf "$(dirname "${TMP}")" "${EXTRACT_DIR}"
echo "recordly installed → ${BIN_LINK} (${RECORDLY_VERSION})"
