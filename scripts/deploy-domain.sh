#!/bin/bash

# Event Management Platform - Domain Integration Deployment Script
# This script sets up custom domains, CloudFront distributions, and SSL certificates

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
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
DOMAIN_NAME=""
SUBDOMAIN="api"
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        -s|--subdomain)
            SUBDOMAIN="$2"
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
            echo "Options:"
            echo "  -e, --environment ENV    Environment (dev, staging, prod) [default: dev]"
            echo "  -d, --domain DOMAIN      Domain name (e.g., yourdomain.com)"
            echo "  -s, --subdomain SUB      Subdomain (e.g., api) [default: api]"
            echo "  --dry-run               Preview changes without deploying"
            echo "  --force                 Force deployment without confirmation"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$DOMAIN_NAME" ]]; then
    print_error "Domain name is required. Use -d or --domain option."
    echo "Example: $0 -d yourdomain.com -s api"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

print_info "🚀 Starting Domain Integration Deployment"
print_info "Environment: $ENVIRONMENT"
print_info "Domain: $DOMAIN_NAME"
print_info "Subdomain: $SUBDOMAIN"
print_info "Full Domain: $SUBDOMAIN.$DOMAIN_NAME"

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Check if domain is already configured
check_existing_domain() {
    print_info "Checking existing domain configuration..."
    
    # Check if hosted zone exists
    if aws route53 list-hosted-zones --query "HostedZones[?Name=='$DOMAIN_NAME.']" --output text | grep -q "$DOMAIN_NAME"; then
        print_warning "Hosted zone for $DOMAIN_NAME already exists"
        return 0
    else
        print_info "No existing hosted zone found for $DOMAIN_NAME"
        return 1
    fi
}

# Deploy domain integration stack
deploy_domain_stack() {
    print_info "Deploying Domain Integration Stack..."
    
    # Set environment variables for CDK
    export CDK_DOMAIN_NAME="$DOMAIN_NAME"
    export CDK_SUBDOMAIN="$SUBDOMAIN"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "Running in dry-run mode..."
        npx cdk diff DomainIntegration-$ENVIRONMENT
    else
        if [[ "$FORCE" != true ]]; then
            echo
            print_warning "This will create/update the following resources:"
            echo "  - Route 53 Hosted Zone for $DOMAIN_NAME"
            echo "  - SSL Certificate for $SUBDOMAIN.$DOMAIN_NAME"
            echo "  - CloudFront Distribution"
            echo "  - API Gateway Custom Domain"
            echo "  - DNS Records"
            echo
            read -p "Do you want to continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Deployment cancelled"
                exit 0
            fi
        fi
        
        npx cdk deploy DomainIntegration-$ENVIRONMENT --require-approval never
    fi
}

# Get deployment outputs
get_deployment_outputs() {
    print_info "Getting deployment outputs..."
    
    # Get CloudFormation outputs
    STACK_NAME="DomainIntegration-$ENVIRONMENT"
    
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
        print_success "Domain integration deployed successfully!"
        echo
        
        # Get outputs
        OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json)
        
        echo "📋 Deployment Summary:"
        echo "======================"
        
        # Parse and display outputs
        echo "$OUTPUTS" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"' | while read -r line; do
            if [[ -n "$line" ]]; then
                echo "  $line"
            fi
        done
        
        echo
        print_info "Next steps:"
        echo "1. Update your Namecheap DNS settings with the provided name servers"
        echo "2. Wait for DNS propagation (can take up to 48 hours)"
        echo "3. Test your API at: https://$SUBDOMAIN.$DOMAIN_NAME"
        
    else
        print_error "Failed to get deployment outputs"
        exit 1
    fi
}

# Generate DNS configuration guide
generate_dns_guide() {
    print_info "Generating DNS configuration guide..."
    
    cat > "DNS_CONFIGURATION_GUIDE.md" << EOF
# DNS Configuration Guide for $DOMAIN_NAME

## Overview
This guide will help you configure your Namecheap domain to work with the Event Management Platform.

## Option 1: Use Route 53 Name Servers (Recommended)

### Step 1: Get Route 53 Name Servers
After deployment, you'll get name servers from the CDK output. They will look like:
\`\`\`
ns-1234.awsdns-12.com
ns-5678.awsdns-34.net
ns-9012.awsdns-56.org
ns-3456.awsdns-78.co.uk
\`\`\`

### Step 2: Update Namecheap DNS
1. Log in to your Namecheap account
2. Go to "Domain List" and click "Manage" next to $DOMAIN_NAME
3. Go to "Domain" tab
4. Under "Nameservers", select "Custom DNS"
5. Replace the existing name servers with the Route 53 name servers
6. Click "✓" to save

### Step 3: Wait for Propagation
DNS changes can take up to 48 hours to propagate globally.

## Option 2: Keep Namecheap DNS (Alternative)

If you prefer to keep using Namecheap DNS, you can create CNAME records:

### Step 1: Get CloudFront Domain
After deployment, you'll get a CloudFront domain name from the CDK output.

### Step 2: Create CNAME Record
1. Log in to your Namecheap account
2. Go to "Domain List" and click "Manage" next to $DOMAIN_NAME
3. Go to "Advanced DNS" tab
4. Add a new CNAME record:
   - Host: $SUBDOMAIN
   - Value: [CloudFront Domain Name]
   - TTL: Automatic

## Testing Your Setup

Once DNS is configured, test your API:

\`\`\`bash
# Test the API endpoint
curl https://$SUBDOMAIN.$DOMAIN_NAME/health

# Test password reset endpoint
curl -X POST https://$SUBDOMAIN.$DOMAIN_NAME/auth/reset-password \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com"}'
\`\`\`

## Troubleshooting

### SSL Certificate Issues
- SSL certificate validation can take up to 30 minutes
- Ensure DNS is properly configured before certificate validation

### DNS Propagation
- Use tools like https://dnschecker.org to check propagation
- Different regions may take different times to update

### CloudFront Distribution
- CloudFront distribution can take 15-20 minutes to deploy
- Check CloudFront status in AWS Console

## Support

If you encounter issues:
1. Check CloudWatch logs for errors
2. Verify DNS configuration
3. Ensure SSL certificate is valid
4. Check API Gateway custom domain status
EOF

    print_success "DNS configuration guide created: DNS_CONFIGURATION_GUIDE.md"
}

# Main execution
main() {
    print_info "Starting domain integration deployment..."
    
    check_prerequisites
    check_existing_domain
    deploy_domain_stack
    get_deployment_outputs
    generate_dns_guide
    
    print_success "Domain integration deployment completed!"
}

# Run main function
main "$@"
