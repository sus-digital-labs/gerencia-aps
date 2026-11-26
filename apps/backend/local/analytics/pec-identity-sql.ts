export const validCpf = (field: string) => `CASE WHEN ${field} ~ '^[0-9]{11}$'
  AND translate(${field}, left(${field}, 1), '') <> '' THEN (
    SELECT (10 * sum(digit * (11 - i)) FILTER (WHERE i < 10)) % 11 % 10 = substr(${field}, 10, 1)::int
      AND (10 * sum(digit * (12 - i))) % 11 % 10 = substr(${field}, 11, 1)::int
    FROM generate_series(1, 10) i CROSS JOIN LATERAL (SELECT substr(${field}, i, 1)::int AS digit) digits
  ) ELSE false END`;

export const validCns = (field: string) => `CASE WHEN ${field} ~ '^[12789][0-9]{14}$' THEN (
    SELECT sum(substr(${field}, i, 1)::int * (16 - i)) % 11 = 0 FROM generate_series(1, 15) i
  ) ELSE false END`;

// A chave é usada somente no SQL. A reconciliação da identidade depende do CadSUS.
export const pecLocalPerson = (alias: string) => `CASE WHEN NULLIF(btrim(${alias}.no_cidadao), '') IS NOT NULL THEN
    CASE WHEN ${validCpf(`btrim(${alias}.nu_cpf)`)} THEN 'cpf:' || btrim(${alias}.nu_cpf)
      WHEN ${validCns(`btrim(${alias}.nu_cns)`)} THEN 'cns:' || btrim(${alias}.nu_cns) END
  END`;
