# Deploying Beacon to a Single EC2 Instance

This document describes how to deploy the Beacon application to a single AWS EC2 instance. This setup is suitable for a pre-launch marketing site and is designed for simplicity and low cost.

## Instance Requirements

*   **Type**: `t4g.micro` (ARM64 Graviton)
*   **AMI**: Latest Amazon Linux 2023 ARM64
*   **Storage**: 8 GB gp3
*   **Region**: `ap-south-1`
*   **Elastic IP** attached

## Security Group Rules

The security group for your EC2 instance should have the following inbound rules:

*   **HTTP (Port 80)**: Accessible from `0.0.0.0/0` (everyone)
*   **SSH (Port 22)**: Accessible from your administrative IP address only

## Launching the EC2 Instance

You can launch the EC2 instance using the AWS CLI or Console. Here's an example AWS CLI command:

```bash
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64 \
  --instance-type t4g.micro \
  --key-name your-ssh-key-name \
  --security-group-ids sg-xxxxxxxxxxxxxxxxx \
  --subnet-id subnet-xxxxxxxxxxxxxxxxx \
  --associate-public-ip-address \
  --user-data file://deploy/ec2-user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=beacon-demo}]'
```

Replace `your-ssh-key-name`, `sg-xxxxxxxxxxxxxxxxx` (your security group ID), and `subnet-xxxxxxxxxxxxxxxxx` (your subnet ID) with your actual values.

After launching, attach an Elastic IP to the instance.

## Deployment Runbook

Use the `deploy/deploy.sh` script from your local machine to deploy the application.

1.  **Ensure SSH key permissions**: Your SSH private key (`your-key.pem`) must have the correct permissions:
    ```bash
    chmod 400 your-key.pem
    ```

2.  **Run the deployment script**: Execute the `deploy.sh` script, providing your instance's public IP address and the path to your SSH private key.
    ```bash
    ./deploy/deploy.sh <your-instance-public-ip> your-key.pem
    ```

    The script will perform the following steps:
    *   `rsync` the repository content (excluding `node_modules`, `.git`, and `data`) to the EC2 instance.
    *   SSH into the instance and build/run the Docker containers using `docker compose`.
    *   Copy the `nginx.conf` file to the instance and move it to `/etc/nginx/conf.d/beacon.conf`.
    *   Reload the nginx service.
    *   Poll the `/healthz` endpoint for up to 60 seconds to verify the deployment. If the health check does not pass within this time, the script will exit with an error.

## Operations

Once deployed, you can manage the application on the EC2 instance using SSH.

*   **View application logs**:
    ```bash
    ssh -i your-key.pem ec2-user@<your-instance-public-ip> "docker compose -f ~/beacon/deploy/docker-compose.yaml logs -f web"
    ```

*   **Restart the application container**:
    ```bash
    ssh -i your-key.pem ec2-user@<your-instance-public-ip> "docker compose -f ~/beacon/deploy/docker-compose.yaml restart web"
    ```

*   **Read the waitlist data**:
    ```bash
    ssh -i your-key.pem ec2-user@<your-instance-public-ip> "docker run --rm -v beacon_waitlist_data:/d alpine cat /d/waitlist.json"
    ```

## Rollback

To roll back to a previous version, checkout the desired commit on your local machine and re-run the `deploy.sh` script.

```bash
git checkout <previous-sha>
./deploy/deploy.sh <your-instance-public-ip> your-key.pem
```

Note that this process involves a brief downtime (2-3 seconds) during the redeployment.
