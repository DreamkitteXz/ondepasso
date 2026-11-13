# Cadernos sintéticos com a diagramação do Enem (para o teste de ponta a ponta; não são provas reais).
import sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
W, H = 567, 780
OUT = sys.argv[1]
LETRAS = "ABCDE"

def faixas(c, n):
    c.setFont("Helvetica", 7); c.setFillGray(0.6)
    c.drawString(65, H - 37, "ENEM2025" * 9)
    c.drawString(65, 68, "ENEM2025" * 9)
    c.setFillGray(0); c.drawString(65, 57, f"{n} | CADERNO DE TESTE")

def questao(c, x, y, num, linhas=5, larga=False, cor="#111111"):
    c.setFont("Helvetica-Bold", 11); c.setFillColor(HexColor("#000000"))
    c.drawString(x, y, f"QUESTÃO {num:02d}")
    c.setFont("Helvetica", 9); c.setFillColor(HexColor(cor))
    y -= 16
    for k in range(linhas):
        c.drawString(x, y, f"Enunciado sintético da questão {num}, linha {k + 1}."); y -= 11
    for L in LETRAS:
        c.drawString(x, y, f"{L}  alternativa {L} da questão {num}"); y -= 11
    return y

def colunas(c, n, esq, dir, cont=None):
    faixas(c, n)
    off = 0 if n % 2 else 7
    for x, qs in ((58 + off, esq), (321 + off, dir)):
        y = H - 60
        if cont and x < 300:
            c.setFont("Helvetica", 9)
            for k in range(4): c.drawString(x, y, f"Continuação da questão {cont}, linha {k + 1}."); y -= 11
            y -= 14
        for q in qs:
            y = questao(c, x, y, q) - 24

def dia2():
    c = canvas.Canvas(f"{OUT}/teste-2025_PV_impresso_D2_CD5.pdf", pagesize=(W, H))
    c.setFont("Helvetica", 12); c.drawString(80, 400, "CADERNO DE TESTE - 2º DIA"); c.showPage()
    q, n = 91, 2
    while q <= 180:
        qs = [x for x in range(q, q + 8) if x <= 180]
        colunas(c, n, qs[:4], qs[4:]); c.showPage(); q += 8; n += 1
    c.setFont("Helvetica", 30); c.drawString(200, 400, "enem2025"); c.showPage()
    c.save()

def dia1():
    c = canvas.Canvas(f"{OUT}/teste-2025_PV_impresso_D1_CD1.pdf", pagesize=(W, H))
    c.setFont("Helvetica", 12); c.drawString(80, 400, "CADERNO DE TESTE - 1º DIA"); c.showPage()
    faixas(c, 2); c.setFont("Helvetica-Bold", 10)
    c.drawString(70, H - 60, "LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS"); c.drawString(70, H - 73, "Questões de 01 a 45"); c.drawString(70, H - 86, "Questões de 01 a 05 (opção inglês)")
    y = H - 110
    for q in range(1, 6): y = questao(c, 65, y, q, linhas=2, cor="#1144aa") - 12
    c.showPage()
    faixas(c, 3); c.setFont("Helvetica-Bold", 10); c.drawString(70, H - 60, "Questões de 01 a 05 (opção espanhol)")
    y = H - 84
    for q in range(1, 6): y = questao(c, 65, y, q, linhas=2, cor="#aa4411") - 12
    c.showPage()
    faixas(c, 4); c.setFont("Helvetica-Bold", 10); c.drawString(70, H - 60, "Texto para as Questões de 06 a 07.")
    c.setFont("Helvetica", 9); y = H - 80
    for k in range(10): c.drawString(70, y, f"Texto de apoio comum, linha {k + 1}."); y -= 11
    y = questao(c, 65, y - 14, 6, linhas=1) - 20; questao(c, 65, y, 7, linhas=1); c.showPage()
    q, n = 8, 5
    while q <= 45:
        qs = [x for x in range(q, q + 8) if x <= 45]; colunas(c, n, qs[:4], qs[4:]); c.showPage(); q += 8; n += 1
    faixas(c, n); c.setFont("Helvetica-Bold", 12); c.drawString(230, H - 60, "PROPOSTA DE REDAÇÃO"); c.showPage(); n += 1
    faixas(c, n); c.setFont("Helvetica-Bold", 10); c.drawString(70, H - 60, "CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS"); c.drawString(70, H - 73, "Questões de 46 a 90")
    y = H - 100
    for qq in (46, 47, 48): y = questao(c, 65, y, qq) - 20
    c.showPage(); n += 1; q = 49
    while q <= 90:
        qs = [x for x in range(q, q + 8) if x <= 90]; colunas(c, n, qs[:4], qs[4:]); c.showPage(); q += 8; n += 1
    c.save()

def gabarito(nome, de, ate, dia1=False):
    c = canvas.Canvas(f"{OUT}/teste-{nome}", pagesize=(W, H)); c.setFont("Helvetica", 10)
    y = H - 60
    for q in range(de, ate + 1):
        letra = LETRAS[q % 5]
        txt = f"{q:02d}   {letra}   {LETRAS[(q + 2) % 5]}" if dia1 and q <= 5 else (f"{q}   Anulado" if q == 150 else f"{q:02d}   {letra}")
        c.drawString(80 if (q - de) < 45 else 320, y - 14 * ((q - de) % 45), txt)
    c.save()

dia2(); dia1()
gabarito("2025_GB_impresso_D2_CD5.pdf", 91, 180); gabarito("2025_GB_impresso_D1_CD1.pdf", 1, 90, dia1=True)
print("ok")
