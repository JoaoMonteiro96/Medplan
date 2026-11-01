# Mediplan: como publicar com banco de dados e domínio próprio

Este pacote tem o app pronto. Faltam só as partes que precisam da sua conta ou de pagamento. Siga na ordem. Leva uns 30 minutos, mais a espera do domínio.

## O que tem no pacote

| Arquivo | Para que serve |
|---|---|
| `index.html`, `app.js` | O app em si (já compilado, abre rápido) |
| `manifest.json`, `service-worker.js`, ícones | Fazem o app instalar na tela inicial e abrir sem internet |
| `schema.sql` | Cria o banco de dados no Supabase |
| `app.jsx` | Código-fonte do app, para futuras alterações |
| `LEIA-ME.md` | Este guia |

---

## Passo 1. Atualizar o site no GitHub (5 min)

1. Abra o repositório **Medplan** no GitHub.
2. Toque em **Add file → Upload files**.
3. Envie **todos** os arquivos deste pacote. Se o GitHub perguntar, substitua os antigos.
4. Toque em **Commit changes**.
5. Em 1 ou 2 minutos o app novo aparece em `https://joaomonteiro96.github.io/Medplan/`.

> Se o GitHub Pages ainda não estiver ligado: **Settings → Pages → Branch: main / (root) → Save**.

Sem o Passo 2, o app funciona como antes, salvando só no aparelho.

---

## Passo 2. Criar o banco de dados no Supabase (10 min)

1. Acesse **supabase.com** e crie uma conta (pode usar a do GitHub).
2. Toque em **New project**:
   - **Name:** `mediplan`
   - **Database password:** crie uma senha forte e **guarde**. Ela não vai para o app.
   - **Region:** South America (São Paulo)
   - Toque em **Create new project** e espere uns 2 minutos.
3. No menu lateral, abra **SQL Editor → New query**.
4. Abra o arquivo `schema.sql`, copie **tudo**, cole no editor e toque em **Run**. Deve aparecer "Success". Pode rodar de novo sem problema, porque ele não apaga nada.
5. Abra **Authentication → URL Configuration**:
   - **Site URL:** `https://joaomonteiro96.github.io/Medplan/` (depois do Passo 4, troque pelo seu domínio)
   - Em **Redirect URLs**, adicione o mesmo endereço.
   - Salve.

### Pegar o endereço e a chave

No topo do projeto, toque em **Connect**. Ou abra **Project Settings → API Keys**. Você precisa de dois valores:

- **Project URL**: algo como `https://abcdefgh.supabase.co`
- **Publishable key**: começa com `sb_publishable_`

> **Nunca** use a *secret key* (`sb_secret_…`) nem a senha do banco no app. O próprio app recusa a chave secreta se você colar por engano.

---

## Passo 3. Ligar o app ao banco (2 min)

1. Abra o app e vá em **Mais → Configurações → Nuvem e conta**.
2. Cole o **Project URL** e a **Publishable key** e toque em **Conectar**.
3. Toque em **Criar conta**, com seu e-mail e uma senha.
4. Confirme pelo link que chega no e-mail e depois **Entre**.
5. Na primeira vez, os dados que já estão no aparelho sobem sozinhos para a nuvem.

**No outro aparelho:** abra o app, faça os mesmos passos 1 e 2 e entre na mesma conta. Os dados aparecem.

> Me mande o Project URL e a Publishable key (os dois são públicos, não são senha). Assim eu deixo eles fixos no app, e qualquer aparelho já abre direto na tela de login, sem precisar colar nada.

**Se o e-mail de confirmação não chegar:** o envio grátis do Supabase tem limite por hora. Espere um pouco ou, como só você usa, desligue a confirmação em **Authentication → Sign In / Providers → Email → Confirm email**.

---

## Passo 4. Domínio próprio (15 min + espera)

1. Em **registro.br**, procure o nome (ex.: `mediplan.com.br`) e registre com seu CPF. Custa cerca de R$ 40 por ano.
2. **No GitHub primeiro:** repositório **Medplan → Settings → Pages → Custom domain**. Digite `mediplan.com.br` e toque em **Save**.
3. **Depois, no registro.br:** abra o domínio, vá em **DNS → Editar zona** e crie:

   | Tipo | Nome | Valor |
   |---|---|---|
   | A | (vazio / @) | 185.199.108.153 |
   | A | (vazio / @) | 185.199.109.153 |
   | A | (vazio / @) | 185.199.110.153 |
   | A | (vazio / @) | 185.199.111.153 |
   | CNAME | www | joaomonteiro96.github.io |

4. Espere o DNS propagar. Costuma levar minutos, mas pode levar até 24 horas.
5. De volta em **GitHub → Settings → Pages**, marque **Enforce HTTPS** quando a opção liberar.
6. No Supabase, troque o **Site URL** e o **Redirect URL** pelo novo endereço (`https://mediplan.com.br`).
7. No celular, apague o app antigo da tela inicial, abra o novo endereço, entre na conta e toque em **Adicionar à tela inicial**.

---

## Passo 5. Limpeza

- Apague o site antigo da **Netlify**, se ainda existir. Ele mostra uma versão velha do app e os anúncios da Netlify.

---

## Como os dados ficam guardados

- Tudo fica numa tabela `records` no Supabase. Cada vínculo, plantão, despesa, investimento ou meta é uma linha, separada por tipo (`collection`).
- Uma regra de segurança garante que **cada conta só vê os próprios dados**.
- Para consultar ou exportar no próprio Supabase, há visões prontas: `vw_vinculos`, `vw_plantoes`, `vw_despesas`, `vw_investimentos` e `vw_metas`.
- O app guarda uma cópia no aparelho. Sem internet ele continua funcionando e envia as mudanças quando a conexão volta.
- **Backup:** o plano grátis do Supabase não faz backup automático. Use **Configurações → Baixar backup** de vez em quando.
- **Plano grátis:** o projeto pausa depois de 1 semana sem nenhum uso. Basta abrir o painel do Supabase e tocar em **Restore**. Nada se perde.

## Para evoluir o app

O código-fonte está em `app.jsx`. As próximas versões mantêm a mesma estrutura do banco, então nada do que você já salvou se perde. Novos campos entram dentro de cada linha sem precisar mexer na tabela.
