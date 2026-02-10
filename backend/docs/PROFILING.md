# Performance Profiling Guide

This guide shows how to profile the Why backend to analyze performance, memory
usage, and identify bottlenecks.

## Quick Start

### 1. Start Backend with Profiling Enabled

```bash
# Using Docker Compose
make docker-up-profiling

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.profiling.yml up --build
```

This enables pprof endpoints at `http://localhost:8080/debug/pprof/`

### 2. Capture a Profile

```bash
# CPU profile (30 seconds)
make profile-cpu

# Heap memory snapshot
make profile-heap

# Goroutine profile
make profile-goroutine

# Capture all profiles at once
make profile-all
```

Profiles are saved to `./profiles/` directory.

### 3. Analyze the Profile

```bash
# Interactive terminal analysis
go tool pprof ./profiles/cpu_20260210_120000.prof

# Web UI (recommended)
make profile-serve FILE=./profiles/cpu_20260210_120000.prof
```

## Available Profiles

### CPU Profile

Captures where the CPU time is spent. Useful for identifying hot code paths.

```bash
# Capture 30 second CPU profile
make profile-cpu

# Capture 60 second profile
DURATION=60 ./profile.sh cpu

# View in browser
make profile-serve FILE=./profiles/cpu_*.prof
```

**When to use:** Finding slow functions, optimization targets

### Heap Profile

Shows memory allocations on the heap. Useful for finding memory leaks and
excessive allocations.

```bash
make profile-heap

# Compare two heap snapshots
./profile.sh compare ./profiles/heap_before.prof ./profiles/heap_after.prof
```

**When to use:** Memory leaks, high memory usage, allocation hotspots

### Goroutine Profile

Shows all current goroutines and their call stacks. Useful for finding goroutine
leaks.

```bash
make profile-goroutine
```

**When to use:** Goroutine leaks, concurrency issues

### Allocation Profile

Tracks all memory allocations (both stack and heap). More detailed than heap
profile.

```bash
./profile.sh allocs
```

**When to use:** Detailed allocation analysis, reducing GC pressure

### Block Profile

Shows where goroutines block on synchronization primitives.

```bash
./profile.sh block
```

**When to use:** Finding lock contention, slow channel operations

### Mutex Profile

Shows contention on mutexes.

```bash
./profile.sh mutex
```

**When to use:** Lock contention analysis

### Execution Trace

Records fine-grained execution trace. Shows goroutine scheduling, syscalls, GC
activity.

```bash
./profile.sh trace

# View trace
go tool trace ./profiles/trace_*.out
```

**When to use:** Understanding concurrency, GC behavior, scheduling issues

## Using the Profile Script

The `profile.sh` script provides convenient commands:

```bash
# Show help
./profile.sh help

# Capture profiles
./profile.sh cpu          # CPU profile
./profile.sh heap         # Heap profile
./profile.sh goroutine    # Goroutine profile
./profile.sh all          # All profiles

# Analyze profiles
./profile.sh serve cpu.prof              # Web UI
./profile.sh compare before.prof after.prof  # Compare profiles

# Custom duration
DURATION=60 ./profile.sh cpu

# Custom output directory
OUTPUT_DIR=/tmp/profiles ./profile.sh heap
```

## Analysis Techniques

### Web Interface (Recommended)

```bash
make profile-serve FILE=./profiles/cpu_20260210_120000.prof
```

Opens browser at `http://localhost:8081` with interactive flame graphs and call
graphs.

### Command Line

```bash
go tool pprof ./profiles/cpu_20260210_120000.prof

# Inside pprof:
(pprof) top          # Show top functions
(pprof) top10        # Show top 10
(pprof) list main    # Show source for main package
(pprof) web          # Generate graph (requires graphviz)
(pprof) pdf          # Generate PDF report
(pprof) help         # Show all commands
```

### Common pprof Commands

```
top              List top entries
top10            List top 10 entries
list <func>      Show annotated source for function
web              Open interactive graph in browser
pdf              Generate PDF report
png              Generate PNG image
svg              Generate SVG image
peek <func>      Show callers and callees of function
traces           Show sample traces
help             Show all commands
```

