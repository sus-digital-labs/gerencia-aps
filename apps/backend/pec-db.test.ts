import { describe, it, expect } from "vitest";
import { queryPEC, getReplicaStatus } from "./pec-db";

// Run against an explicitly configured test PEC. Connectivity failures must fail this suite.
describe.skipIf(process.env.SUS_TEST_PEC_INTEGRATION !== "1")("PEC Database Connection", () => {
  it("reports a connected replica", async () => {
    const status = await getReplicaStatus();
    expect(status).toMatchObject({ status: "connected" });
  }, 15_000);

  it("queries the test database", async () => {
    const [result] = await queryPEC("SELECT NOW() as server_time, current_database() as db_name");
    expect(result).toHaveProperty("server_time");
    expect(result).toHaveProperty("db_name");
  }, 15_000);

  it.each(["tb_cidadao", "tb_atend", "tb_equipe", "tb_unidade_saude"])(
    "can read %s",
    async table => {
      const [result] = await queryPEC(`SELECT 1 AS present FROM ${table} LIMIT 1`);
      expect(result?.present).toBe(1);
    },
    15_000,
  );
});
