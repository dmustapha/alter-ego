import { describe, it, expect } from "vitest";
import { classifyInbound, a2aAck } from "./envelope";

describe("classifyInbound (envelope shape wins)", () => {
  it("recognises an A2A system event", () => {
    const r = classifyInbound({ agentId: "6013", message: { source: "system", event: "JOB_CREATED", jobId: "j1" } });
    expect(r.kind).toBe("a2a-system");
    if (r.kind === "a2a-system") {
      expect(r.jobId).toBe("j1");
      expect(r.event).toBe("JOB_CREATED");
    }
  });
  it("recognises an A2A agent-chat envelope", () => {
    const r = classifyInbound({ msgType: "a2a-agent-chat", jobId: "j2", sender: { role: "USER_AGENT" } });
    expect(r.kind).toBe("a2a-chat");
    if (r.kind === "a2a-chat") {
      expect(r.senderRole).toBe("USER_AGENT");
    }
  });
  it("treats a plain analyze body as analyze, not envelope", () => {
    expect(classifyInbound({ address: "0xabc", chains: ["ethereum"] }).kind).toBe("analyze");
    expect(classifyInbound({ addresses: [{ address: "0xabc", chains: ["ethereum"] }] }).kind).toBe("analyze");
  });
  it("returns empty for a bodyless request", () => {
    expect(classifyInbound({}).kind).toBe("empty");
  });
  it("acks an A2A envelope with a well-formed response", () => {
    const ack = a2aAck({ kind: "a2a-system", agentId: "6013", event: "JOB_CREATED", jobId: "j1" }) as {
      jobId: string;
      status: string;
    };
    expect(ack.jobId).toBe("j1");
    expect(typeof ack.status).toBe("string");
  });
});
