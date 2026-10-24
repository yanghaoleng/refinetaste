#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
slug="${1:?selfcare, philosophy or mediaclass}"
case "$slug" in selfcare|philosophy|mediaclass) ;; *) exit 2;; esac
version="$(TZ=Asia/Shanghai date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
work="$(mktemp -d -t academy-release)"
trap 'rm -rf "$work"' EXIT
git archive HEAD | tar -xf - -C "$work"
python3 "$work/scripts/build-academies.py" --site "$slug" --output "$work/output"
COPYFILE_DISABLE=1 tar --no-xattrs --exclude='__pycache__' --exclude='*.pyc' -czf "$work/release.tar.gz" -C "$work/output/$slug" dist server site.json ops
scp "$work/release.tar.gz" "mikeywa-rive-old:/tmp/$slug-$version.tar.gz"
ssh mikeywa-rive-old sudo sh -s -- "$slug" "$version" <<'REMOTE'
set -eu
slug="$1";version="$2"
case "$slug" in selfcare) port=8845;; philosophy) port=8843;; mediaclass) port=8844;; *) exit 2;; esac
release="/opt/$slug/releases/$version"
previous="$(readlink -f "/opt/$slug/current" || true)"
install -d -m755 "$release"
tar -xzf "/tmp/$slug-$version.tar.gz" -C "$release"
chmod -R a+rX "$release"
python3 -m py_compile "$release/server/app.py" "$release/server/reviewer.py"
python3 "$release/ops/init-production.py"
cat > "/etc/systemd/system/$slug.service" <<UNIT
[Unit]
Description=$slug learning site
After=network.target
[Service]
Type=simple
DynamicUser=yes
StateDirectory=$slug
WorkingDirectory=/opt/$slug/current
EnvironmentFile=/etc/$slug.env
ExecStart=/usr/bin/python3 /opt/$slug/current/server/app.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
UMask=0077
[Install]
WantedBy=multi-user.target
UNIT
ln -s "$release" "/opt/$slug/current-next"
mv -Tf "/opt/$slug/current-next" "/opt/$slug/current"
systemctl daemon-reload
systemctl enable "$slug.service"
if ! systemctl restart "$slug.service" || ! curl -fsS --retry 8 --retry-all-errors --retry-delay 1 --max-time 10 "http://127.0.0.1:$port/$slug/api/health"; then
 if [ -n "$previous" ] && [ -d "$previous" ]; then
  ln -s "$previous" "/opt/$slug/current-rollback";mv -Tf "/opt/$slug/current-rollback" "/opt/$slug/current";systemctl restart "$slug.service"
 else systemctl stop "$slug.service";fi
 exit 1
fi
if ! python3 "$release/ops/connect-nginx.py"; then
 if [ -n "$previous" ] && [ -d "$previous" ]; then ln -s "$previous" "/opt/$slug/current-rollback";mv -Tf "/opt/$slug/current-rollback" "/opt/$slug/current";systemctl restart "$slug.service";else systemctl stop "$slug.service";fi
 exit 1
fi
python3 "$release/ops/verify-public.py"
printf '%s release=%s previous=%s health=ok\n' "$(date -Is)" "$release" "$previous" >> "/opt/$slug/releases.log"
systemctl is-active "$slug.service"
REMOTE
printf '\nPublished %s: %s\n' "$slug" "$version"
