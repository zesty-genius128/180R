# F1 Predictor - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the F1 AI Prediction Dashboard to a Kubernetes cluster.

## Architecture

The application consists of three tiers:
- **Frontend**: React application (nginx-served static files)
- **API Gateway**: Node.js backend with WebSocket support
- **ML Backend**: Python FastF1 + ML prediction service

## Prerequisites

1. **Kubernetes Cluster**: Local (minikube, kind, Docker Desktop) or cloud-based
2. **kubectl**: Configured to connect to your cluster
3. **NGINX Ingress Controller**: For routing external traffic
4. **Metrics Server**: For horizontal pod autoscaling (HPA)
5. **Docker**: For building container images

## Quick Start

```bash
# Deploy everything
./deploy.sh

# Check status
kubectl get all -n f1-predictor

# Access the application
# Add to /etc/hosts: 127.0.0.1 f1-predictor.local
# Visit: http://f1-predictor.local
```

## Manual Deployment

```bash
# 1. Create namespace and resources
kubectl apply -f namespace.yaml
kubectl apply -f persistent-volumes.yaml
kubectl apply -f configmap.yaml

# 2. Create services
kubectl apply -f services.yaml

# 3. Deploy applications
kubectl apply -f python-backend-deployment.yaml
kubectl apply -f node-backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# 4. Setup ingress and autoscaling
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

## Components

### Deployments
- **python-backend**: 2 replicas, ML prediction service
- **node-backend**: 3 replicas, API gateway with WebSocket
- **frontend**: 2 replicas, React SPA

### Services
- **python-backend-service**: ClusterIP, port 5001
- **node-backend-service**: ClusterIP, port 3001
- **frontend-service**: ClusterIP, port 80

### Storage
- **f1-cache-pvc**: 5Gi persistent volume for FastF1 cache
- **f1-logs-pvc**: 2Gi persistent volume for application logs

### Autoscaling
- **python-backend-hpa**: CPU 70%, Memory 80%, 2-5 replicas
- **node-backend-hpa**: CPU 60%, Memory 70%, 3-10 replicas
- **frontend-hpa**: CPU 50%, 2-6 replicas

### Ingress
- **f1-predictor.local**: Routes traffic to appropriate services
- WebSocket support for real-time race updates
- CORS enabled for API access

## Scaling

The application auto-scales based on CPU and memory usage:

```bash
# Manual scaling
kubectl scale deployment python-backend --replicas=4 -n f1-predictor

# Check HPA status
kubectl get hpa -n f1-predictor
```

## Monitoring

```bash
# Pod status
kubectl get pods -n f1-predictor

# Logs
kubectl logs -f deployment/python-backend -n f1-predictor
kubectl logs -f deployment/node-backend -n f1-predictor

# Resource usage
kubectl top pods -n f1-predictor
kubectl top nodes
```

## Configuration

Environment variables are managed via ConfigMap (`configmap.yaml`):
- Python backend: Flask settings, cache directory
- Node.js backend: API URLs, CORS settings
- Frontend: API endpoints, WebSocket URLs

## Troubleshooting

### Common Issues

1. **Images not found**: Ensure Docker images are built and available
2. **Ingress not working**: Check NGINX ingress controller is installed
3. **WebSocket issues**: Verify ingress WebSocket annotations
4. **Storage issues**: Check persistent volume provisioner

### Debug Commands

```bash
# Describe resources
kubectl describe deployment python-backend -n f1-predictor
kubectl describe pod <pod-name> -n f1-predictor

# Check ingress
kubectl describe ingress f1-predictor-ingress -n f1-predictor

# Service connectivity
kubectl exec -it <pod-name> -n f1-predictor -- curl http://python-backend-service:5001/api/health
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace f1-predictor

# Or delete individual components
kubectl delete -f .
```

## Production Considerations

1. **Security**: Add network policies, pod security policies
2. **SSL/TLS**: Configure HTTPS with cert-manager
3. **Monitoring**: Add Prometheus, Grafana for observability
4. **Backup**: Setup persistent volume backups
5. **CI/CD**: Integrate with GitOps workflows (ArgoCD, Flux)
6. **Resource Limits**: Tune CPU/memory requests and limits
7. **Health Checks**: Fine-tune liveness and readiness probes