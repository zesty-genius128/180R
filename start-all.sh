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
