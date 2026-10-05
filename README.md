# TattooHub Backend
**Pessoa 1:** Auth + Clientes + Agenda + Anamnese + Config + Dashboard  
**Pessoa 2:** Estoque + Financeiro/Despesas + Equipe
Stack: Node.js · Express · MVC · Mongoose/MongoDB · sessão (express-session + connect-mongo)

## Rodar
```bash
npm install
npm run dev               # http://localhost:3000/ (front) e /api/health (API)
```
O `.env` local de desenvolvimento já está configurado para usar MongoDB em
`mongodb://127.0.0.1:27017/tattoohub`. Instale e inicie o MongoDB Community Server local antes de
rodar o servidor. O segredo configurado no `.env` é exclusivo para desenvolvimento local; troque-o
por um valor aleatório antes de qualquer implantação.

No Windows PowerShell, na pasta do projeto:
```powershell
npm install
npm run dev
```
Para validar que a API está respondendo, em outro terminal:
```powershell
Invoke-RestMethod http://localhost:3000/api/health
```
O front integrado é servido pelo mesmo processo em `http://localhost:3000/`; não abra `index.html`
diretamente nem precisa iniciar um servidor separado para o front.
Teste as rotas com `docs/requests.http` (extensão REST Client do VS Code) ou Insomnia.

## Estrutura (MVC)
```
src/
  models/       Estudio, Usuario, Cliente, Agendamento, Pergunta, Ficha  |  Estoque, Despesa, Membro, Repasse, Lead*
  controllers/  regras de cada módulo (recebem req, devolvem JSON)
  routes/       URL -> controller (+ middlewares de auth/perfil)
  services/     lógica reaproveitável (criarUsuario, dashboard, perguntas padrão)
  middlewares/  auth (requireAuth, requireRole) e tratamento de erros
  utils/        validação, sessão, datas, AppError
public/
  index.html    dashboard servido pelo Express
  anamnese.html formulário público da anamnese
  css/          estilos do dashboard
  js/           autenticação, cliente HTTP e módulos por funcionalidade
```

O dashboard fica disponível em `http://localhost:3000/`; o formulário público da anamnese é servido em
`/anamnese.html?acc=<estudio.slug>`. O front usa a sessão HTTP do backend e as rotas `/api`, sem seeds
ou cópias locais de dados. A preferência visual de tema é a única informação persistida no `localStorage`.

## Contratos de dados
1. **Multi-estúdio:** todo model novo precisa do campo `estudio: ObjectId ref 'Estudio'` e TODA query filtra por `req.estudioId`.
   (A exclusão de conta apaga automaticamente tudo que tem o campo `estudio`.)
2. **Auth:** use `requireAuth` (e `requireRole('dono')` quando for só do dono). Ele preenche `req.usuario`, `req.estudio`, `req.estudioId`.
3. **Equipe (Pessoa 2) — já integrado:** o login do artista é criado com `criarUsuario(...)` de `services/usuarioService.js`; a tabela `usuarios` continua da Pessoa 1. A Equipe guarda só função e split no model `Membro`. O `id` do membro na API é o `id` do `Usuario` (o mesmo usado em `profissional` na agenda).
4. **Lead (CRM):** usa o model `Lead` com `estudio`, `cliente`, `descricao`, `estilo`, `preco` (Number), `status` 0|1|2 (**2 = fechado**), `artista` (ref `Usuario`, usado nos repasses) e timestamps. A data de fechamento é o `updatedAt`.
5. **Erros:** `throw new AppError(status, mensagem)` dentro de `asyncHandler`. Resposta: `{ erro, detalhes }`.
6. **Formato:** dinheiro = Number; datas = ISO (`AAAA-MM-DD`); ids = string `id`.

## Rotas (prefixo /api) — todas exigem sessão, exceto as marcadas
| Método | Rota | Obs |
|---|---|---|
| POST | /auth/register | público · cria estúdio + dono e já loga |
| POST | /auth/login | público |
| POST | /auth/logout | |
| GET | /auth/me | dados do logado + estúdio/plano |
| GET/POST | /clientes | `?busca=&page=&limit=` |
| GET/PUT/DELETE | /clientes/:id | |
| GET/POST | /agendamentos | `?de=&ate=&status=&profissionalId=&clienteId=` |
| GET/PUT/DELETE | /agendamentos/:id | 409 em conflito de horário |
| PATCH | /agendamentos/:id/status | agendado, confirmado, concluido, cancelado |
| GET/POST | /anamnese/perguntas | escrita só dono |
| PUT/DELETE | /anamnese/perguntas/:id | só dono |
| PATCH | /anamnese/perguntas/:id/ativa | só dono · inverte ativa |
| GET | /anamnese/fichas, /anamnese/fichas/:id | inclui `alertas` |
| GET | /public/anamnese/:slug | **público** · perguntas ativas + artistas |
| POST | /public/anamnese/:slug/fichas | **público** · envia a ficha |
| GET | /config | |
| PUT | /config/estudio · /config/perfil · /config/senha | estudio: só dono |
| DELETE | /config/conta | só dono · exige `{ senha }` |
| GET | /dashboard | só dono |
| GET/POST | /leads | sessão · artista lista/cria apenas os próprios leads |
| PUT/DELETE | /leads/:id | sessão · artista só altera/remove os próprios leads |
| PATCH | /leads/:id/status | `{ status: 0\|1\|2 }` · altera etapa; 2 = fechado |
| GET/POST | /estoque | `?baixo=true` lista só estoque baixo · POST `{ item, categoria?, quantidade, estoqueMinimo? }` |
| PUT/DELETE | /estoque/:id | |
| PATCH | /estoque/:id/movimentar | `{ tipo: 'entrada'\|'saida', quantidade }` · 400 se faltar saldo |
| GET/POST | /despesas | **só dono** · `?mes=AAAA-MM` · POST `{ descricao, valor, categoria?, data? }` |
| PUT/DELETE | /despesas/:id | só dono |
| GET | /equipe | **só dono** · `{ limite, total, membros[] }` |
| POST | /equipe | só dono · `{ nome, funcao?, split, email, senha }` · cria login + perfil · 403 se estourar o plano |
| PUT/DELETE | /equipe/:id | só dono · DELETE desativa o login (não apaga histórico); dono não pode ser removido |
| GET | /financeiro/resumo | só dono · `?mes=AAAA-MM` → `{ entradas, saidas, lucro }` |
| GET | /financeiro/transacoes · /extrato.csv | só dono · `?mes=AAAA-MM` |
| GET | /financeiro/repasses | só dono · por artista: `devido`, `pago`, `pendente` |
| POST | /financeiro/repasses/:artistaId/pagar | só dono · registra repasse + despesa "Repasse" |

## Frontend
- O Express serve os arquivos de `public/` no mesmo host da API; rode o app via `npm run dev`, não por `file://`.
- O cliente HTTP centralizado em `public/js/api.js` inclui `credentials: 'include'` e interpreta erros `{ erro, detalhes }`.
- O front usa os contratos de `clientes`, `agendamentos`, `anamnese`, `dashboard`, `config`, `leads`, `estoque`, `despesas`, `equipe` e `financeiro`.
- O financeiro consome os totais e repasses calculados pela API. Dinheiro trafega como número; datas trafegam em ISO (`AAAA-MM-DD`).
- Dados de financeiro, equipe e configurações de estúdio ficam visíveis apenas para `perfil === 'dono'`.
