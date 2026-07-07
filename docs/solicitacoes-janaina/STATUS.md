# Status — Solicitações Janaína

Rastreador de progresso dos requisitos em [`requisitos.md`](./requisitos.md).
Legenda: ✅ feito · 🟡 parcial · ⬜ pendente · 🔒 bloqueado (falta fonte de dados / definição)

Última atualização: 2026-07-01

---

## Visão geral por bloco

| Bloco | Requisito | Status | Onde está / observação |
|-------|-----------|:------:|------------------------|
| **1. Painel Diário** | Orçamento: Realizados × Pendentes (R$) | ✅ | Seção **Orçamentos** (`/api/orcamento`): status por orçamento — Realizado / **Parcial** / Pendente, com valor + contagem, por `data_criacao` |
| 1 | Nº de Atendimentos por categoria | ✅ | Seção **Atendimentos** (atendidos/não realizados por grupo). Categoria = **grupo**, então já contempla Consulta/Exame/Imagem/Ultrassom. **Não realizado** só conta agendamentos com `data < hoje`; os de data futura entram como **pendentes** (não contabilizados) |
| 1 | Tempo de espera por categoria | 🔒 | Sem fonte de dados identificada |
| 1 | Nota de Atendimento (avaliação do paciente no tablet) | ✅ | Seção **Nota de Atendimento** (rota `/nota-atendimento`, `/api/nota-atendimento`): nota do guichê por operador (`tb_toten_senhas_nova_avaliacao` × `tb_toten_senhas_nova.operador_chamada` × `tb_operador`), escala 1–5, 0 = não respondida |
| **2. Ticket Médio Diário** | Ticket médio por categoria (Consulta, Exame, Imagem, Ultrassom) | ✅ | Seção **Ticket Médio** com toggle **Mensal/Diário** na Evolução (`diarioGrupo`/`diarioSubgrupo` em `/api/ticket-medio`). Ao ativar Diário com período > 31 dias, ajusta automaticamente para "30 dias" |
| 2 | Agendas médicas: nº de cancelamentos | ✅ | Seção **Cancelamentos** em `/painel-diario` (`/api/cancelamentos`): total, por **motivo** e por **médico**. Fonte: `tb_ambulatorio_atendimentos_cancelamento` × `tb_ambulatorio_cancelamento` (motivo) × `tb_operador` |
| 2 | % pacientes atendidos por categoria | ✅ | Card **Comparecimento por Categoria** (`/api/comparecimento`): atendidos ÷ agendados por categoria, contando **pacientes distintos** (`COUNT(DISTINCT paciente_id)`) |
| 2 | Tempo médio de espera por categoria (Consulta/Lab/Imagem/Ultra) | 🔒 | Sem fonte de dados identificada |
| **3. Produtividade Médica** | Exames solicitados | ✅ | Seção **Solicitações Médicas** (`/api/solicitacoes`) |
| 3 | Recoleta — % por motivo | ✅ | Seção **Recoletas** na rota própria `/recoleta` (`/api/recoletas`): % por motivo + tabelas por usuário e por exame. Fonte: **Autolac** (SQL Server, `SOLICITACAO_RECOLETA` × `MOTIVO_RECOLETA`) |
| 3 | Taxa de amostra rejeitada (com motivo e posto) | ✅ | Mesma fonte da recoleta: cada recoleta = amostra rejeitada (o `MOTIVO` é o motivo da rejeição). Na seção **`/recoleta`**: KPI **taxa de rejeição** (recoletas ÷ solicitações) + tabela **por posto** (com motivo já coberto pelo % por motivo) |
| 3 | Nota dos tablets de atendimento | ✅ | Mesma avaliação do paciente no tablet → coberta pela seção **Nota de Atendimento** (`/nota-atendimento`). Inclui médias por dimensão (pré-atendimento, recepcionista, instalações, guichê) |
| 3 | Orçamento × Fechados × Atendente por posto (Iguatu, Acopiara, Várzea Alegre) | ✅ | Seção **Orçamentos** (`/painel-diario`, `/api/orcamento`): `porOperador` cruza cadastro (orçamentos feitos + valor orçado) × efetivação (itens efetivados + valor efetivado) por atendente; "Fechados" = status realizado/parcial/pendente; **por posto** via filtro de unidade do topo (`empresa_id`) |
| **4. Pessoas / Laboratório** | Pessoas: Atrasos | 🔒 | Sem fonte de dados identificada |
| 4 | Pessoas: Faltas | 🔒 | Sem fonte de dados identificada |
| 4 | Laboratório/Recoleta: Exame · Pendentes · Entrega | 🔒 | Depende dos dados de recoleta (mesmo bloqueio do item 3) |

