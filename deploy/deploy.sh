#!/bin/sh
set -eu

IP="$1"
KEY_PATH="$2"

if [ -z "$IP" ] || [ -z "$KEY_PATH" ]; then
  echo "Usage: $0 <instance-ip> <key-path>"
  exit 1
fi

echo "🚀 Deploying to $IP"

echo "📦 Syncing repository..."
rsync -avz -e "ssh -i $KEY_PATH" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='data' \
  . "ec2-user@$IP:~/beacon"

echo "🛠️ Building and starting Docker containers..."
ssh -i "$KEY_PATH" "ec2-user@$IP" \
  "cd ~/beacon && docker compose -f deploy/docker-compose.yaml up -d --build"

echo "⚙️ Copying nginx configuration and reloading..."
ssh -i "$KEY_PATH" "ec2-user@$IP" \
  "sudo cp ~/beacon/deploy/nginx.conf /etc/nginx/conf.d/beacon.conf && sudo systemctl reload nginx"

echo "Snoozing for a bit to let the container boot up..."
sleep 5

echo "💖 Polling health endpoint..."
HEALTH_CHECK_URL="http://$IP/healthz"
for i in $(seq 1 60); do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || true)
  if [ "$STATUS_CODE" -eq 200 ]; then
    echo "✅ Health check passed!"
    exit 0
  fi
  echo "⏳ Health check failed with status $STATUS_CODE. Retrying in 1 second... ($i/60)"
  sleep 1
done

echo "❌ Health check failed after 60 seconds. Deployment might have issues."
exit 1
