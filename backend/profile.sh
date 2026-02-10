#!/bin/bash

# Go Profiling Helper Script
# This script helps capture and analyze various types of profiles

set -e

PPROF_URL="${PPROF_URL:-http://localhost:8080}"
OUTPUT_DIR="${OUTPUT_DIR:-./profiles}"
DURATION="${DURATION:-30}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$OUTPUT_DIR"

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

show_usage() {
    cat << EOF
Go Profiling Helper Script

Usage: $0 [COMMAND]

Commands:
    cpu         Capture CPU profile (${DURATION}s)
    heap        Capture heap memory profile
    goroutine   Capture goroutine profile
    allocs      Capture memory allocation profile
    block       Capture block contention profile
    mutex       Capture mutex contention profile
    trace       Capture execution trace (${DURATION}s)
    all         Capture all profiles
    serve       Start pprof web interface
    compare     Compare two profiles

Environment Variables:
    PPROF_URL   Base URL for pprof endpoints (default: http://localhost:8080)
    OUTPUT_DIR  Directory for profile outputs (default: ./profiles)
    DURATION    Duration for CPU/trace profiles in seconds (default: 30)

Examples:
    $0 cpu                                    # Capture 30s CPU profile
    DURATION=60 $0 cpu                        # Capture 60s CPU profile
    $0 heap                                   # Capture heap snapshot
    $0 serve cpu.prof                         # View CPU profile in browser
    $0 compare cpu1.prof cpu2.prof            # Compare two profiles

EOF
}

check_pprof_enabled() {
    if ! curl -s "${PPROF_URL}/debug/pprof/" > /dev/null 2>&1; then
        echo "Error: pprof endpoints not accessible at ${PPROF_URL}/debug/pprof/"
        echo "Make sure the server is running with ENABLE_PPROF=true"
        exit 1
    fi
}

capture_cpu() {
    print_header "Capturing CPU Profile"
    print_info "Duration: ${DURATION} seconds"
    print_info "URL: ${PPROF_URL}/debug/pprof/profile?seconds=${DURATION}"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/cpu_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/profile?seconds=${DURATION}" -o "${OUTPUT_FILE}"

    print_success "CPU profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "Analyze with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
    echo "  go tool pprof -http=:8081 ${OUTPUT_FILE}"
}

capture_heap() {
    print_header "Capturing Heap Profile"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/heap_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/heap" -o "${OUTPUT_FILE}"

    print_success "Heap profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "Analyze with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
    echo "  go tool pprof -http=:8081 ${OUTPUT_FILE}"
}

capture_goroutine() {
    print_header "Capturing Goroutine Profile"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/goroutine_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/goroutine" -o "${OUTPUT_FILE}"

    print_success "Goroutine profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "View with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
    echo "  go tool pprof -http=:8081 ${OUTPUT_FILE}"
}

capture_allocs() {
    print_header "Capturing Allocation Profile"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/allocs_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/allocs" -o "${OUTPUT_FILE}"

    print_success "Allocation profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "Analyze with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
}

capture_block() {
    print_header "Capturing Block Profile"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/block_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/block" -o "${OUTPUT_FILE}"

    print_success "Block profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "Analyze with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
}

capture_mutex() {
    print_header "Capturing Mutex Profile"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/mutex_${TIMESTAMP}.prof"

    curl -s "${PPROF_URL}/debug/pprof/mutex" -o "${OUTPUT_FILE}"

    print_success "Mutex profile saved to: ${OUTPUT_FILE}"
    echo ""
    echo "Analyze with:"
    echo "  go tool pprof ${OUTPUT_FILE}"
}

capture_trace() {
    print_header "Capturing Execution Trace"
    print_info "Duration: ${DURATION} seconds"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="${OUTPUT_DIR}/trace_${TIMESTAMP}.out"

    curl -s "${PPROF_URL}/debug/pprof/trace?seconds=${DURATION}" -o "${OUTPUT_FILE}"

    print_success "Trace saved to: ${OUTPUT_FILE}"
    echo ""
    echo "View with:"
    echo "  go tool trace ${OUTPUT_FILE}"
}

capture_all() {
    print_header "Capturing All Profiles"

    capture_heap
    capture_goroutine
    capture_allocs
    capture_block
    capture_mutex

    print_header "Summary"
    print_success "All profiles saved to: ${OUTPUT_DIR}/"
    ls -lh "${OUTPUT_DIR}/"
}

serve_profile() {
    if [ -z "$1" ]; then
        echo "Error: Please specify a profile file"
        echo "Usage: $0 serve <profile-file>"
        exit 1
    fi

    if [ ! -f "$1" ]; then
        echo "Error: Profile file not found: $1"
        exit 1
    fi

    print_header "Starting pprof Web Interface"
    print_info "Profile: $1"
    print_info "Opening browser at http://localhost:8081"

    go tool pprof -http=:8081 "$1"
}

compare_profiles() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo "Error: Please specify two profile files to compare"
        echo "Usage: $0 compare <profile1> <profile2>"
        exit 1
    fi

    if [ ! -f "$1" ] || [ ! -f "$2" ]; then
        echo "Error: One or both profile files not found"
        exit 1
    fi

    print_header "Comparing Profiles"
    print_info "Base: $1"
    print_info "Diff: $2"

    go tool pprof -base="$1" "$2"
}

# Main command handling
case "${1:-}" in
    cpu)
        check_pprof_enabled
        capture_cpu
        ;;
    heap)
        check_pprof_enabled
        capture_heap
        ;;
    goroutine)
        check_pprof_enabled
        capture_goroutine
        ;;
    allocs)
        check_pprof_enabled
        capture_allocs
        ;;
    block)
        check_pprof_enabled
        capture_block
        ;;
    mutex)
        check_pprof_enabled
        capture_mutex
        ;;
    trace)
        check_pprof_enabled
        capture_trace
        ;;
    all)
        check_pprof_enabled
        capture_all
        ;;
    serve)
        serve_profile "$2"
        ;;
    compare)
        compare_profiles "$2" "$3"
        ;;
    ""|help|--help|-h)
        show_usage
        ;;
    *)
        echo "Error: Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
