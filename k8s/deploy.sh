#!/bin/bash

set -e

echo "🚀 Deploying F1 Predictor to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster"
    echo "Please configure kubectl to connect to your cluster first"
    exit 1
fi

# Build Docker images (assumes Docker is available)
echo "🏗️  Building Docker images..."
cd ../old-project

# Build Python backend
echo "Building Python backend..."
docker build -t f1-predictor/python-backend:latest ./backend-python

# Build Node.js backend  
echo "Building Node.js backend..."
docker build -t f1-predictor/node-backend:latest ./backend-node

# Build React frontend
echo "Building React frontend..."
docker build -t f1-predictor/frontend:latest ./frontend

cd ../k8s

# Apply Kubernetes manifests in order
echo "🔧 Applying Kubernetes manifests..."

echo "Creating namespace..."
kubectl apply -f namespace.yaml

echo "Creating persistent volumes..."
kubectl apply -f persistent-volumes.yaml

echo "Creating config maps..."
kubectl apply -f configmap.yaml

echo "Creating services..."
kubectl apply -f services.yaml

echo "Creating deployments..."
kubectl apply -f python-backend-deployment.yaml
kubectl apply -f node-backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

echo "Creating ingress..."
kubectl apply -f ingress.yaml

echo "Creating horizontal pod autoscalers..."
kubectl apply -f hpa.yaml

echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/python-backend -n f1-predictor
kubectl wait --for=condition=available --timeout=300s deployment/node-backend -n f1-predictor
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n f1-predictor

echo "✅ Deployment complete!"
echo ""
echo "📊 Cluster status:"
kubectl get all -n f1-predictor

echo ""
echo "🌐 Access your application:"
echo "Add the following to your /etc/hosts file:"
echo "127.0.0.1 f1-predictor.local"
echo ""
echo "Then visit: http://f1-predictor.local"
echo ""
echo "📝 Useful commands:"
echo "kubectl get pods -n f1-predictor"
echo "kubectl logs -f deployment/python-backend -n f1-predictor"
echo "kubectl logs -f deployment/node-backend -n f1-predictor"
echo "kubectl logs -f deployment/frontend -n f1-predictor"