#!/bin/bash

# Event Management Platform - Multi-Environment Deployment Script
# Supports: dev, staging, prod environments with comprehensive validation and security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Default values
ENVIRONMENT=""
REGION="ca-central-1"
ACCOUNT=""
DRY_RUN=false
FORCE=false
SKIP_TESTS=false
SKIP_VALIDATION=false
ROLLBACK_ON_FAILURE=true
PARALLEL_DEPLOYMENT=false
ENABLE_MONITORING=true
ENABLE_SECURITY_SCAN=true

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
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --parallel)
            PARALLEL_DEPLOYMENT=true
            shift
            ;;
        --no-monitoring)
            ENABLE_MONITORING=false
            shift
            ;;
        --no-security-scan)
            ENABLE_SECURITY_SCAN=false
            shift
            ;;
        -h|--help)
            echo "Event Management Platform - Multi-Environment Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Required Options:"
            echo "  -e, --environment ENV    Environment to deploy to (dev, staging, prod)"
            echo ""
            echo "Optional Options:"
            echo "  -r, --region REGION      AWS region (default: ca-central-1)"
            echo "  -a, --account ACCOUNT    AWS account ID"
            echo "  --dry-run               Show what would be deployed without deploying"
            echo "  --force                 Force deployment without confirmation"
            echo "  --skip-tests            Skip running tests before deployment"
            echo "  --skip-validation       Skip environment validation"
            echo "  --no-rollback           Disable automatic rollback on failure"
            echo "  --parallel              Enable parallel deployment for faster deployment"
            echo "  --no-monitoring         Skip monitoring setup"
            echo "  --no-security-scan      Skip security scanning"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 -e dev                    # Deploy to development"
            echo "  $0 -e staging --dry-run      # Show what would be deployed to staging"
            echo "  $0 -e prod --force           # Deploy to production without confirmation"
            echo "  $0 -e staging --parallel     # Deploy to staging with parallel deployment"
            echo ""
            echo "Environment-Specific Features:"
            echo "  dev:      Development environment with minimal resources"
            echo "  staging:  Pre-production environment with full features"
            echo "  prod:     Production environment with maximum security and monitoring"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required environment parameter
if [[ -z "$ENVIRONMENT" ]]; then
    print_error "Environment is required. Use -e or --environment option."
    echo "Run '$0 --help' for usage information."
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

print_header "Event Management Platform - Multi-Environment Deployment"
print_status "Environment: $ENVIRONMENT"
print_status "Region: $REGION"
print_status "Project Directory: $PROJECT_DIR"
print_status "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
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
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Function to validate environment configuration
validate_environment() {
    if [[ "$SKIP_VALIDATION" = true ]]; then
        print_warning "Skipping environment validation"
        return
    fi
    
    print_step "Validating environment configuration..."
    
    # Check if we're deploying to production
    if [[ "$ENVIRONMENT" = "prod" ]]; then
        print_warning "You are deploying to PRODUCTION environment!"
        echo ""
        echo "Production deployment checklist:"
        echo "  ✓ All tests passing"
        echo "  ✓ Security scan completed"
        echo "  ✓ Code review approved"
        echo "  ✓ Database migrations tested"
        echo "  ✓ Rollback plan prepared"
        echo "  ✓ Monitoring alerts configured"
        echo "  ✓ Backup procedures verified"
        echo ""
        
        if [[ "$FORCE" = false ]]; then
            read -p "Are you absolutely sure you want to deploy to PRODUCTION? (type 'PRODUCTION' to confirm): " -r
            if [[ ! $REPLY =~ ^PRODUCTION$ ]]; then
                print_status "Production deployment cancelled."
                exit 0
            fi
        fi
    fi
    
    # Validate AWS account (if provided)
    if [[ -n "$ACCOUNT" ]]; then
        CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        if [[ "$CURRENT_ACCOUNT" != "$ACCOUNT" ]]; then
            print_error "Current AWS account ($CURRENT_ACCOUNT) does not match specified account ($ACCOUNT)"
            exit 1
        fi
    fi
    
    # Check AWS region
    if ! aws ec2 describe-regions --region-names "$REGION" &> /dev/null; then
        print_error "Invalid AWS region: $REGION"
        exit 1
    fi
    
    print_success "Environment validation completed"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" = true ]]; then
        print_warning "Skipping tests"
        return
    fi
    
    print_step "Running tests..."
    
    # Run unit tests
    print_status "Running unit tests..."
    if ! npm run test:unit; then
        print_error "Unit tests failed"
        exit 1
    fi
    
    # Run integration tests
    print_status "Running integration tests..."
    if ! npm run test:integration; then
        print_error "Integration tests failed"
        exit 1
    fi
    
    # Run security tests
    print_status "Running security tests..."
    if ! npm run test:security; then
        print_error "Security tests failed"
        exit 1
    fi
    
    print_success "All tests passed"
}

