/**
 * How an attacker reaches the vulnerable code.
 * Multi-value — a single finding can span multiple surfaces.
 * Aligned to how researchers describe entry points in write-ups.
 */
export type AttackSurface =
  | "heap"           // heap allocator, use-after-free, heap spray, tcache
  | "stack"          // stack overflow, stack pivot, ROP
  | "parser"         // file format or protocol parser (images, PDFs, packets)
  | "network"        // unauthenticated network-facing, remote code execution
  | "ipc"            // inter-process communication: D-Bus, Binder, Mach ports
  | "filesystem"     // path traversal, race condition (TOCTOU), symlink attacks
  | "api"            // exposed API surface: REST, GraphQL, syscall interface
  | "supply-chain"   // dependency, package, or build-time attack surface
  | "logic"          // authentication bypass, IDOR, business logic flaws
  | "side-channel";  // timing, cache, speculative execution (Spectre-class)
