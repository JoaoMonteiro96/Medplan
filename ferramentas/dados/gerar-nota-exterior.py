# Gera uma confirmação de negócio fictícia no modelo Apex Clearing (usado pela Nomad e outras corretoras americanas).
# Dados inventados, só para testar o Importar. Uso: python3 ferramentas/dados/gerar-nota-exterior.py
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
saida = os.path.join(os.path.dirname(__file__), "nota-exterior-teste.pdf")
c = canvas.Canvas(saida, pagesize=letter)
W, H = letter
c.setFont("Helvetica-Bold", 16); c.drawString(40, H - 60, "CORRETORA EXEMPLO")
c.setFont("Helvetica", 7); c.drawString(160, H - 50, "Corretora Exemplo Investment Services Inc."); c.drawString(160, H - 58, "100 Example Street, Miami, FL 33131")
c.setFont("Helvetica-Bold", 11); c.drawRightString(W - 40, H - 60, "Trade Confirmation")
c.setFont("Helvetica", 7); c.drawString(40, H - 100, "CLIENTE DE EXEMPLO"); c.drawString(40, H - 108, "RUA FICTICIA, 1")
c.drawString(330, H - 120, "Account Number:"); c.drawRightString(W - 40, H - 120, "0EXEMPLO")
c.drawString(330, H - 128, "Process Date:"); c.drawRightString(W - 40, H - 128, "2026-11-13")
c.drawString(40, H - 150, "We confirm the below trades subject to the terms and conditions set forth on the confirmation.")
cols = [40, 110, 175, 240, 300, 365, 425, 480, 520, 560]
heads = ["Trade Date", "Settle Date", "Symbol", "Quantity", "Price", "Gross Amount", "Commission", "Transaction Fee", "Add'l Fees", "Net Amount"]
def secao(y, titulo, linhas):
    c.setFillColorRGB(0.1, 0.65, 0.85); c.rect(40, y - 4, W - 80, 16, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1); c.setFont("Helvetica-Bold", 8); c.drawString(44, y, titulo); c.setFillColorRGB(0, 0, 0)
    y -= 20; c.setFont("Helvetica-Bold", 6)
    for x, h in zip(cols, heads): c.drawString(x, y, h)
    y -= 12
    for vals, desc, trade in linhas:
        c.setFont("Helvetica", 6)
        for x, v in zip(cols, vals): c.drawString(x, y, v)
        y -= 9; c.setFont("Helvetica-Bold", 6); c.drawString(40, y, "DESC: " + desc); c.drawString(330, y, "Trade#: " + trade); c.drawString(520, y, "CAP: AGENCY")
        y -= 9; c.setFont("Helvetica", 6); c.drawString(40, y, "Execution Time: 10:37:23 ET"); c.drawString(240, y, "Order Type: MARKET"); c.drawString(365, y, "Venue: OTC")
        y -= 16
    return y
y = secao(H - 175, "You Bought", [
    (["2026-11-13", "2026-11-16", "NVDA", "3.14316", "159.0755", "500.00", "0.00", "0.00", "0.00", "500.00"], "NVIDIA CORPORATION COM", "1EXEMPLO1"),
    (["2026-11-13", "2026-11-16", "VOO", "2.5", "612.40", "1,531.00", "0.00", "0.00", "0.00", "1,531.00"], "VANGUARD S&P 500 ETF", "1EXEMPLO2"),
])
y = secao(y - 10, "You Sold", [
    (["2026-11-13", "2026-11-16", "AAPL", "4", "230.10", "920.40", "0.00", "0.02", "0.00", "920.38"], "APPLE INC COM", "1EXEMPLO3"),
])
c.setFont("Helvetica", 7); c.drawString(40, 60, "Page 1 of 1")
c.save(); print("ok", saida)
