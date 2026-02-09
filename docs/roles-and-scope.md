# Papéis e escopo de acesso

Este documento descreve o modelo de papéis (admin geral vs agência) e o escopo de dados no VizzoCheck.

## Admin geral (system_admin)

- **Definição:** Um ou mais usuários com acesso a **todas** as agências do sistema (visão e gestão global).
- **Identificação:** Usuário com `role = 'system_admin'` e `agency_id = NULL`.
- **Cadastro:** Não há cadastro público de admin geral; o primeiro usuário system_admin é criado via seed ou migration (não exposto no registro).
- **Uso no sistema:** O admin geral faz login na mesma tela de login; no painel, vê o item **Agências** no menu, seleciona uma agência para definir o contexto e então acessa dashboard, lojas, promotores, marcas, visitas, alocações e relatórios **no escopo da agência selecionada**. Pode trocar de agência a qualquer momento.
- **API:** Nas requisições, o escopo é informado via parâmetro `agency_id` (query ou body), quando aplicável.

## Agência (agency)

- **Definição:** A organização que faz login e tem escopo restrito aos **seus** dados: lojas (cadastradas por ela), e no futuro promotores e marcas vinculados por **convite**.
- **Identificação:** Usuário com `role = 'agency'` e `agency_id` preenchido (referência à tabela `agencies`).
- **Cadastro:** Via tela de registro: cria-se a agência e o primeiro usuário com role `agency` (não mais "admin da agência").
- **Lojas:** Responsabilidade exclusiva da agência — cada agência cadastra apenas **suas** lojas de atuação.
- **Promotores e marcas:** Hoje a agência vê todos os promotores e marcas vinculados a ela. Em histórias futuras, promotores e marcas entrarão no escopo da agência **somente via fluxo de convite** (convite da agência ou convite aceito pela agência).

## Promoter (promoter)

- Usuário que atua como promotor de visitas; está vinculado a uma agência (`users.agency_id`) e acessa o painel do promotor (visitas, ganhos, etc.), não o painel admin/agência.

## Resumo

| Papel         | agency_id   | Escopo de dados |
|---------------|-------------|------------------|
| system_admin  | NULL        | Todas as agências (contexto escolhido no painel) |
| agency        | obrigatório | Apenas sua agência (lojas próprias; promotores/marcas por convite no futuro) |
| promoter      | obrigatório | Dados do promotor (visitas, ganhos) |

## Criação do primeiro admin geral

Não há tela de cadastro público para admin geral. Para criar o primeiro usuário `system_admin`:

1. **Via script (recomendado):** Use o script em `backend/scripts/create-system-admin.ts` (se existir) ou execute no Node/Bun com bcrypt para gerar um `password_hash` e inserir em `users` com `role = 'system_admin'` e `agency_id = NULL`.
2. **Via SQL (após gerar o hash):** Inserir manualmente em `users` com um hash bcrypt da senha escolhida (ex.: gerar com `bcrypt.hashSync('sua_senha', 10)` em um script one-off).

Exemplo de script one-off (rodar uma vez a partir da raiz do monorepo):

```ts
// create-system-admin.ts
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const email = process.env.SYSTEM_ADMIN_EMAIL || 'admin@vizzocheck.local';
const password = process.env.SYSTEM_ADMIN_PASSWORD || 'change-me';
const hash = await bcrypt.hash(password, 10);
await supabase.from('users').insert({ email, password_hash: hash, role: 'system_admin', agency_id: null });
```

## Referências

- Issue [#1](https://github.com/vizzo-check/vizzo-check/issues/1) — Admin geral vs Agência
- Migration `010_system_admin_and_agency_role.sql` — schema e migração de `agency_admin` para `agency` + `system_admin`
