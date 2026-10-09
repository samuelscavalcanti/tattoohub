# TattooHub

Sistema web para gestão de estúdios de tatuagem. Reúne clientes, agenda, fichas de anamnese, CRM de leads, estoque, equipe e financeiro em uma aplicação com API e interface servidas pelo mesmo servidor.

## Funcionalidades

- Cadastro e autenticação de estúdios por sessão.
- Dashboard, clientes e agenda de atendimentos.
- Formulário público de anamnese e gerenciamento de fichas e perguntas.
- CRM de leads.
- Controle de estoque, despesas, equipe e repasses.
- Resumo financeiro e exportação de extrato CSV.
- Separação dos dados por estúdio e permissões para dono e artista.
- Instalação como PWA em navegadores compatíveis; a interface se adapta a telas menores.

## Requisitos

- Node.js 18 ou superior.
- MongoDB em execução, localmente ou acessível por uma URI.
- npm (incluído com o Node.js).

## Configuração e inicialização

No PowerShell, abra a pasta do projeto e execute:

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Abra o `.env` e confira as configurações antes de iniciar:

| Variável | Finalidade |
|---|---|
| `PORT` | Porta HTTP do servidor (padrão: `3000`). |
| `NODE_ENV` | Ambiente de execução; use `development` localmente e `production` na implantação. |
| `MONGO_URI` | URI do MongoDB. Para uma instalação local, use `mongodb://127.0.0.1:27017/tattoohub`. |
| `SESSION_SECRET` | Segredo longo e aleatório usado para assinar as sessões. Substitua o valor de exemplo antes de usar o sistema. |
| `FRONT_ORIGIN` | Origens permitidas para um frontend hospedado em outro domínio; deixe vazio quando frontend e API forem servidos juntos. |
| `COOKIE_SAMESITE` | Política do cookie de sessão; use `lax` no acesso local. `none` exige HTTPS. |
| `TZ` | Fuso horário do servidor (padrão: `America/Sao_Paulo`). |

Não compartilhe nem envie seu `.env` para o repositório. O `.env.example` contém somente valores de referência. Se usar MongoDB local no Windows, inicie o serviço antes do servidor (em PowerShell como administrador, se necessário):

```powershell
Start-Service MongoDB
```

Inicie a aplicação:

```powershell
npm run dev
```

O servidor inicia em `http://localhost:3000` e reinicia automaticamente quando os arquivos do backend mudam. Para iniciar sem o modo de desenvolvimento, use `npm start`.

Verifique se a API está respondendo, em outro terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Uma resposta como `{ "ok": true }` indica que o servidor está ativo. A API só começa a aceitar conexões depois de conectar ao MongoDB.

## Como acessar o sistema

1. Com o servidor e o MongoDB em execução, abra `http://localhost:3000` no navegador.
2. No primeiro acesso, clique em **Não tem conta? Cadastre-se**, preencha nome, estúdio, e-mail e senha para criar o estúdio e o usuário dono.
3. Faça login na interface usando o e-mail e a senha criados. Se já existe um usuário, entre diretamente.

Para criar o primeiro usuário pelo PowerShell, substitua os dados de exemplo e execute:

```powershell
$cadastro = @{
  nome = "Seu nome"
  email = "voce@exemplo.com"
  senha = "substitua-por-uma-senha-segura"
  nomeEstudio = "Nome do estudio"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $cadastro
```

A senha deve ter pelo menos 8 caracteres. A rota cria o estúdio, o usuário dono e as perguntas padrão da anamnese. Depois, volte à página `http://localhost:3000` e entre com as credenciais cadastradas. Se já existe um usuário, pule o cadastro e faça login diretamente.

Para criar usuários artistas, entre como dono e use a área de equipe. A visibilidade de dashboard, configurações, equipe e financeiro depende do perfil. O plano `starter` permite um perfil; o plano `pro`, até cinco.

### Anamnese pública

O formulário público pode ser acessado em `http://localhost:3000/anamnese.html?acc=<slug-do-estudio>`. O `slug` está disponível nos dados do estúdio retornados por `GET /api/auth/me`. O formulário não exige login.

### Instalar como PWA

Em `http://localhost:3000`, use **Instalar aplicativo** quando o navegador oferecer essa opção. Em celulares cujo navegador não exiba o botão, use o menu do navegador e escolha **Adicionar à tela inicial**. A instalação exige HTTPS em um site publicado; `localhost` é considerado seguro para testes locais. O shell e os arquivos estáticos locais podem abrir offline depois de carregados (fontes e bibliotecas externas podem não estar disponíveis), mas login, API e dados precisam do servidor e do MongoDB disponíveis. Respostas da API e dados de usuário não são armazenados pelo service worker.

