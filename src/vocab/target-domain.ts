/**
 * Primary target domain for a threat intel record.
 * Derived from researcher disclosure cluster patterns — Project Zero, GHSL, elite researcher series.
 * Every record must have exactly one target_domain (primary classification).
 * Use `tags` for secondary domains when a finding spans multiple areas.
 * Prefix "emerging:" for new classes not yet promoted to a canonical value.
 */
export type TargetDomain =
  // Network & Protocol
  | "wifi-protocols"        // 802.11, WPA, mesh — Nitay's current CVE track
  | "network-protocols"     // TCP/IP, TLS, HTTP/2, QUIC, IETF-track protocols
  | "bluetooth"             // BLE, Classic BT, BR/EDR
  // OS & Kernel
  | "linux-kernel"          // kernel subsystems, eBPF, netfilter, IPC
  | "windows-kernel"        // NT kernel, win32k, driver model
  | "android-binder"        // Android IPC, Binder, Zygote, SELinux
  | "macos-xnu"             // XNU kernel, IOKit, Sandbox
  // Runtime & Engine
  | "v8-engine"             // Chrome/Node V8 JIT, Turbofan, heap
  | "python-runtime"        // CPython interpreter, C extensions, GIL
  | "jvm"                   // JVM, JIT, bytecode, deserialization
  | "llvm-clang"            // compiler toolchain, sanitizer bypass
  // Browser
  | "browser-sandbox"       // renderer sandbox escape, UXSS
  | "web-api"               // DOM, WebRTC, WebAssembly, browser storage
  // AI & ML
  | "llm-inference"         // model serving, inference APIs, prompt injection
  | "ai-supply-chain"       // model files, GGUF/ONNX parsers, training pipelines
  // Application Layer
  | "container-runtime"     // Docker, runc, containerd, Kubernetes
  | "supply-chain"          // package managers, dependency confusion, typosquatting
  | "blockchain-contracts"  // EVM, Solidity, DeFi protocol logic
  // Catch-all for records pending reclassification
  | `emerging:${string}`;   // e.g. "emerging:quantum-crypto" — promotes to canonical after 5+ records
