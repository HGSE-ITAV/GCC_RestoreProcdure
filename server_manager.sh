#!/bin/bash
# Server Management Script for GCC Restore Procedure

DEV_PORT=8000
STAGING_PORT=8001
IP_ADDRESS=$(hostname -I | awk '{print $1}')

show_status() {
    echo "🔍 SERVER STATUS CHECK"
    echo "====================="
    
    # Check development server
    if lsof -Pi :$DEV_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Development Server: RUNNING on port $DEV_PORT"
        echo "   Local: http://localhost:$DEV_PORT"
        echo "   Network: http://$IP_ADDRESS:$DEV_PORT"
    else
        echo "❌ Development Server: NOT RUNNING on port $DEV_PORT"
    fi
    
    # Check staging server
    if lsof -Pi :$STAGING_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Staging Server: RUNNING on port $STAGING_PORT"
        echo "   Local: http://localhost:$STAGING_PORT"
        echo "   Network: http://$IP_ADDRESS:$STAGING_PORT"
    else
        echo "❌ Staging Server: NOT RUNNING on port $STAGING_PORT"
    fi
    echo ""
}

start_dev_server() {
    echo "🚀 Starting Development Server..."
    cd /home/jared/app_dev/GCC_RestoreProcdure
    
    if lsof -Pi :$DEV_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠ Development server already running on port $DEV_PORT"
    else
        python3 -m http.server $DEV_PORT --bind 0.0.0.0 &
        sleep 2
        echo "✅ Development server started on port $DEV_PORT"
        echo "   Access at: http://$IP_ADDRESS:$DEV_PORT"
    fi
}

stop_server() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "🛑 Stopping $name server on port $port..."
        lsof -ti:$port | xargs kill
        sleep 2
        echo "✅ $name server stopped"
    else
        echo "⚠ $name server not running on port $port"
    fi
}

case "$1" in
    "status")
        show_status
        ;;
    "start-dev")
        start_dev_server
        ;;
    "stop-dev")
        stop_server $DEV_PORT "Development"
        ;;
    "stop-staging")
        stop_server $STAGING_PORT "Staging"
        ;;
    "stop-all")
        stop_server $DEV_PORT "Development"
        stop_server $STAGING_PORT "Staging"
        ;;
    "deploy-staging")
        echo "🔄 Deploying to staging..."
        cd /home/jared/app_dev/GCC_RestoreProcdure
        python3 deploy_staging.py
        ;;
    "help"|*)
        echo "🛠 GCC Restore Procedure Server Management"
        echo "=========================================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  status          - Show server status"
        echo "  start-dev       - Start development server (port $DEV_PORT)"
        echo "  stop-dev        - Stop development server"
        echo "  stop-staging    - Stop staging server"
        echo "  stop-all        - Stop all servers"
        echo "  deploy-staging  - Deploy current code to staging server"
        echo "  help            - Show this help message"
        echo ""
        echo "Server URLs:"
        echo "  Development: http://$IP_ADDRESS:$DEV_PORT"
        echo "  Staging:     http://$IP_ADDRESS:$STAGING_PORT"
        echo ""
        ;;
esac
