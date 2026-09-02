# Adaptive Edge runtime P0

`adaptive-run` reuses durable RAW by municipality, source table and source
snapshot before opening PostgreSQL. A missing RAW is captured with one
read-only `SELECT`; restart, fallback and command rearm do not query PEC.

The planner persists hysteresis and cooldown state. It profiles the Edge,
selects RAW, NORMALIZED or MATERIALIZED, starts deriving the selected local
candidate from durable RAW, then pauses at the configured observation hook so
an external harness can apply real resource pressure. A second real profile can
downgrade the selection. In that case the already-derived candidate bytes are
discarded and the original RAW is packaged and sent. This is cancellation at a
safe boundary after candidate derivation; it is not preemption in the middle of
the rule formula. Evidence reports `candidateComputeStarted`,
`candidateComputeAborted`, both planner decisions and both governor actions.

Each `(raw_delta_id, processing_mode)` has a separate encrypted delivery row.
The exact staged envelope bytes, content hash and idempotency key are replayed
after restart. ACK of one mode never confirms, deletes or suppresses RAW or a
different mode. `REPROCESS_SCOPE` only rearms an existing staged delivery to
pending, preserving its bytes and hashes; it rejects incomplete scope or a
missing delivery.

Thresholds in the bootstrap policy are explicitly conservative placeholders.
Production values require a named, versioned benchmark calibration and central
policy. No runtime observation silently mutates those thresholds.
