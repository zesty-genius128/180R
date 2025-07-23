#!/bin/bash

# F1 AI Predictor Complete Setup Script
set -e

echo "🏁 F1 AI Predictor Dashboard Setup"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Install from https://nodejs.org"
        exit 1
    fi
    print_success "Node.js $(node --version) ✓"
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        print_error "Python not found. Install from https://python.org"
        exit 1
    fi
    print_success "Python $($PYTHON_CMD --version | cut -d' ' -f2) ✓"
}

# Setup Python backend
setup_python() {
    print_status "Setting up Python backend..."
    cd backend-python
    
    $PYTHON_CMD -m venv venv
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    pip install --upgrade pip
    pip install -r requirements.txt
    
    print_success "Python backend ready ✓"
    cd ..
}

# Setup Node.js backend
setup_node() {
    print_status "Setting up Node.js backend..."
    cd backend-node
    npm install
    print_success "Node.js backend ready ✓"
    cd ..
}

# Setup React frontend
setup_react() {
    print_status "Setting up React frontend..."
    cd frontend
    npm install
    print_success "React frontend ready ✓"
    cd ..
}

# Create startup script
create_startup() {
    print_status "Creating startup script..."
    
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🏁 Starting F1 AI Predictor Dashboard"
echo "====================================="

cleanup() {
    echo "🛑 Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "🐍 Starting Python backend..."
cd backend-python && source venv/bin/activate && python app.py &

sleep 10
echo "🚀 Starting Node.js backend..."
cd backend-node && npm run dev &

sleep 5  
echo "⚛️ Starting React frontend..."
cd frontend && npm start &

echo ""
echo "🎉 F1 Dashboard Starting!"
echo "🐍 Python: http://localhost:5000"
echo "🚀 Node.js: http://localhost:3001" 
echo "⚛️ React: http://localhost:3000"
echo ""
echo "🛑 Press Ctrl+C to stop"
wait
EOF

    chmod +x start-all.sh
    print_success "Startup script created ✓"
}

# Main execution
main() {
    check_requirements
    setup_python
    setup_node
    setup_react
    create_startup
    
    echo ""
    print_success "🎉 Setup Complete!"
    echo "==================="
    echo ""
    echo "🚀 Start the dashboard:"
    echo "   ./start-all.sh"
    echo ""
    echo "🌐 Access points:"
    echo "   • Dashboard: http://localhost:3000"
    echo "   • Node API:  http://localhost:3001"
    echo "   • Python API: http://localhost:5000"
    echo ""
    echo "🏎️ Happy F1 predicting!"
}

main