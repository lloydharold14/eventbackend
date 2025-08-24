#!/bin/bash

# Event Management Platform - Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="dev"
REGION="us-east-1"
ACCOUNT=""
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -a|--account)
            ACCOUNT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Environment to deploy to (dev, staging, prod)"
            echo "  -r, --region REGION      AWS region (default: us-east-1)"
            echo "  -a, --account ACCOUNT    AWS account ID"
            echo "  --dry-run               Show what would be deployed without deploying"
            echo "  --force                 Force deployment without confirmation"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 -e dev                    # Deploy to development"
            echo "  $0 -e staging -r us-west-2   # Deploy to staging in us-west-2"
            echo "  $0 -e prod --dry-run         # Show what would be deployed to production"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
    exit 1
fi

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    print_error "Node.js and npm are not installed. Please install them first."
    exit 1
fi

print_status "Starting deployment to $ENVIRONMENT environment in $REGION region"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

print_status "Project directory: $PROJECT_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build the project
print_status "Building the project..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

print_success "Build completed successfully"

# Set environment variables
export AWS_REGION="$REGION"
export ENVIRONMENT="$ENVIRONMENT"

if [ -n "$ACCOUNT" ]; then
    export CDK_DEFAULT_ACCOUNT="$ACCOUNT"
fi

# Bootstrap CDK if needed
print_status "Checking if CDK is bootstrapped..."
if ! cdk list --context environment="$ENVIRONMENT" &> /dev/null; then
    print_warning "CDK is not bootstrapped. Bootstrapping now..."
    cdk bootstrap --context environment="$ENVIRONMENT"
fi

# Show what will be deployed
print_status "Showing deployment plan..."
if [ "$DRY_RUN" = true ]; then
    cdk diff --context environment="$ENVIRONMENT"
    print_success "Dry run completed. No changes were deployed."
    exit 0
fi

# Confirm deployment (unless --force is used)
if [ "$FORCE" = false ]; then
    echo ""
    print_warning "You are about to deploy to the $ENVIRONMENT environment in $REGION region."
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled."
        exit 0
    fi
fi

# Deploy the stacks
print_status "Deploying stacks..."
cdk deploy --all --context environment="$ENVIRONMENT" --require-approval never

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully!"
    
    # Show outputs
    print_status "Deployment outputs:"
    cdk list --context environment="$ENVIRONMENT" | while read stack; do
        echo "  $stack"
    done
    
    print_status "You can view the outputs with: cdk list --context environment=$ENVIRONMENT"
else
    print_error "Deployment failed. Please check the logs above for errors."
    exit 1
fi

print_success "Event Management Platform deployment completed!"
print_status "Next steps:"
echo "  1. Configure your domain in API Gateway (optional)"
echo "  2. Set up monitoring alerts in CloudWatch"
echo "  3. Configure Stripe webhook endpoints"
echo "  4. Test the health check endpoint"
echo ""
print_status "For more information, see the README.md file."
