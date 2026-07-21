// Inbound-shape classifier for POST /api/a2mcp. Envelope shape ALWAYS wins over analyze detection,
// per the okx-ai SKILL "Inbound envelope activation" table. The two A2A envelopes are acknowledged
// (the task lifecycle belongs to the OKX AI agent runtime); a plain analyze body runs the paid path.

export type Inbound =
  | { kind: "a2a-system"; agentId: string; event: string; jobId: string }
  | { kind: "a2a-chat"; jobId: string; senderRole: string }
  | { kind: "analyze"; addresses: Array<{ address: string; chains: string[] }> }
  | { kind: "empty" };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function classifyInbound(body: unknown): Inbound {
  const b = asRecord(body);

  // 1. A2A system event: { agentId, message: { source: "system", event, jobId } }
  const message = asRecord(b.message);
  if (message.source === "system") {
    return {
      kind: "a2a-system",
      agentId: String(b.agentId ?? ""),
      event: String(message.event ?? ""),
      jobId: String(message.jobId ?? ""),
    };
  }

  // 2. A2A agent-chat: { msgType: "a2a-agent-chat", jobId, sender: { role } }
  if (b.msgType === "a2a-agent-chat") {
    const sender = asRecord(b.sender);
    return { kind: "a2a-chat", jobId: String(b.jobId ?? ""), senderRole: String(sender.role ?? "") };
  }

  // 3. analyze body: addresses[] or a single address
  if (Array.isArray(b.addresses) && b.addresses.length > 0) {
    return { kind: "analyze", addresses: b.addresses as Array<{ address: string; chains: string[] }> };
  }
  if (typeof b.address === "string") {
    const chains = Array.isArray(b.chains) ? (b.chains as string[]) : ["ethereum"];
    return { kind: "analyze", addresses: [{ address: b.address, chains }] };
  }

  return { kind: "empty" };
}

export function a2aAck(
  inbound: Extract<Inbound, { kind: "a2a-system" | "a2a-chat" }>,
): object {
  const jobId = inbound.jobId;
  const agentId = inbound.kind === "a2a-system" ? inbound.agentId : undefined;
  return {
    jobId,
    agentId,
    status: "acknowledged",
    note: "Task lifecycle handled by the OKX AI agent runtime; this endpoint is the ASP listing target.",
  };
}
