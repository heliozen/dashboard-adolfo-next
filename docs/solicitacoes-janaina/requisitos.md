# Solicitações — Painel de Indicadores (Janaína)

> Documento estruturado a partir de anotações manuscritas (5 fotos, sendo 1 folha repetida).
> Contexto: papel timbrado do **XXIII Congresso do COSEMS-CE**. Trata-se de um levantamento
> de requisitos para um **painel de indicadores (dashboard) gerencial** de uma rede de
> laboratórios/clínicas de saúde com postos em **Iguatu, Acopiara e Várzea Alegre (CE)**.
>
> ⚠️ Itens marcados com **(?)** têm leitura incerta no manuscrito e precisam de confirmação.

---

## 1. Painel Diário

> **Nota:** os indicadores de **Faturamento** e **Pagamento a médicos** foram removidos
> deste levantamento — já existem em outro painel.

**Orçamento**

| Realizados | Pendentes |
|:----------:|:---------:|
|    X $     |    X $     |

Outros indicadores da folha:
- **Nº de Atendimentos** (por categoria)
- **Tempo de espera** por categoria
- **Nota de Atendimento** — avaliação que o **paciente** dá no **tablet** _(fonte: banco atual, schema `ponto`)_

---

## 2. Ticket Médio Diário

Ticket médio diário separado por categoria:
- Consulta
- Exame
- Imagem
- Ultrassom

**Agendas médicas**
- Nº de cancelamentos (X cancelados)
- Pacientes atendidos: Exames / Consultas → **percentual por categoria**

**Tempo médio de espera por categoria**
- Consulta
- Lab (laboratório)
- Imagem
- Ultra(ssom)

---

## 3. Produtividade Médica

- **Exames solicitados**

**Laboratório**
- **Recoleta** — percentual de recoleta **por motivo** _(fonte: banco **Autolac** — acesso a definir)_
- **Taxa de amostra rejeitada** — com **motivo** e **posto**

**Nota dos tablets de Atendimento**
- Visível / Diário
- Avaliação que o **paciente** dá no **tablet** _(fonte: banco atual, schema `ponto`)_

**Orçamento × Fechados × Atendente** — por posto:
- Iguatu
- Acopiara
- Várzea Alegre

> **"Fechados"** = orçamentos por **status de faturamento** por atendente:
> **faturados**, **parcialmente faturados** e **pendentes**.

---

## 4. Pessoas / Laboratório

**Pessoas**
- Atrasos
- Faltas

**Laboratório / Recoleta**

| Exame | Pendentes | Entrega |
|:-----:|:---------:|:-------:|
|   X   |     X     |    X    |

---

## Resumo dos Indicadores

| # | Área              | Indicadores principais                                              |
|---|-------------------|---------------------------------------------------------------------|
| 1 | Painel Diário     | Nº de atendimentos, orçamento, tempo de espera, nota de atendimento |
| 2 | Ticket Médio      | Ticket por categoria, agendas/cancelamentos, % atendidos, tempo médio de espera |
| 3 | Produtividade     | Exames solicitados, recoleta %, taxa de amostra rejeitada, nota dos tablets, orçamento × fechados por posto |
| 4 | Pessoas/Lab       | Atrasos, faltas, exames pendentes/entrega                           |

## Categorias de serviço recorrentes
- Consulta
- Exame
- Imagem
- Ultrassom
- Laboratório (recoleta / amostras)

## Postos / Unidades
- Iguatu
- Acopiara
- Várzea Alegre

---

## Pontos a confirmar
- [x] "Recoleta % por ___" — é **percentual de recoleta por motivo** (fonte: banco Autolac, acesso a definir)
- [x] Significado de "Fechados" em *Orçamento × Fechados × Atendente* — orçamentos por **status de faturamento** (faturados / parcialmente faturados / pendentes) por atendente
- [x] "Nota de Atendimento" e "Nota dos tablets" — avaliações que o **paciente** dá no **tablet**; já existem no **banco atual** (schema `ponto`). Falta só localizar a tabela/campos e a escala exata
