# Segurança e privacidade territorial

A decisão de privacidade ocorre no Rust antes da serialização HTTP. Gestor e coordenador permanecem agregados/suprimidos. ACS só recebe exact point quando a policy permite e o request está no escopo autorizado. Auditor é agregado/suprimido por padrão; `AUDITOR` exige `TERRITORY_EXACT_POINT_AUDIT` derivado das permissões institucionais do BFF e protegido pelo body hash HMAC.

O evento de acesso usa `TERRITORY_EXACT_POINT_ACCESS`, ator opaco, role, reason code, request id, correlation id e escopo. Não registra coordenada. A capability é fail-closed: ausência ou manipulação no payload não concede exatidão.

A proteção cobre baixa cardinalidade, pontos residenciais, domicílios rurais isolados, contagens identificáveis e combinações de atributos. Dados clínicos não são atributos individuais de marker e permanecem fora do contrato territorial.

## Anti-secret e anti-PII

Scans devem bloquear atribuições de senha, connection strings com credencial, tokens, JWT, API keys, private keys, CPF, CNS, nomes, endereços reais e coordenadas individuais. A documentação e os smokes desta branch usam somente identificadores sintéticos e contagens agregadas. A credencial de homologação mencionada no transcript não é reproduzida; se ainda válida, o estado operacional é `SECRET_EXPOSURE_REQUIRES_ROTATION` e promoção deve permanecer bloqueada até rotação autorizada.

Guardrails: `RUNTIME_MODE=dry_run`, `PEC_WRITE_ALLOWED=false`, `GEOCODE_EXTERNAL_PROVIDER_ENABLED=false`, `external_calls_total=0`.