---

## Resumo

**✅ Feito (10)**
- Agendas médicas: nº de cancelamentos (por motivo e por médico)
- Recoleta — % por motivo (+ por usuário e por exame) — banco Autolac
- Taxa de amostra rejeitada (com motivo e posto) — banco Autolac (mesma fonte da recoleta)
- Nota de Atendimento / Nota dos tablets (avaliação do paciente no guichê, por operador)
- Orçamento × Fechados × Atendente (por atendente; por posto via filtro de unidade)
- Exames solicitados (Solicitações Médicas)
- Ticket médio por categoria (Mensal + Diário)
- % pacientes atendidos por categoria (Comparecimento por Categoria)
- Nº de atendimentos por categoria (categoria = grupo)
- Orçamento: Realizados × Pendentes (R$)

**⬜ Pendente, sem bloqueio de dados (0)**

**🔒 Bloqueado (4)** — falta fonte de dados e/ou definição
- Tempo de espera (Painel Diário e Ticket Médio)
- Pessoas: Atrasos e Faltas
- Laboratório/Recoleta: Exame · Pendentes · Entrega

---

## Implementado

### Cancelamentos + correção de "Não Realizados" (2026-07-07)

- **Correção do "Não Realizados"** (`/api/atendimentos`): agendamentos com **data futura** não
  são mais contados como não realizados. `nao_realizados` = `realizada IS DISTINCT FROM true AND
  ae.data < CURRENT_DATE`; os de `data >= CURRENT_DATE` viram `pendentes` (retornados nos totais,
  exibidos como nota na seção, fora do cálculo da taxa). Antes, `realizada != true` sozinho inflava
  o balde com agendamentos que ainda vão acontecer.
- **Cancelamentos** (item "Agendas médicas: nº de cancelamentos"): fonte
  `tb_ambulatorio_atendimentos_cancelamento` (evento de cancelamento, com `agenda_exames_id`,
  `empresa_id`, `medico_id`, `ambulatorio_cancelamento_id`, `data_cadastro`). **Não** é derivável
  da agenda: os campos `cancelada`/`ambulatorio_cancelamento_id` em `tb_agenda_exames` estão sem
  uso. `/api/cancelamentos` retorna total, `porMotivo` (via `tb_ambulatorio_cancelamento`) e
  `porMedico` (via `tb_operador`), por período (`data_cadastro`) e unidade (`empresa_id`).
- **Frontend**: `src/components/sections/cancelamentos.tsx` renderizado em `/painel-diario`
  (Orçamentos/Atendimentos), abaixo de Atendimentos — KPI total + tabelas por motivo e por médico.
- **Grão**: cada linha é **um agendamento/vaga** (`agenda_exames_id`, paciente + procedimento),
  não a agenda inteira. A contagem é por **evento** de cancelamento — uma mesma vaga pode ser
  cancelada mais de uma vez (recancelamento), então nº de eventos > nº de vagas distintas (~3%).
- **Observação de dado**: a maioria dos motivos é administrativa (Duplicidade, Cadastro Inadequado)
  e boa parte dos cancelamentos vem "Sem Médico" (exames sem médico vinculado). O card por médico
  tem toggle **"Apenas com médico"** para ocultar essa linha.

### Nota de Atendimento — avaliação do paciente no tablet (2026-07-07)

- **Backend** `src/app/api/nota-atendimento/route.ts` (banco atual, schema `ponto`):
  `tb_toten_senhas_nova_avaliacao` (nota em `vlr_pontuacao`, escala 1–5, `data_cadastro`) ×
  `tb_toten_senhas_nova` (`operador_chamada` = operador avaliado, `empresa_id` = unidade) ×
  `tb_operador` (nome). Filtra por período (`data_cadastro`) e unidade (`empresa_id`), e
  **exclui `vlr_pontuacao = 0`** (0 = não respondida). Retorna `mediaGeral`, `avaliacoes`,
  `distribuicao` (1–5), `porOperador` e `porDimensao`.
- **Dimensões** (`tb_tipo_avaliacao`): 1=Pré Atendimento, 2=Recepcionista, 3=Instalações/Ambiente,
  4=**Atendimento Guichê**. Cada senha gera as 4, mas só o **guichê** é respondido de forma
  consistente (~5,5k) — é a "nota principal", calculada **por operador**. As outras 3 (esparsas,
  ~260 cada) entram só como médias gerais na tabela "Médias por Dimensão".
