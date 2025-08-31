#!/bin/bash

echo "🔍 Validating Kubernetes manifests..."

# Function to validate YAML syntax (supports multi-document files)
validate_yaml() {
    local file=$1
    echo "Checking $file..."
    
    if command -v python3 &> /dev/null; then
        python3 -c "
import yaml
try:
    with open('$file', 'r') as f:
        docs = list(yaml.safe_load_all(f))
    print('✅ $file - Valid YAML syntax ({} documents)'.format(len(docs)))
except Exception as e:
    print('❌ $file - Invalid YAML syntax: {}'.format(e))
    exit(1)
        " 2>/dev/null
        if [ $? -ne 0 ]; then
            return 1
        fi
    else
        echo "⚠️  Python3 not available for YAML validation"
    fi
}

# Validate all YAML files
YAML_FILES="namespace.yaml configmap.yaml persistent-volumes.yaml services.yaml python-backend-deployment.yaml node-backend-deployment.yaml frontend-deployment.yaml ingress.yaml hpa.yaml"

for file in $YAML_FILES; do
    if [ -f "$file" ]; then
        validate_yaml "$file"
    else
        echo "❌ $file not found"
    fi
done

echo ""
echo "📋 Deployment Order:"
echo "1. Enable Kubernetes in Docker Desktop Settings"
echo "2. Run: kubectl cluster-info (to verify connection)"
echo "3. Run: ./deploy.sh (full deployment)"
echo ""
echo "Or manually:"
echo "kubectl apply -f namespace.yaml"
echo "kubectl apply -f persistent-volumes.yaml"
echo "kubectl apply -f configmap.yaml"
echo "kubectl apply -f services.yaml"
echo "kubectl apply -f *-deployment.yaml"
echo "kubectl apply -f ingress.yaml"
echo "kubectl apply -f hpa.yaml"