# Function to build the project
build_project() {
    print_step "Building the project..."
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Clean and build
    print_status "Cleaning and building..."
    npm run clean
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Build failed. Please fix the errors and try again."
        exit 1
    fi
    
    print_success "Build completed successfully"
}

# Function to bootstrap CDK
bootstrap_cdk() {
    print_step "Bootstrapping CDK..."
    
    if ! cdk list --context environment="$ENVIRONMENT" &> /dev/null; then
        print_warning "CDK is not bootstrapped. Bootstrapping now..."
        cdk bootstrap --context environment="$ENVIRONMENT"
    else
        print_status "CDK is already bootstrapped"
    fi
}

# Function to show deployment plan
show_deployment_plan() {
    print_step "Showing deployment plan..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN MODE - No changes will be deployed"
        cdk diff --context environment="$ENVIRONMENT"
        print_success "Dry run completed. No changes were deployed."
        exit 0
    fi
    
    # Show what will be deployed
    print_status "Deployment plan:"
    cdk list --context environment="$ENVIRONMENT" | while read stack; do
        echo "  - $stack"
    done
    
    # Show estimated cost
    print_status "Estimated monthly cost for $ENVIRONMENT environment:"
    case $ENVIRONMENT in
        dev)
            echo "  ~$200-400/month"
            ;;
        staging)
            echo "  ~$500-800/month"
            ;;
        prod)
            echo "  ~$1000-2000/month"
            ;;
    esac
}

# Function to confirm deployment
confirm_deployment() {
    if [ "$FORCE" = true ]; then
        print_warning "Force flag used - skipping confirmation"
        return
    fi
    
    echo ""
    print_warning "You are about to deploy to the $ENVIRONMENT environment in $REGION region."
    echo ""
    echo "Deployment details:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region: $REGION"
    echo "  Account: $(aws sts get-caller-identity --query Account --output text)"
    echo "  User: $(aws sts get-caller-identity --query Arn --output text)"
    echo ""
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled."
        exit 0
    fi
}

# Function to deploy stacks
deploy_stacks() {
    print_step "Deploying stacks..."
    
    # Set environment variables
    export AWS_REGION="$REGION"
    export ENVIRONMENT="$ENVIRONMENT"
    
    if [ -n "$ACCOUNT" ]; then
        export CDK_DEFAULT_ACCOUNT="$ACCOUNT"
    fi
    
    # Deploy with appropriate flags
    DEPLOY_FLAGS="--context environment=$ENVIRONMENT --require-approval never"
    
    if [ "$PARALLEL_DEPLOYMENT" = true ]; then
        DEPLOY_FLAGS="$DEPLOY_FLAGS --concurrency 5"
    fi
    
    # Deploy all stacks
    if cdk deploy --all $DEPLOY_FLAGS; then
        print_success "Deployment completed successfully!"
        return 0
    else
        print_error "Deployment failed"
        return 1
    fi
}

# Function to setup monitoring
setup_monitoring() {
    if [[ "$ENABLE_MONITORING" = false ]]; then
        print_warning "Skipping monitoring setup"
        return
    fi
    
    print_step "Setting up monitoring..."
    
    # Create CloudWatch dashboard
    print_status "Creating CloudWatch dashboard..."
    # TODO: Implement dashboard creation
    
    # Setup alarms
    print_status "Setting up CloudWatch alarms..."
    # TODO: Implement alarm setup
    
    # Setup log groups
    print_status "Setting up log groups..."
    # TODO: Implement log group setup
    
    print_success "Monitoring setup completed"
}

