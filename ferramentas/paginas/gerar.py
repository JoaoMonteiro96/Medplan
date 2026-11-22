import os, sys
B = sys.argv[1]
LOGO = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#34D399"/><g transform="translate(50 50) scale(.86) translate(-50 -46)"><rect x="32" y="44" width="13" height="34" rx="6.5" fill="#0B3D2E"/><rect x="55" y="28" width="13" height="50" rx="6.5" fill="#0B3D2E"/><circle cx="61.5" cy="17" r="7" fill="#FFFFFF"/></g></svg>'
CONTATO = os.environ.get("CONTATO") or 'o e-mail de contato do Sallos (será publicado aqui em breve)'
RESP = os.environ.get("RESP") or 'a equipe do Sallos'
DATA = "22 de novembro de 2026"

CSS = """
  :root { --deep: #0B3D2E; --deep-2: #0E5640; --mint: #6EE7B7; --ink: #0F1A16; --dim: #5E6F69; --paper: #F3F5F4; --card: #FFFFFF; --line: rgba(15,26,22,0.09); --link: #0E6B4D; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink: #E8EFEB; --dim: #9AB0A8; --paper: #0A110F; --card: #111A17; --line: rgba(255,255,255,0.09); --link: #6EE7B7; } }
  :root[data-theme="dark"] { --ink: #E8EFEB; --dim: #9AB0A8; --paper: #0A110F; --card: #111A17; --line: rgba(255,255,255,0.09); --link: #6EE7B7; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16.5px/1.65 Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: var(--link); text-underline-offset: 3px; }
  a:focus-visible { outline: 3px solid var(--mint); outline-offset: 2px; border-radius: 4px; }
  .faixa { background: radial-gradient(120% 140% at 0% 0%, var(--deep-2), var(--deep) 60%); color: #fff; padding: 22px 0 46px; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 0 20px; }
  .topo { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 40px; }
  .marca { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font: 800 21px/1 Manrope, sans-serif; letter-spacing: -0.03em; }
  .marca svg { width: 32px; height: 32px; } .marca i { color: var(--mint); font-style: normal; }
  .topo nav { display: flex; gap: 18px; } .topo nav a { color: rgba(255,255,255,0.8); font-size: 14.5px; font-weight: 500; text-decoration: none; } .topo nav a[aria-current] { color: #fff; text-decoration: underline; text-decoration-color: var(--mint); }
  h1 { font: 800 clamp(32px, 6vw, 46px)/1.08 Manrope, Inter, sans-serif; letter-spacing: -0.035em; margin: 0 0 14px; }
  .faixa p { margin: 0; color: rgba(255,255,255,0.78); font-size: 17px; max-width: 46ch; }
  .faixa small { display: block; margin-top: 16px; color: rgba(255,255,255,0.55); font-size: 13.5px; }
  main { padding: 36px 0 56px; }
  .curto { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px 22px; margin: -66px 0 34px; box-shadow: 0 18px 40px -26px rgba(11,61,46,0.45); position: relative; }
  .curto h2 { margin-top: 0; font-size: 18px; }
  .curto ul { margin: 0; padding-left: 20px; } .curto li { margin: 6px 0; }
  h2 { font: 800 21px/1.25 Manrope, Inter, sans-serif; letter-spacing: -0.02em; margin: 38px 0 10px; }
  p, li { max-width: 68ch; } ul { padding-left: 22px; } li { margin: 5px 0; }
  .tabela { border-top: 1px solid var(--line); margin: 8px 0; }
  .tabela div { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: 4px 18px; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .tabela b { font-weight: 600; } .tabela span { color: var(--dim); }
  @media (max-width: 560px) { .tabela div { grid-template-columns: minmax(0, 1fr); } }
  mark.falta { background: #FEF08A; color: #713F12; padding: 0 4px; border-radius: 4px; }
  footer { border-top: 1px solid var(--line); padding: 22px 0 40px; color: var(--dim); font-size: 14px; }
  footer .wrap { display: flex; flex-wrap: wrap; gap: 8px 20px; justify-content: space-between; }
"""

def pagina(slug, titulo, intro, curto, corpo):
    nav = ''.join(f'<a href="/{s}/"{" aria-current=\"page\"" if s == slug else ""}>{n}</a>' for s, n in (("privacidade", "Privacidade"), ("termos", "Termos")))
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{titulo} · Sallos</title>
<meta name="description" content="{intro}" />
<meta name="theme-color" content="#0B3D2E" />
<link rel="icon" type="image/png" sizes="32x32" href="/sallos-32.png" />
<link rel="apple-touch-icon" href="/sallos-180.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap" />
<style>{CSS}</style>
</head>
<body>
<header class="faixa">
  <div class="wrap">
    <div class="topo"><a class="marca" href="/conheca/" aria-label="Sallos">{LOGO}<span>Sa<i>ll</i>os</span></a><nav>{nav}</nav></div>
    <h1>{titulo}</h1>
    <p>{intro}</p>
    <small>Atualizada em {DATA}</small>
  </div>