- **Frontend** `src/components/sections/nota-atendimento.tsx` (rota própria `/nota-atendimento`,
  item **Nota de Atendimento** no menu): 3 KPIs (nota média, nº de avaliações, % nota 5),
  gráfico horizontal de nota média por operador (eixo fixo 0–5, top 30), tabela por operador e
  tabela de médias por dimensão (com selo "principal" no guichê).
- **Ordenação**: operadores por nota desc; a coluna de nº de avaliações fica visível para dar
  contexto de amostra (evita ler "5,00 de 1 avaliação" como melhor que "4,99 de 1.900").

### Recoleta — % por motivo (banco Autolac) (2026-07-07)

- **Conexão nova**: `src/lib/autolac.ts` — cliente **SQL Server** (`mssql`) dedicado ao banco
  **Autolac** (`ADOLFOLUTZ`), separado do Postgres (`db.ts`). Configurado por `AUTOLAC_*` no
  `.env.local` (host/porta/db/user/senha), acesso via **VPN**.
- **Backend** `src/app/api/recoletas/route.ts`: consulta `SOLICITACAO_RECOLETA` × `MOTIVO_RECOLETA`
  (`MOTIVO` → `MOTIVO_RECOLETA.ID`, descrição em `DESCRICAO`) filtrando por `DATA` no período.
  Retorna `total`, `porMotivo`, `porUsuario`, `porPosto` e `porExame` (contagem + %); aceita filtro
  opcional `local` (posto). `EXAMES` é texto com
  códigos separados por vírgula — expandido no backend (denominador de exame = total de exames,
  não de recoletas, pois uma recoleta pode ter vários).
- **Taxa de amostra rejeitada** (item 3): cada recoleta **é** uma amostra rejeitada, então usa a
  mesma fonte. Denominador = total de solicitações no posto/período (`SOLICITACAO`, por `DATA`).
  A rota retorna `solicitacoes`, `taxaRejeicao` (recoletas ÷ solicitações) e, em `porPosto`,
  `recoletas`/`solicitacoes`/`taxa` por posto. Ressalva: numerador filtra por `SOLICITACAO_RECOLETA.DATA`
  e denominador por `SOLICITACAO.DATA` (mesma janela); como rejeição é rara (~1-5%) e o intervalo
  coleta→recoleta é curto, o desvio é desprezível. Taxa geral ~1,26% em 12 meses.
- **Frontend** `src/components/sections/recoletas.tsx` (rota própria `/recoleta`, item **Recoleta** no menu lateral):
  3 KPIs (recoletas, solicitações, **taxa de rejeição**), gráfico horizontal **% por motivo**,
  tabela por motivo, tabela **Taxa de Rejeição por Posto** (recoletas/solicitações/taxa) e tabelas
  por **usuário** e por **exame** (responsivas: cards no mobile, tabela no desktop).
- **Posto/unidade**: obtido por `SOLICITACAO_RECOLETA.SOLICITACAO_ID → SOLICITACAO.LOCAL → LOCAL`.
  A seção tem **seletor de posto próprio** (todos os postos do Autolac que têm recoleta — 24 no
  total, via `/api/recoletas/locais`), **independente** do filtro de unidade do topo. Motivo:
  o Autolac atende muito mais postos que as 3 unidades do dashboard (Iguatu=01/02, Acopiara=04,
  Várzea Alegre=06 são só ~26% das recoletas; os demais — Jucás, Icó, Óros, etc. — ficariam de
  fora se amarrássemos às 3 unidades). Default = "Todos os postos", com quebra "por posto"; ao
  selecionar um posto específico surge um botão **"Limpar"** que volta para "Todos os postos".
