/**
 * Kill-chain position of the finding.
 * Aligned to MITRE ATT&CK tactic names (tactic IDs in comments).
 * Multi-value — a write-up may cover multiple stages (e.g. initial access + code execution).
 */
export type ChainStage =
  | "initial-access"        // TA0001 — first foothold, unauthenticated RCE
  | "execution"             // TA0002 — arbitrary code execution once inside
  | "persistence"           // TA0003 — survive reboot, establish backdoor
  | "privilege-escalation"  // TA0004 — local priv esc, kernel EoP
  | "defense-evasion"       // TA0005 — bypass ASLR, CFI, sandbox detection
  | "sandbox-escape"        // TA0005 subclass — browser/container/VM escape
  | "lateral-movement"      // TA0008 — pivot to adjacent systems
  | "exfiltration"          // TA0010 — data extraction primitive
  | "impact";               // TA0040 — DoS, data destruction, ransomware primitive