</header>
<main>
  <div class="wrap">
    <section class="curto" aria-label="Em poucas palavras"><h2>Em poucas palavras</h2><ul>{''.join(f'<li>{c}</li>' for c in curto)}</ul></section>
{corpo}
  </div>
</main>
<footer><div class="wrap"><span>Sallos · sallos.com.br</span><span><a href="/">Abrir o app</a> &nbsp; <a href="/conheca/">Conheça</a></span></div></footer>
</body>
</html>
"""

priv_curto = [
  "Seus números são seus. Não vendemos, não alugamos e não usamos seus dados para propaganda.",
  "Sem conta, tudo fica só no seu aparelho. Com conta, fica também na nuvem do Sallos, e só você consegue ler.",
  "Você pode baixar uma cópia de tudo ou excluir sua conta e todos os dados quando quiser, pelo próprio app.",
]
priv = f"""
    <h2>Quem cuida dos seus dados</h2>
    <p>O Sallos é um app de organização financeira para médicos. Quem responde pelos dados tratados no app é {RESP}. Para qualquer dúvida ou pedido sobre seus dados, escreva para {CONTATO}.</p>

    <h2>Quais dados o app usa</h2>
    <div class="tabela">
      <div><b>O que você lança</b><span>Plantões, hospitais e cargos, valores recebidos, contas, impostos, notas fiscais, investimentos, metas, férias e o número de WhatsApp do financeiro dos hospitais, se você salvar.</span></div>
      <div><b>Sua conta</b><span>E-mail e senha, se você criar conta. A senha é guardada embaralhada pelo serviço de login; ninguém do Sallos consegue vê-la.</span></div>
      <div><b>Uso do app</b><span>Quais telas são abertas e quantas vezes por dia, ligadas a um código sorteado no aparelho. Não vai nenhum valor, nome ou e-mail. Dá para desligar em Configurações, Privacidade e trava.</span></div>
      <div><b>Dados técnicos</b><span>Como em qualquer site, os servidores que entregam o app registram o endereço de internet (IP) e o tipo de aparelho.</span></div>
    </div>
    <p>O Sallos não pede CPF, dados de cartão, senha de banco nem informações de saúde de pacientes.</p>

    <h2>Onde os dados ficam</h2>
    <ul>
      <li><b>No seu aparelho:</b> tudo o que você lança fica guardado no navegador ou no app instalado. Ler faturas e extratos para importar também acontece no aparelho; o arquivo não é enviado para ninguém.</li>
      <li><b>Na nuvem, se você criar conta:</b> uma cópia vai para o banco de dados do Sallos no Supabase, para você usar no celular e no computador. As regras de acesso deixam cada pessoa ler e gravar só os próprios dados, e as notas fiscais ficam numa pasta privada sua.</li>
      <li>Toda a comunicação usa conexão criptografada (HTTPS).</li>
    </ul>

    <h2>Para que usamos</h2>
    <ul>
      <li>Mostrar suas contas, plantões, impostos e investimentos, e guardar tudo entre seus aparelhos.</li>
      <li>Buscar cotações de ações e do dólar.</li>
      <li>Entender quais telas são mais usadas, para melhorar o app.</li>
    </ul>
    <p>Usamos os dados para prestar o serviço que você pediu ao usar o app (Lei 13.709/2018, a LGPD, art. 7º, V) e, no caso da contagem de uso, pelo interesse em melhorar o app (art. 7º, IX), com a opção de desligar.</p>

    <h2>Com quem os dados passam</h2>
    <p>Não vendemos nem compartilhamos seus dados com anunciantes. Alguns serviços ajudam o app a funcionar:</p>
    <div class="tabela">
      <div><b>Supabase</b><span>Banco de dados, login e pasta das notas fiscais (só para quem cria conta).</span></div>
      <div><b>GitHub Pages</b><span>Entrega as páginas do app e do site.</span></div>
      <div><b>brapi e AwesomeAPI</b><span>Cotações. Recebem só o código dos ativos (como PETR4) ou o pedido da cotação do dólar, sem nada que identifique você.</span></div>
      <div><b>Google Fonts, jsDelivr e cdnjs</b><span>Entregam as letras e partes do programa, como em muitos sites.</span></div>
      <div><b>WhatsApp</b><span>Só quando você toca em Cobrar: o app abre o WhatsApp com a mensagem pronta, e quem envia é você.</span></div>
    </div>
    <p>Alguns desses serviços podem guardar dados fora do Brasil, seguindo as regras da LGPD para isso. Também podemos ter que entregar dados se uma lei ou ordem judicial exigir.</p>

    <h2>Por quanto tempo</h2>
    <p>Enquanto sua conta existir. Ao excluir a conta, os dados são apagados na hora do banco do Sallos; cópias de segurança automáticas do provedor podem levar alguns dias para sumir. Os dados que estão só no seu aparelho somem quando você exclui a conta, sai dela ou apaga os dados do navegador.</p>

    <h2>Seus direitos</h2>
    <p>Pela LGPD, você pode a qualquer momento:</p>
    <ul>
      <li>ver e corrigir seus dados, direto no app;</li>
      <li>baixar uma cópia de tudo, em Configurações, Backup dos dados;</li>
      <li>excluir sua conta e todos os dados, em Configurações, Nuvem e conta, Excluir minha conta e meus dados;</li>
      <li>desligar a contagem de uso, em Configurações, Privacidade e trava;</li>
      <li>pedir informações sobre o uso dos seus dados ou reclamar, escrevendo para {CONTATO}. Você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).</li>
    </ul>

    <h2>Segurança</h2>
    <p>Usamos conexão criptografada, regras que separam os dados de cada pessoa e, se você quiser, uma trava com código ou digital no aparelho. Nenhum sistema é 100% à prova de falhas; se acontecer um incidente que possa trazer risco para você, avisaremos você e a ANPD, como pede a lei.</p>

    <h2>Menores de idade</h2>
    <p>O Sallos é feito para profissionais adultos e não deve ser usado por menores de 18 anos.</p>

    <h2>Mudanças nesta política</h2>
    <p>Se algo importante mudar, avisaremos no app antes. A data no topo mostra a última atualização.</p>
