# GestOS

## Sobre o Projeto

**GestOS** é um sistema para gerenciamento de assistência técnica de celulares e outros dispositivos eletrônicos, com controle de clientes, dispositivos, serviços, estoque e vendas (PDV).

## Repositório

**URL**: https://github.com/Nomade-PJ/Paulo-Cell-Es-Versel

## Como Editar o Código

### Trabalhando Localmente

Para trabalhar com o código em seu ambiente local, você precisa ter Node.js & npm instalados - [instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Siga estes passos:

```sh
# Passo 1: Clone o repositório
git clone https://github.com/Nomade-PJ/Paulo-Cell-Es-Versel.git

# Passo 2: Entre no diretório do projeto
cd Paulo-Cell-Es-Versel

# Passo 3: Instale as dependências
npm i

# Passo 4: Inicie o servidor de desenvolvimento
npm run dev
```

### Editando Diretamente no GitHub

- Navegue até os arquivos desejados
- Clique no botão "Edit" (ícone de lápis) no canto superior direito
- Faça suas alterações e confirme as mudanças

### Usando GitHub Codespaces

- Acesse a página principal do repositório
- Clique no botão "Code" (botão verde) próximo ao canto superior direito
- Selecione a aba "Codespaces"
- Clique em "New codespace" para iniciar um novo ambiente Codespace
- Edite os arquivos diretamente no Codespace e faça commit e push das suas alterações quando terminar

## Tecnologias Utilizadas

Este projeto é construído com:

- Vite
- TypeScript
- React
- Supabase (Backend/Autenticação/Banco de Dados)
- shadcn-ui
- Tailwind CSS

## Funcionalidades Principais

- Cadastro e gerenciamento de clientes
- Registro e acompanhamento de dispositivos
- Controle de serviços técnicos
- Controle de estoque e vendas (PDV)
- Sistema de autenticação com múltiplos métodos
- Impressão de comprovantes de venda e etiquetas de serviço
- Dashboard com métricas importantes

## Deployment na Vercel

### Pré-requisitos
- Conta na Vercel (você pode criar uma em [vercel.com](https://vercel.com))
- Projeto configurado no GitHub, GitLab ou Bitbucket

### Passos para deploy

1. **Faça login na Vercel**
   - Acesse [vercel.com](https://vercel.com) e faça login com sua conta
   - Você pode usar sua conta do GitHub, GitLab ou Bitbucket para login

2. **Crie um novo projeto**
   - Na dashboard, clique em "Add New" e depois em "Project"
   - Selecione o repositório que contém este projeto

3. **Configure o projeto**
   - **Framework Preset**: Selecione "Vite"
   - **Root Directory**: Deixe como está (raiz do projeto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Configure as variáveis de ambiente**
   - Na seção "Environment Variables", adicione:
     - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
     - `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase

5. **Deploy**
   - Clique em "Deploy" e aguarde a conclusão do processo
   - A Vercel irá construir e implantar automaticamente seu aplicativo

### Atualizações

Para atualizar seu aplicativo após mudanças no código:
- Faça commit e push para o seu repositório
- A Vercel detectará automaticamente as mudanças e fará um novo deploy

### Alternativa: Deploy pela CLI

Você também pode fazer o deploy usando a Vercel CLI:

```bash
# Instalar a CLI
npm i -g vercel

# Login na sua conta
vercel login

# Deploy (na raiz do projeto)
vercel

# Para ambiente de produção
vercel --prod
```

### Monitoramento

Após o deploy, você pode monitorar:
- **Logs**: No dashboard do projeto, acesse a aba "Logs"
- **Analytics**: No dashboard do projeto, acesse a aba "Analytics"
- **Status**: No dashboard do projeto, veja o status geral do deploy

## Suporte e Contribuição

Este projeto é mantido por [Nomade-PJ](https://github.com/Nomade-PJ). Para suporte ou contribuições, entre em contato ou abra uma issue no GitHub.

## Licença

Todos os direitos reservados © 2024 GestOS
