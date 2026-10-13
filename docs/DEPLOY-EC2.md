# Deploying Beacon to a Single EC2 Instance

This document outlines the steps to deploy the Beacon application to a single AWS EC2 instance. The deployment uses Docker and nginx to serve the application.

## 1. Instance Setup

**Instance Type:** `t4g.micro` (ARM64 Graviton)
**AMI:** Latest Amazon Linux 2023 ARM64
**Storage:** 8 GB gp3
**Region:** `ap-south-1`

**Security Group Rules:**
*   Inbound `80` from `0.0.0.0/0` (HTTP)
*   Inbound `22` from your administrative IP only (SSH)
*   Outbound: All traffic

**Elastic IP:** Attach an Elastic IP to the instance so its public address remains stable across stop/starts.

### AWS CLI `run-instances` example:

```bash
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64 \
  --instance-type t4g.micro \
  --key-name your-ssh-key-pair-name \
  --security-group-ids sg-xxxxxxxxxxxxxxxxx # Replace with your security group ID \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":8,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Beacon-EC2-Demo}]' \
  --user-data file://deploy/ec2-user-data.sh \
  --region ap-south-1
```

**Note:** After the instance launches, associate an Elastic IP with it.

## 2. Deployment Runbook

Once your EC2 instance is set up and reachable via SSH, you can deploy the Beacon application using the `deploy.sh` script.

### Prerequisites:
*   Your SSH private key (`.pem` file) for connecting to the EC2 instance.
*   The public IP address of your EC2 instance.

### Steps:

1.  **Make `deploy.sh` executable (if not already):**
    ```bash
    chmod +x deploy/deploy.sh
    ```

2.  **Run the deployment script:**
    ```bash
    ./deploy/deploy.sh <your-ec2-instance-ip> <path/to/your/ssh-key.pem>
    ```
    *   Replace `<your-ec2-instance-ip>` with the actual public IP of your instance.
    *   Replace `<path/to/your/ssh-key.pem>` with the full path to your SSH private key.

    The script will perform the following actions:
    *   `rsync` the local repository files (excluding `node_modules`, `.git`, and `data`) to `~/beacon` on the EC2 instance.
    *   SSH into the instance, navigate to `~/beacon`, and run `docker compose up -d --build` to build and start the application container in the background.
    *   Copy the `nginx.conf` file to `/etc/nginx/conf.d/beacon.conf` on the instance and reload nginx.
    *   Poll the `/healthz` endpoint for up to 60 seconds to ensure the application is running successfully.

3.  **Verify the deployment:**
    Open your web browser and navigate to `http://<your-ec2-instance-ip>`. You should see the Beacon landing page.

## 3. Operations

These commands can be run directly on the EC2 instance via SSH.

### View application logs:
```bash
docker compose -f ~/beacon/deploy/docker-compose.yaml logs -f web
```

### Restart the application container:
```bash
docker compose -f ~/beacon/deploy/docker-compose.yaml restart web
```

### Read the waitlist data:
```bash
docker run --rm -v beacon_waitlist_data:/d alpine cat /d/waitlist.json
```

### Rollback to a previous version:
```bash
# On your local machine:
git checkout <previous-sha>
bash deploy/deploy.sh <your-ec2-instance-ip> <path/to/your/ssh-key.pem>
```

**Note:** Redeployments may cause a few seconds of downtime, which is acceptable for this pre-launch page.