"""

termos_curto = [
  "O Sallos ajuda a organizar suas finanças. Ele não substitui seu contador nem um consultor de investimentos.",
  "Os impostos e as previsões do app são estimativas a partir do que você lança. Confira as guias com seu contador.",
  "Você é dono dos seus dados e pode excluir sua conta quando quiser.",
]
termos = f"""
    <h2>O que é o Sallos</h2>
    <p>O Sallos é um app para médicos organizarem plantões, recebimentos, contas, impostos, investimentos e metas. Ao usar o app, você concorda com estes termos e com a <a href="/privacidade/">Política de privacidade</a>.</p>

    <h2>O que o app não faz</h2>
    <ul>
      <li>Não é serviço de contabilidade. Os valores de imposto, guias e Imposto de Renda são estimativas feitas com os dados e as regras que você informa. Antes de pagar ou declarar, confirme com seu contador.</li>
      <li>Não é recomendação de investimento. Cotações vêm de serviços externos e podem atrasar ou falhar.</li>
      <li>Não movimenta dinheiro. O app não paga contas, não faz transferências e não acessa sua conta no banco.</li>
    </ul>

    <h2>Sua conta</h2>
    <ul>
      <li>Você pode usar o app sem conta, só no aparelho, ou criar uma conta para guardar na nuvem.</li>
      <li>Mantenha sua senha em segredo. O que for feito na sua conta é responsabilidade sua.</li>
      <li>Você pode excluir sua conta a qualquer momento, em Configurações, Nuvem e conta.</li>
    </ul>

    <h2>Seus dados</h2>
    <p>O que você lança é seu. Usamos esses dados só para fazer o app funcionar, como explica a <a href="/privacidade/">Política de privacidade</a>. Sem conta, os dados ficam só no aparelho: se o aparelho for perdido ou os dados do navegador forem apagados, eles somem. Por isso, baixe uma cópia de vez em quando em Configurações, Backup dos dados.</p>

    <h2>Uso correto</h2>
    <p>Não use o Sallos para guardar dados de pacientes, para atividades ilegais ou para tentar acessar dados de outras pessoas ou atrapalhar o funcionamento do serviço. Contas usadas assim podem ser suspensas.</p>

    <h2>Disponibilidade e mudanças</h2>
    <p>O Sallos está em fase de testes. Trabalhamos para ele estar sempre no ar, mas pode haver falhas, pausas para manutenção e mudanças de funções. Se um dia o app for cobrado ou deixar de existir, avisaremos com antecedência e você poderá baixar seus dados.</p>

    <h2>Responsabilidade</h2>
    <p>O app é oferecido como está. Não respondemos por decisões financeiras, pagamentos ou declarações feitas a partir das estimativas do app, nem por perdas causadas por falhas de serviços de terceiros, sempre dentro do que permite o Código de Defesa do Consumidor.</p>

    <h2>Lei e contato</h2>
    <p>Estes termos seguem as leis do Brasil. Dúvidas, sugestões ou reclamações: escreva para {CONTATO}.</p>
"""

for slug, titulo, intro, curto, corpo in (
    ("privacidade", "Política de privacidade", "Como o Sallos cuida dos seus dados: o que usa, onde guarda e o que você pode fazer com eles.", priv_curto, priv),
    ("termos", "Termos de uso", "As regras para usar o Sallos, escritas de forma simples.", termos_curto, termos),
):
    os.makedirs(f"{B}/{slug}", exist_ok=True)
    open(f"{B}/{slug}/index.html", "w").write(pagina(slug, titulo, intro, curto, corpo))
print("ok")
