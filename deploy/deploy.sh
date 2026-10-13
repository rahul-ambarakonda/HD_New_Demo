#!/bin/sh
set -eu

IP=$1
KEY=$2

# 1. rsync the repository
echo "Syncing repository to ec2-user@$IP:~/beacon"
rsync -avz --exclude 'node_modules/' --exclude '.git/' --exclude 'data/' -e "ssh -i $KEY" . "ec2-user@$IP:~/beacon"

# 2. ssh in and run docker compose
echo "Building and running Docker containers on $IP"
ssh -i "$KEY" "ec2-user@$IP" "cd ~/beacon && docker compose -f deploy/docker-compose.yaml up -d --build"

# 3. Copy deploy/nginx.conf into /etc/nginx/conf.d/
echo "Copying nginx configuration to $IP"
scp -i "$KEY" deploy/nginx.conf "ec2-user@$IP:/tmp/beacon.nginx.conf"
ssh -i "$KEY" "ec2-user@$IP" "sudo mv /tmp/beacon.nginx.conf /etc/nginx/conf.d/beacon.conf"

# 4. Reload nginx
echo "Reloading nginx on $IP"
ssh -i "$KEY" "ec2-user@$IP" "sudo systemctl reload nginx"

# 5. Poll /healthz
echo "Polling health endpoint on $IP"
for i in $(seq 1 60);
do
    if curl -sSf "http://$IP/healthz" > /dev/null; then
        echo "Health check passed after $i seconds."
        exit 0
    fi
    echo "Health check failed, retrying in 1 second..."
    sleep 1
done

echo "Health check failed after 60 seconds. Deployment might have issues."
exit 1