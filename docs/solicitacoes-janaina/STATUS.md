# Status — Solicitações Janaína

Rastreador de progresso dos requisitos em [`requisitos.md`](./requisitos.md).
Legenda: ✅ feito · 🟡 parcial · ⬜ pendente · 🔒 bloqueado (falta fonte de dados / definição)

Última atualização: 2026-07-01

---

## Visão geral por bloco

| Bloco | Requisito | Status | Onde está / observação |
|-------|-----------|:------:|------------------------|
| **1. Painel Diário** | Orçamento: Realizados × Pendentes (R$) | ✅ | Seção **Orçamentos** (`/api/orcamento`): status por orçamento — Realizado / **Parcial** / Pendente, com valor + contagem, por `data_criacao` |
| 1 | Nº de Atendimentos por categoria | ✅ | Seção **Atendimentos** (atendidos/não realizados por grupo). Categoria = **grupo**, então já contempla Consulta/Exame/Imagem/Ultrassom |
| 1 | Tempo de espera por categoria | 🔒 | Sem fonte de dados identificada |
| 1 | Nota de Atendimento (avaliação do paciente no tablet) | ⬜ | Dados no **banco atual** (schema `ponto`). Falta localizar tabela/campos e a escala |
| **2. Ticket Médio Diário** | Ticket médio por categoria (Consulta, Exame, Imagem, Ultrassom) | ✅ | Seção **Ticket Médio** com toggle **Mensal/Diário** na Evolução (`diarioGrupo`/`diarioSubgrupo` em `/api/ticket-medio`). Ao ativar Diário com período > 31 dias, ajusta automaticamente para "30 dias" |
| 2 | Agendas médicas: nº de cancelamentos | ⬜ | Não existe |
| 2 | % pacientes atendidos por categoria | ✅ | Card **Comparecimento por Categoria** (`/api/comparecimento`): atendidos ÷ agendados por categoria, contando **pacientes distintos** (`COUNT(DISTINCT paciente_id)`) |
| 2 | Tempo médio de espera por categoria (Consulta/Lab/Imagem/Ultra) | 🔒 | Sem fonte de dados identificada |
| **3. Produtividade Médica** | Exames solicitados | ✅ | Seção **Solicitações Médicas** (`/api/solicitacoes`) |
| 3 | Recoleta — % por motivo | 🔒 | Base definida: **% de recoleta por motivo**. Seção foi construída e **removida** aguardando acesso ao banco **Autolac** |
| 3 | Taxa de amostra rejeitada (com motivo e posto) | 🔒 | Seção foi construída e **removida** aguardando fonte de dados |
| 3 | Nota dos tablets de atendimento | ⬜ | Mesma avaliação do paciente no tablet. Dados no **banco atual** (schema `ponto`) |
| 3 | Orçamento × Fechados × Atendente por posto (Iguatu, Acopiara, Várzea Alegre) | 🔒 | "Fechados" = orçamentos por **status** (faturado / parcialmente faturado / pendente) por atendente. Depende de dados por posto |
| **4. Pessoas / Laboratório** | Pessoas: Atrasos | 🔒 | Sem fonte de dados identificada |
| 4 | Pessoas: Faltas | 🔒 | Sem fonte de dados identificada |
| 4 | Laboratório/Recoleta: Exame · Pendentes · Entrega | 🔒 | Depende dos dados de recoleta (mesmo bloqueio do item 3) |

---

## Resumo

**✅ Feito (5)**
- Exames solicitados (Solicitações Médicas)
- Ticket médio por categoria (Mensal + Diário)
- % pacientes atendidos por categoria (Comparecimento por Categoria)
- Nº de atendimentos por categoria (categoria = grupo)
- Orçamento: Realizados × Pendentes (R$)

**⬜ Pendente, sem bloqueio de dados (2)** — dá para construir com o que já temos
- Agendas médicas: nº de cancelamentos
- Nota de Atendimento / Nota dos tablets (avaliação do paciente — banco atual)

**🔒 Bloqueado (7)** — falta fonte de dados e/ou definição
- Tempo de espera (Painel Diário e Ticket Médio)
- Recoleta % e Taxa de amostra rejeitada (código já existiu, removido)
- Orçamento × Fechados × Atendente por posto
- Pessoas: Atrasos e Faltas
- Laboratório/Recoleta: Exame · Pendentes · Entrega

---

## Implementado

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
| `/painel-diario` (raiz redireciona pra cá) | Orçamentos, Atendimentos |
| `/ticket-medio` | Ticket Médio (mensal/diário), Comparecimento |
| `/produtividade` | Solicitações Médicas |
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
- [x] "Nota de Atendimento" e "Nota dos tablets" — avaliações que o **paciente** dá no **tablet**; já existem no **banco atual** (schema `ponto`). Falta só localizar a tabela/campos e a escala exata
- [ ] Orçamento "Realizado" = convertido em agendamento (atual) ou agendamento efetivamente realizado? Excluir algum convênio (ex.: 915)?

## Bloqueios técnicos a resolver

- [ ] Fonte de dados de **tempo de espera** por categoria
- [ ] Fonte de dados de **cancelamentos** de agenda
- [ ] Acesso ao banco **Autolac** — fonte de **recoleta (% por motivo)** e **amostras rejeitadas** (motivo + posto)
- [ ] Como identificar **posto/unidade** (Iguatu, Acopiara, Várzea Alegre) nas tabelas
- [ ] Fonte de dados de **RH** (atrasos, faltas)
- [ ] Localizar no banco atual (schema `ponto`) a **tabela/campos das notas** dos tablets (avaliação do paciente) e a escala usada

---

## Nota — acesso ao banco Autolac

Os dados de **recoleta (% por motivo)** e **amostras rejeitadas** ficam no banco do
**Autolac** (sistema de laboratório), separado do banco atual do dashboard (schema `ponto`).
Ainda **não temos acesso definido** — é o bloqueio para reativar essas seções.

Perguntas a resolver antes de implementar:

- [ ] **Tipo de acesso**: conexão direta ao banco (Postgres/outro?), API/serviço do Autolac, ou export periódico (CSV/dump)?
- [ ] **Credenciais/host**: onde fica o banco (host, porta, rede/VPN) e como obter usuário/senha?
- [ ] **Modelo de dados**: nome das tabelas/campos de recoleta (data, motivo, exame, posto) e de amostra rejeitada (motivo, posto).
- [ ] **Chave de ligação**: como cruzar Autolac × banco atual (paciente, exame, posto/unidade)?
- [ ] **Atualização**: dados em tempo real (query direta) ou sincronização/ETL agendada?

Definido isso, adicionar a conexão em `src/lib/db.ts` (ou um novo cliente dedicado ao Autolac)
e recriar as rotas `/api/recoletas` e `/api/amostras-rejeitadas` + as seções no dashboard
(o código já existiu e foi removido, dá para recuperar do histórico do git).