### Comparing Profiles

Compare before/after to measure improvements:

```bash
# Capture baseline
make profile-cpu
mv ./profiles/cpu_*.prof ./profiles/before.prof

# Make changes, then capture again
make profile-cpu
mv ./profiles/cpu_*.prof ./profiles/after.prof

# Compare
./profile.sh compare ./profiles/before.prof ./profiles/after.prof
```

## Load Testing with Profiling

Combine profiling with load testing:

```bash
# Terminal 1: Start with profiling
make docker-up-profiling

# Terminal 2: Start capturing CPU profile
make profile-cpu &

# Terminal 3: Generate load
./test-api.sh
# Or use hey, ab, wrk, etc.

# Terminal 2: Profile completes after 30s
# Analyze the results
make profile-serve FILE=./profiles/cpu_*.prof
```

## Production Considerations

### Security

Profiling endpoints expose internal application state. In production:

- Keep `ENABLE_PPROF=false` (default)
- Only enable temporarily for debugging
- Use firewall rules to restrict access
- Consider authentication for pprof endpoints

### Performance Impact

- CPU profiling: ~5% overhead
- Heap profiling: minimal overhead (samples)
- Goroutine profiling: minimal overhead
- Trace: significant overhead (10-30%)

For production profiling, use short durations and off-peak times.

### Remote Profiling

Profile a remote server:

```bash
# Port forward to remote server
ssh -L 8080:localhost:8080 user@server

# Then profile locally
make profile-cpu
```

## Tips and Best Practices

1. **Baseline First**: Always capture a baseline profile before optimizing

2. **Representative Load**: Profile under realistic load conditions

3. **Multiple Samples**: Take multiple profiles to account for variability

4. **Focus on Hot Paths**: Optimize the top 20% of functions that consume 80% of
   resources

5. **Profile Types**:
   - Start with CPU profile for performance issues
   - Use heap profile for memory issues
   - Use goroutine profile for leak detection
   - Use trace for concurrency analysis

6. **Compare**: Always compare before/after when making optimizations

7. **Don't Micro-optimize**: Focus on algorithmic improvements over
   micro-optimizations

## Examples

### Example 1: Finding CPU Bottleneck

```bash
# Start with profiling
make docker-up-profiling

# Generate load and capture profile
make profile-cpu &
./test-api.sh

# Analyze
make profile-serve FILE=./profiles/cpu_*.prof
# Look for hot functions in flame graph
```

### Example 2: Memory Leak Detection

```bash
# Capture initial heap
make profile-heap
mv ./profiles/heap_*.prof ./profiles/heap_start.prof

# Run application for a while
sleep 300

# Capture final heap
make profile-heap
mv ./profiles/heap_*.prof ./profiles/heap_end.prof

# Compare - shows what's growing
./profile.sh compare ./profiles/heap_start.prof ./profiles/heap_end.prof
```

### Example 3: Goroutine Leak

```bash
# Check goroutine count over time
watch -n 5 'curl -s http://localhost:8080/debug/pprof/goroutine | grep goroutine'

# If growing, capture profile
make profile-goroutine

# Analyze to find leaked goroutines
make profile-serve FILE=./profiles/goroutine_*.prof
```

## Resources

- [Go pprof Documentation](https://pkg.go.dev/runtime/pprof)
- [Profiling Go Programs](https://go.dev/blog/pprof)
- [Execution Tracer](https://go.dev/doc/diagnostics)
- [Dave Cheney's Profiling Guide](https://dave.cheney.net/high-performance-go-workshop/gopherchina-2019.html)

## Troubleshooting

**Problem**: Profiling endpoints not accessible

**Solution**: Make sure `ENABLE_PPROF=true` is set

**Problem**: `go tool pprof` not found

**Solution**: Install Go: `brew install go` (macOS) or download from golang.org

**Problem**: Web view doesn't open

**Solution**: Install graphviz: `brew install graphviz` (macOS)

**Problem**: Profile shows no data

**Solution**: Ensure application is under load during profiling
