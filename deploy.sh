#!/bin/bash
# Deploy TutorConnect Backend to AWS ECS
# Run this from the TutorConnect-Backend directory with fresh Academy credentials.
#
# Usage:
#   ./deploy.sh
#
# Prerequisites:
#   - AWS credentials configured (~/.aws/credentials) with fresh Academy tokens
#   - Docker running
#   - Infrastructure already created with `make up` in TutorConnect-Infrastructure/

set -euo pipefail

# ── Config (must match Terraform outputs) ────────────────────────────────────
AWS_REGION="us-east-1"
APP_NAME="tutorconnect"
ECR_REPO="${APP_NAME}-backend"
ECS_CLUSTER="${APP_NAME}-cluster"
ECS_SERVICE="${APP_NAME}-backend-service"

# ── Resolve AWS account ID dynamically ───────────────────────────────────────
echo "▶ Fetching AWS account ID..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPO}"
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "  Account : $AWS_ACCOUNT_ID"
echo "  Image   : ${IMAGE_URI}:${IMAGE_TAG}"
echo ""

# ── Login to ECR ─────────────────────────────────────────────────────────────
echo "▶ Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# ── Build Docker image ────────────────────────────────────────────────────────
echo "▶ Building Docker image..."
docker build \
  --platform linux/amd64 \
  --tag "${IMAGE_URI}:${IMAGE_TAG}" \
  --tag "${IMAGE_URI}:latest" \
  .

# ── Push to ECR ───────────────────────────────────────────────────────────────
echo "▶ Pushing image to ECR..."
docker push "${IMAGE_URI}:${IMAGE_TAG}"
docker push "${IMAGE_URI}:latest"

# ── Force new ECS deployment ─────────────────────────────────────────────────
echo "▶ Updating ECS service..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --query "service.deployments[0].{status:status,desired:desiredCount}" \
  --output table

# ── Wait for deployment to stabilize ─────────────────────────────────────────
echo "▶ Waiting for service to stabilize (this takes ~2 min)..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION"

# ── Print the backend URL ─────────────────────────────────────────────────────
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "${APP_NAME}-alb" \
  --query "LoadBalancers[0].DNSName" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "unknown")

echo ""
echo "✅ Deploy complete!"
echo "   Backend URL : http://${ALB_DNS}/api"
echo "   Image tag   : ${IMAGE_TAG}"
echo ""
echo "   → Update EXPO_PUBLIC_API_URL in the frontend .env with this URL"