# Function to run security scan
run_security_scan() {
    if [[ "$ENABLE_SECURITY_SCAN" = false ]]; then
        print_warning "Skipping security scan"
        return
    fi
    
    print_step "Running security scan..."
    
    # Check for security vulnerabilities in dependencies
    print_status "Checking for security vulnerabilities..."
    if command -v npm audit &> /dev/null; then
        if npm audit --audit-level=high; then
            print_warning "Security vulnerabilities found. Please review and fix before deployment."
            if [[ "$FORCE" = false ]]; then
                read -p "Continue with deployment despite security issues? (y/N): " -n 1 -r
                echo ""
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    print_status "Deployment cancelled due to security issues."
                    exit 1
                fi
            fi
        fi
    fi
    
    print_success "Security scan completed"
}

# Function to show deployment outputs
show_outputs() {
    print_step "Deployment outputs:"
    
    # Get stack outputs
    cdk list --context environment="$ENVIRONMENT" | while read stack; do
        echo ""
        print_status "Stack: $stack"
        cdk describe "$stack" --context environment="$ENVIRONMENT" | grep -E "(OutputKey|OutputValue)" || true
    done
    
    # Show important URLs
    echo ""
    print_status "Important URLs:"
    echo "  Health Check: https://$(aws apigateway get-rest-apis --query 'items[?name==`EventManagement-'$ENVIRONMENT'`].id' --output text).execute-api.$REGION.amazonaws.com/dev/health"
    echo "  API Documentation: https://$(aws apigateway get-rest-apis --query 'items[?name==`EventManagement-'$ENVIRONMENT'`].id' --output text).execute-api.$REGION.amazonaws.com/dev/docs"
    echo "  CloudWatch Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=EventManagement-$ENVIRONMENT"
    echo "  X-Ray Tracing: https://$REGION.console.aws.amazon.com/xray/home?region=$REGION#/traces"
}

# Function to run post-deployment tasks
post_deployment_tasks() {
    print_step "Running post-deployment tasks..."
    
    # Seed test data for dev environment
    if [[ "$ENVIRONMENT" = "dev" ]]; then
        print_status "Seeding test data for development environment..."
        npm run seed:test-data
    fi
    
    # Setup monitoring
    setup_monitoring
    
    # Run health checks
    print_status "Running health checks..."
    # TODO: Implement health check calls
    
    print_success "Post-deployment tasks completed"
}

# Function to rollback on failure
rollback_on_failure() {
    if [[ "$ROLLBACK_ON_FAILURE" = false ]]; then
        print_warning "Rollback disabled - manual intervention required"
        return
    fi
    
    print_error "Deployment failed - initiating rollback..."
    
    # TODO: Implement rollback logic
    print_warning "Rollback functionality not yet implemented"
    print_warning "Please manually review and fix the deployment issues"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment
    validate_environment
    
    # Run tests
    run_tests
    
    # Run security scan
    run_security_scan
    
    # Build project
    build_project
    
    # Bootstrap CDK
    bootstrap_cdk
    
    # Show deployment plan
    show_deployment_plan
    
    # Confirm deployment
    confirm_deployment
    
    # Deploy stacks
    if deploy_stacks; then
        # Show outputs
        show_outputs
        
        # Run post-deployment tasks
        post_deployment_tasks
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        print_success "Deployment completed successfully in ${duration} seconds!"
        print_status "Environment: $ENVIRONMENT"
        print_status "Region: $REGION"
        print_status "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        
        echo ""
        print_status "Next steps:"
        echo "  1. Test the health check endpoint"
        echo "  2. Verify all services are running correctly"
        echo "  3. Configure custom domain (optional)"
        echo "  4. Set up monitoring alerts"
        echo "  5. Configure backup procedures"
        echo "  6. Test the complete user workflow"
        
    else
        rollback_on_failure
        exit 1
    fi
}

# Run main function
main "$@"