## Entrega e acesso do professor

O código-fonte completo está no repositório GitHub público: [github.com/samuelscavalcanti/tattoohub](https://github.com/samuelscavalcanti/tattoohub). O link foi conferido e o repositório contém `src/` (backend e modelos do banco MongoDB), `public/` (frontend), `docs/`, `package.json` e `README.md`. O banco usa MongoDB com schemas Mongoose; não há um dump de dados reais incluído.

Conforme a orientação do trabalho, **somente o líder do grupo deve enviar o projeto**. O líder pode enviar ao professor o link acima para acesso ao código. Para executar a aplicação, o professor deve clonar o repositório, instalar Node.js 18 ou superior e MongoDB, seguir a configuração deste README e iniciar a aplicação localmente. A página do repositório no GitHub é para entrega/consulta do código, não é uma hospedagem da aplicação: o sistema depende do backend Node.js e de uma conexão MongoDB e não funciona apenas pelo GitHub Pages.

Antes do envio, confirme que o repositório está público ou que o professor foi convidado com permissão de leitura, e que as últimas alterações foram enviadas (push) para `main`. Nunca inclua `.env`, senhas, chaves ou dados reais de clientes; o `.env.example` contém apenas valores de referência.

## API

As rotas da API usam o prefixo `/api`. O health check, o cadastro/login e as rotas de anamnese pública não exigem autenticação. As demais funcionalidades usam a sessão criada no login.

| Área | Rotas principais |
|---|---|
| Saúde | `GET /health` |
| Autenticação | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Clientes | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/:id` |
| Agenda | `GET/POST /agendamentos`, `GET/PUT/DELETE /agendamentos/:id`, `PATCH /agendamentos/:id/status` |
| Anamnese | `/anamnese/perguntas`, `/anamnese/fichas` e respectivos detalhes; as alterações de perguntas são restritas ao dono |
| Anamnese pública | `GET /public/anamnese/:slug`, `POST /public/anamnese/:slug/fichas` |
| Configurações | `GET /config`, `PUT /config/estudio`, `PUT /config/perfil`, `PUT /config/senha`, `DELETE /config/conta` |
| Dashboard | `GET /dashboard` (dono) |
| CRM | `GET/POST /leads`, `PUT/DELETE /leads/:id`, `PATCH /leads/:id/status` |
| Estoque | `GET/POST /estoque`, `PUT/DELETE /estoque/:id`, `PATCH /estoque/:id/movimentar` |
| Despesas e equipe | `/despesas` e `/equipe` (restritas ao dono) |
| Financeiro | `/financeiro/resumo`, `/financeiro/transacoes`, `/financeiro/extrato.csv`, `/financeiro/repasses` (dono) |

Para exemplos de requisições, incluindo cadastro, login, agenda, anamnese e financeiro, consulte [`docs/requests.http`](docs/requests.http). O arquivo pode ser executado com a extensão REST Client do VS Code. Ao chamar endpoints protegidos pela extensão ou por outra ferramenta HTTP, mantenha o cookie de sessão retornado pelo login.

## Estrutura do projeto

```text
src/
  config/       conexão com o MongoDB
  controllers/  regras dos endpoints
  middlewares/  autenticação, permissões e tratamento de erros
  models/       modelos Mongoose
  routes/       rotas da API
  services/     lógica compartilhada
  utils/        validações, sessão, datas e erros
public/
  index.html    interface principal, servida pelo Express
  anamnese.html formulário público de anamnese
  css/          estilos
  js/           autenticação, cliente HTTP, PWA e módulos da interface
  manifest.webmanifest manifesto e ícones da PWA
  icons/        ícones instaláveis da aplicação
  sw.js         cache do shell estático, sem cache da API
docs/
  requests.http exemplos de chamadas à API
```

O frontend é servido pelo Express no mesmo host da API. Acesse-o por `http://localhost:3000`; não abra os arquivos HTML diretamente nem inicie um servidor separado para `public/`. A sessão de login é mantida por cookie HTTP; a preferência de tema é salva no `localStorage`.

## Regras gerais dos dados

- Os dados de negócio pertencem a um estúdio e as consultas são isoladas por estúdio.
- Os endpoints protegidos usam a sessão do usuário autenticado; operações administrativas exigem o perfil de dono.
- Dinheiro é representado como número e datas trafegam no formato ISO `AAAA-MM-DD`.
- Erros da API seguem o formato `{ "erro": "...", "detalhes": ... }`.
