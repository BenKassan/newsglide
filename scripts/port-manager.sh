#!/bin/bash

# Port Manager Script for NewsGlide
# Manages development server ports and prevents conflicts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Common dev ports
PORTS=(3000 5173 8080 8081 4173 5174)

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  NewsGlide Port Manager${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_ports() {
    print_header
    echo -e "\n${YELLOW}Checking ports...${NC}\n"

    local found_any=false

    for port in "${PORTS[@]}"; do
        local pid=$(lsof -ti :$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            found_any=true
            local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            echo -e "${RED}✗${NC} Port $port is in use by PID $pid ($process)"
        else
            echo -e "${GREEN}✓${NC} Port $port is free"
        fi
    done

    if [ "$found_any" = false ]; then
        echo -e "\n${GREEN}All ports are free!${NC}"
    fi

    echo ""
}

kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)

    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null && echo -e "${GREEN}✓ Killed process on port $port${NC}" || echo -e "${RED}✗ Failed to kill process on port $port${NC}"
    else
        echo -e "${GREEN}Port $port is already free${NC}"
    fi
}

kill_all_ports() {
    print_header
    echo -e "\n${YELLOW}Killing all processes on dev ports...${NC}\n"

    for port in "${PORTS[@]}"; do
        kill_port $port
    done

    echo -e "\n${GREEN}Done! All dev ports cleared.${NC}\n"
}

kill_dev_servers() {
    print_header
    echo -e "\n${YELLOW}Killing all Vite dev servers...${NC}\n"

    # Kill by process name
    pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Killed Vite processes${NC}" || echo -e "${YELLOW}No Vite processes found${NC}"

    # Kill by port
    kill_port 3000

    echo -e "\n${GREEN}Done!${NC}\n"
}

show_projects() {
    print_header
    echo -e "\n${YELLOW}NewsGlide Project Directories:${NC}\n"

    echo -e "${GREEN}✓ ACTIVE:${NC} /Users/elliotgreenbaum/NewsGlide Sep 2025 ${BLUE}(Port 3000)${NC}"
    echo -e "${YELLOW}⚠ OLD:${NC}    /Users/elliotgreenbaum/Newsglide ${BLUE}(Port 8080)${NC}"
    echo -e "${RED}✗ UNUSED:${NC} /Users/elliotgreenbaum/NewsGlide Rebuilt"
    echo -e "${RED}✗ UNUSED:${NC} /Users/elliotgreenbaum/Downloads/NewsGlide Cursor:CC"

    echo -e "\n${YELLOW}⚡ Always use:${NC} ${GREEN}/Users/elliotgreenbaum/NewsGlide Sep 2025${NC}"
    echo ""
}

show_help() {
    print_header
    echo ""
    echo "Usage: ./scripts/port-manager.sh [command]"
    echo ""
    echo "Commands:"
    echo "  check       - Check which ports are in use"
    echo "  kill        - Kill all processes on dev ports"
    echo "  clean       - Kill all Vite dev servers"
    echo "  projects    - Show all NewsGlide project directories"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/port-manager.sh check"
    echo "  ./scripts/port-manager.sh kill"
    echo "  npm run ports:check"
    echo "  npm run ports:kill"
    echo ""
}

# Main script logic
case "${1:-help}" in
    check)
        check_ports
        ;;
    kill)
        kill_all_ports
        ;;
    clean)
        kill_dev_servers
        ;;
    projects)
        show_projects
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}\n"
        show_help
        exit 1
        ;;
esac