- **Qualidade de dado (origem)**: `MOTIVO_RECOLETA` tem descrições redundantes cadastradas como
  motivos distintos (ex.: "RECOLETA", "Recoleta para confirmação de resultados.", "Recoleta para
  confirmacao."). Aparecem separadas por serem IDs diferentes; **não** há normalização automática
  (candidato a um mapa de-para se a Janaína quiser consolidar).

### Arquitetura: dashboard dividido em rotas com menu lateral (2026-07-01)

O `src/components/dashboard.tsx` monolítico foi **removido** e o dashboard passou a usar o
**App Router** com um menu lateral. Estrutura:

- `src/app/(dashboard)/layout.tsx` — route group com layout compartilhado (sidebar + filtro
  de período global), que envolve as páginas com `PeriodProvider`.
- `src/components/dashboard-shell.tsx` — sidebar de navegação + filtro de período (topo).
- `src/components/period-context.tsx` — `PeriodProvider`/`usePeriod`: estado de período
  (`dataInicio`/`dataFim`/`periodoAtivo` + `aplicarPeriodo`) compartilhado entre as rotas
  (preservado na navegação client-side pelo layout).
- `src/lib/dashboard-shared.ts` — utils/consts comuns (BRL, NUM, CHART_COLORS, PERIOD_PRESETS,
  formatMes, formatDia, getDefaultDates).
- `src/components/sections/*.tsx` — cada seção é um componente client que consome `usePeriod`
  e **busca só os próprios dados** (menos carga no banco por troca de período).

Rotas ↔ seções:

| Rota | Seções |
|------|--------|
| `/painel-diario` (raiz redireciona pra cá) | Orçamentos, Atendimentos, Cancelamentos |
| `/ticket-medio` | Ticket Médio (mensal/diário), Comparecimento |
| `/produtividade` | Solicitações Médicas |
| `/recoleta` | Recoletas (% por motivo, por posto/usuário/exame — Autolac) |
| `/nota-atendimento` | Nota de Atendimento (avaliação do paciente no tablet, por operador) |
| `/pessoas-lab` | Placeholder "em breve" (RH + Autolac) |

> Referências a `src/components/dashboard.tsx` nas notas abaixo agora correspondem aos
> componentes em `src/components/sections/`.

### Ajustes de UI e branding (2026-07-01)

- **Gráfico "Atendidos vs Não Realizados"** (`sections/atendimentos.tsx`): trocado o gráfico
  "borboleta" por **barras de proporção no estilo Orçamentos** — uma barra por grupo (e por
  médico), verde (Atendidos) / laranja (Não Realizados), com contagem e %. **Sempre ordenado
  da maior para a menor taxa de realização** (proporção de atendidos). A mesma ordenação vale
  para a tabela.
- **Menu**: item do Painel Diário renomeado para **"Orçamentos/Atendimentos"** (rota continua
  `/painel-diario`); fonte dos itens do menu reduzida para caber sem quebrar.
- **Logo Adolfo Lutz**: `public/logo-adolfo-lutz.png` na sidebar (desktop) e no header (mobile).
  Favicon = símbolo recortado da logo em `src/app/icon.png` (App Router); `favicon.ico` padrão
  removido.

### Ticket médio por categoria — Mensal + Diário (2026-07-01)

- **Backend** `src/app/api/ticket-medio/route.ts`: além da agregação mensal
  (`mensalGrupo`/`mensalSubgrupo`), passou a retornar a agregação diária
  `diarioGrupo`/`diarioSubgrupo` (chave por data `YYYY-MM-DD`).
- **Frontend** `src/components/dashboard.tsx`:
  - Estado `granularidade` (`"mensal" | "diario"`) e toggle de botões no card **Evolução**.
  - `lineData` escolhe a fonte conforme a granularidade; rótulo do eixo via `formatMes`/`formatDia`.
  - Eixo X no diário usa `interval="preserveStartEnd"` + `minTickGap` para não poluir.
  - `selecionarGranularidade`: ao ativar **Diário** com período > 31 dias, aplica o preset
    **"30 dias"** automaticamente (períodos já curtos são preservados). Voltar para Mensal
    não altera o período.
- Categorias (Consulta, Exame, Imagem, Ultrassom) = **grupos** (`tb_ambulatorio_grupo`).

### % pacientes atendidos por categoria — Comparecimento (2026-07-01)

- **Backend** `src/app/api/comparecimento/route.ts` (endpoint novo):
  por categoria (grupo), `atendidos` e `agendados` contados como **pacientes distintos**
  (`COUNT(DISTINCT ae.paciente_id)`) — nunca `COUNT(*)`, porque um paciente pode fazer
  vários procedimentos na mesma categoria. `taxa = atendidos ÷ agendados` (0–100% por categoria).
- **Frontend** `src/components/dashboard.tsx`: card **Comparecimento por Categoria** na seção
  Atendimentos (estado `compData`/`compLoading`, fetch próprio, barra horizontal com tooltip
  mostrando "N de M pacientes").
- **Decisão de métrica**: base = **comparecimento** (atendidos ÷ agendados _dentro_ de cada
  categoria), não participação no total — assim cada categoria fecha em 0–100% e não há
  distorção por overlap de pacientes entre categorias.
- Observação: como um paciente pode aparecer em mais de uma categoria, a soma de pacientes
  entre categorias pode exceder o total de pacientes do período (esperado).

### Orçamento por status: Realizado / Parcial / Pendente (R$) (2026-07-01)

- **Backend** `src/app/api/orcamento/route.ts` (endpoint novo): classifica cada **orçamento**
  criado no período (`tb_ambulatorio_orcamento.data_criacao`) pelo nº de itens que viraram
  agendamento (`agenda_exames_id`):
  - **Realizado** = todos os itens agendados · **Parcial** = alguns · **Pendente** = nenhum.
  - Retorna, por status, **contagem de orçamentos** e **valor total** (soma de `valor_total`
    dos itens ativos), mais o total geral.
  - Filtros: `empresa_id = 1`, `i.ativo = true`, `o.ativo = true`.
- **Frontend** `src/components/dashboard.tsx`: seção **Orçamentos** (estado `orcData`/`orcLoading`),
  4 KPIs (Realizados, Parciais, Pendentes, Total — cada um com valor + nº de orçamentos) e
  barra de proporção de 3 segmentos por valor.
- **Definição de "Realizado"** decidida pelos dados: o campo `realizada` do item de orçamento
  está sempre `false` (não é usado); o sinal confiável de conversão é o vínculo com a agenda
  (`agenda_exames_id`) — no item, `autorizado=true` coincide quase 1:1 com "tem agenda". Valor
  usado é `valor_total` (`valor_ajustado` vem quase sempre nulo).
- **Nota sobre "Parcial"**: só existe no nível do **orçamento** (mix de itens agendados/não).
  Optou-se por classificar cada orçamento (contagem + valor total do orçamento), em vez de
  ratear valor por item. Ordem de grandeza (12 meses): ~22k realizados, ~230 parciais, ~4,3k
  pendentes.
- **A confirmar com a Janaína**: se "Realizado" deve ser "orçamento convertido em agendamento"
  (atual) ou "agendamento efetivamente realizado" (`ae.realizada = true`); e se deve excluir
  algum convênio (ex.: 915, excluído em outros endpoints).

---

## Pontos a confirmar com a Janaína (do documento)

- [x] "Recoleta % por ___" — é **% de recoleta por motivo** (fonte: banco Autolac)
- [x] Significado de "Fechados" em *Orçamento × Fechados × Atendente* — orçamentos por **status de faturamento** (faturados / parcialmente faturados / pendentes) por atendente
- [x] "Nota de Atendimento" e "Nota dos tablets" — avaliações que o **paciente** dá no **tablet**; localizadas em `tb_toten_senhas_nova_avaliacao` (escala 1–5, guichê é a dimensão principal). **Implementadas** em `/nota-atendimento`
- [ ] Orçamento "Realizado" = convertido em agendamento (atual) ou agendamento efetivamente realizado? Excluir algum convênio (ex.: 915)?

## Bloqueios técnicos a resolver

- [ ] Fonte de dados de **tempo de espera** por categoria
- [ ] Fonte de dados de **cancelamentos** de agenda
- [x] Acesso ao banco **Autolac** — resolvido (SQL Server via VPN, `AUTOLAC_*` no `.env.local`). **Recoleta % por motivo** implementada; **amostras rejeitadas** (motivo + posto) ainda pendente de definir a tabela/fonte no Autolac
- [ ] Como identificar **posto/unidade** (Iguatu, Acopiara, Várzea Alegre) nas tabelas
- [ ] Fonte de dados de **RH** (atrasos, faltas)
- [x] Localizar no banco atual (schema `ponto`) a **tabela/campos das notas** dos tablets (avaliação do paciente) e a escala usada → `tb_toten_senhas_nova_avaliacao` (escala 1–5)

---

## Nota — acesso ao banco Autolac (resolvido)

Acesso **resolvido** (2026-07-07): banco **Autolac** = SQL Server `ADOLFOLUTZ`, conexão direta
via **VPN**, credenciais em `AUTOLAC_*` no `.env.local`. Cliente em `src/lib/autolac.ts` (`mssql`),
separado do Postgres (`db.ts`).

- **Recoleta (% por motivo)** e **Taxa de amostra rejeitada** → **feitos**, na seção `/recoleta`.
  Fonte única: `SOLICITACAO_RECOLETA` (cada recoleta = amostra rejeitada; `MOTIVO` = motivo da
  rejeição), com posto por `SOLICITACAO.LOCAL → LOCAL` e denominador da taxa em `SOLICITACAO`.
- **Chave de ligação Autolac × banco atual** (paciente/exame/unidade): ainda **não usada** — a
  seção de recoleta é auto-suficiente no Autolac. Só será necessária se algum indicador futuro
  precisar cruzar os dois bancos.
