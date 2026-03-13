"""
pdf_export.py — Geração de relatório PDF com ReportLab.

Gera um PDF completo contendo:
  - URL analisada e data
  - Score de segurança com classificação
  - Tabela de headers analisados
  - Relatório executivo (resumo do LLM)
  - Explicações detalhadas por header com seções:
    - O que é o header
    - Risco real
    - Exemplos de ataque
    - Como corrigir
    - Teste de validação
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from datetime import datetime

from reportlab.lib.utils import ImageReader


# ──────────────────────────────────────────────
#  Logo do documento
# ──────────────────────────────────────────────

_LOGO_FALLBACK_URL = "https://sec-headers.vercel.app/SecHeaders.png"


def _load_document_logo() -> ImageReader | None:
    """
    Carrega a logo para o PDF.
    Tenta primeiro o arquivo local; se não existir, busca da URL pública.
    Composita sobre fundo branco para garantir renderização correta no PDF.
    """
    import urllib.request
    from PIL import Image

    png_path = Path(__file__).parent / "data" / "SecHeaders.png"

    def _process(img: "Image.Image") -> ImageReader:
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        buf = io.BytesIO()
        bg.save(buf, format="PNG")
        buf.seek(0)
        return ImageReader(buf)

    # 1. Tenta arquivo local
    try:
        return _process(Image.open(png_path))
    except Exception:
        pass

    # 2. Fallback: busca da URL pública
    try:
        with urllib.request.urlopen(_LOGO_FALLBACK_URL, timeout=5) as resp:
            return _process(Image.open(io.BytesIO(resp.read())))
    except Exception:
        return None


_DOCUMENT_LOGO = _load_document_logo()

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    Preformatted,
    KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# ──────────────────────────────────────────────
#  Cores por severidade
# ──────────────────────────────────────────────

SEVERITY_COLORS = {
    "info": colors.Color(0.6, 0.6, 0.6),      # Cinza
    "low": colors.Color(0.2, 0.6, 0.9),        # Azul
    "medium": colors.Color(1.0, 0.75, 0.0),    # Amarelo
    "high": colors.Color(1.0, 0.4, 0.0),       # Laranja
    "critical": colors.Color(0.9, 0.1, 0.1),   # Vermelho
}

CLASSIFICATION_COLORS = {
    "Crítico": colors.Color(0.9, 0.1, 0.1),
    "Regular": colors.Color(1.0, 0.75, 0.0),
    "Bom": colors.Color(0.2, 0.7, 0.2),
    "Excelente": colors.Color(0.0, 0.6, 0.3),
}


def _render_markdown_to_elements(
    text: str,
    elements: list,
    body_style: ParagraphStyle,
    code_style: ParagraphStyle,
    subheading_style: ParagraphStyle,
    section_colors: dict,
):
    """
    Converte texto markdown em elementos ReportLab.
    Suporta: ## headings, ```code blocks```, **bold**, listas, parágrafos.
    """
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        # Code block (```)
        if line.strip().startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if code_lines:
                code_text = "\n".join(code_lines)
                # Escape XML chars for ReportLab
                code_text = (
                    code_text.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                )
                elements.append(
                    Preformatted(code_text, code_style)
                )
            i += 1
            continue

        # ## Section headers
        if line.strip().startswith("## "):
            header_text = line.strip()[3:]
            color = section_colors.get(header_text, colors.Color(0.3, 0.3, 0.3))
            elements.append(
                Paragraph(
                    f"<font color='#{color.hexval()[2:]}'><b>▸ {_escape_xml(header_text)}</b></font>",
                    subheading_style,
                )
            )
            i += 1
            continue

        # ### Sub-headers
        if line.strip().startswith("### "):
            header_text = line.strip()[4:]
            elements.append(
                Paragraph(
                    f"<b>{_escape_xml(header_text)}</b>",
                    ParagraphStyle("SubSubHeading", parent=body_style, fontSize=10, spaceBefore=6, spaceAfter=2),
                )
            )
            i += 1
            continue

        # List items (- or *)
        if line.strip().startswith(("- ", "* ")):
            item_text = line.strip()[2:]
            item_text = _format_inline_markdown(item_text)
            elements.append(
                Paragraph(
                    f"• {item_text}",
                    ParagraphStyle("ListItem", parent=body_style, leftIndent=12, spaceBefore=1, spaceAfter=1),
                )
            )
            i += 1
            continue

        # Numbered list items
        numbered_match = re.match(r"^(\d+)\.\s+(.+)", line.strip())
        if numbered_match:
            num = numbered_match.group(1)
            item_text = _format_inline_markdown(numbered_match.group(2))
            elements.append(
                Paragraph(
                    f"{num}. {item_text}",
                    ParagraphStyle("NumListItem", parent=body_style, leftIndent=12, spaceBefore=1, spaceAfter=1),
                )
            )
            i += 1
            continue

        # Regular paragraph
        stripped = line.strip()
        if stripped:
            formatted = _format_inline_markdown(stripped)
            elements.append(Paragraph(formatted, body_style))

        i += 1


def _escape_xml(text: str) -> str:
    """Escapa caracteres XML para ReportLab Paragraph."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _format_inline_markdown(text: str) -> str:
    """Converte markdown inline (**bold**, `code`, etc) para XML do ReportLab."""
    text = _escape_xml(text)
    # **bold** → <b>bold</b>
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # `code` → <font name="Courier" size="8">code</font>
    text = re.sub(r"`(.+?)`", r'<font name="Courier" size="8" color="#5555AA">\1</font>', text)
    return text


def _draw_header_footer(canvas, doc):
    """
    Desenha cabeçalho e rodapé em cada página do PDF.

    Cabeçalho: logo (escudo) + "SecHeaders" à esquerda, linha separadora.
    Rodapé:    "Relatório gerado via SecHeaders" centralizado + nº página.
    """
    canvas.saveState()
    page_w, page_h = A4
    margin_x = 20 * mm

    # ════════════ HEADER ════════════
    header_y = page_h - 16 * mm
    icon_size = 22

    # Logo mini
    if _DOCUMENT_LOGO:
        canvas.drawImage(
            _DOCUMENT_LOGO,
            margin_x, header_y - icon_size / 2,
            width=icon_size, height=icon_size,
            preserveAspectRatio=True,
        )

    # Texto "Sec" em roxo (primary-400: #818cf8) + "Headers" em escuro
    text_x = margin_x + icon_size + 5
    text_y = header_y - 3.5
    canvas.setFont("Helvetica-Bold", 10)
    canvas.setFillColor(colors.Color(0.506, 0.549, 0.973))   # #818cf8
    canvas.drawString(text_x, text_y, "Sec")
    sec_width = canvas.stringWidth("Sec", "Helvetica-Bold", 10)
    canvas.setFillColor(colors.Color(0.2, 0.2, 0.25))
    canvas.drawString(text_x + sec_width, text_y, "Headers")

    # Linha fina separadora
    canvas.setStrokeColor(colors.Color(0.82, 0.82, 0.88))
    canvas.setLineWidth(0.5)
    line_y = header_y - icon_size / 2 - 3
    canvas.line(margin_x, line_y, page_w - margin_x, line_y)

    # ════════════ FOOTER ════════════
    footer_y = 12 * mm

    # Linha fina separadora
    canvas.setStrokeColor(colors.Color(0.82, 0.82, 0.88))
    canvas.setLineWidth(0.5)
    canvas.line(margin_x, footer_y + 6, page_w - margin_x, footer_y + 6)

    # Logo mini no rodapé
    footer_icon_size = 12
    label = "Relatório gerado via SecHeaders"
    canvas.setFont("Helvetica", 7.5)
    text_w = canvas.stringWidth(label, "Helvetica", 7.5)
    total_w = footer_icon_size + 4 + text_w
    start_x = (page_w - total_w) / 2

    if _DOCUMENT_LOGO:
        canvas.drawImage(
            _DOCUMENT_LOGO,
            start_x, footer_y - footer_icon_size / 2 - 1,
            width=footer_icon_size, height=footer_icon_size,
            preserveAspectRatio=True,
        )

    canvas.setFillColor(colors.Color(0.45, 0.45, 0.5))
    canvas.drawString(start_x + footer_icon_size + 4, footer_y - 4, label)

    # Número da página à direita
    page_num = canvas.getPageNumber()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.Color(0.55, 0.55, 0.6))
    canvas.drawRightString(page_w - margin_x, footer_y - 4, f"Página {page_num}")

    canvas.restoreState()


def generate_pdf(analysis_data: dict) -> bytes:
    """
    Gera o PDF do relatório de análise.

    Args:
        analysis_data: dict completo retornado pelo endpoint /analyze
            Espera campos: url, score, classification, headers, explanations, summary

    Returns:
        bytes do PDF gerado
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=6,
        textColor=colors.Color(0.15, 0.15, 0.15),
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.Color(0.4, 0.4, 0.4),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.Color(0.2, 0.2, 0.2),
    )
    subheading_style = ParagraphStyle(
        "CustomSubHeading",
        parent=styles["Heading3"],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.Color(0.25, 0.25, 0.25),
    )
    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.Color(0.5, 0.5, 0.5),
    )
    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.Color(0.2, 0.2, 0.2),
        backColor=colors.Color(0.94, 0.94, 0.96),
        borderColor=colors.Color(0.8, 0.8, 0.85),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6,
    )
    # Estilos para as seções de análise
    section_header_colors = {
        "O que é este header": colors.Color(0.2, 0.5, 0.8),   # Azul
        "Risco real": colors.Color(0.9, 0.5, 0.0),              # Laranja
        "Exemplos de ataque": colors.Color(0.8, 0.2, 0.2),      # Vermelho
        "Como corrigir": colors.Color(0.2, 0.7, 0.3),           # Verde
        "Teste de validação": colors.Color(0.5, 0.3, 0.7),      # Roxo
    }

    elements = []

    # ── Cabeçalho ──
    elements.append(Paragraph("Relatório de Análise de Security Headers", title_style))
    elements.append(
        Paragraph(
            f"Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
            subtitle_style,
        )
    )
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.8, 0.8, 0.8)))
    elements.append(Spacer(1, 8))

    # ── Informações gerais ──
    url = analysis_data.get("url", "N/A")
    score = analysis_data.get("score", {}).get("total_score", 0)
    classification = analysis_data.get("score", {}).get("classification", "N/A")
    cls_color = CLASSIFICATION_COLORS.get(classification, colors.black)

    elements.append(Paragraph(f"<b>URL analisada:</b> {url}", body_style))
    elements.append(
        Paragraph(
            f"<b>Score:</b> {score}/100 — "
            f"<font color='#{cls_color.hexval()[2:]}'><b>{classification}</b></font>",
            body_style,
        )
    )
    elements.append(Spacer(1, 10))

    # ── Resumo (LLM) ──
    summary = analysis_data.get("summary", "")
    if summary:
        elements.append(Paragraph("Relatório Executivo de Segurança", heading_style))
        _render_markdown_to_elements(summary, elements, body_style, code_style, subheading_style, section_header_colors)
        elements.append(Spacer(1, 6))

    # ── Tabela de headers ──
    elements.append(Paragraph("Resultado por Header", heading_style))

    table_data = [["Header", "Status", "Severidade", "Problemas"]]
    headers_info = analysis_data.get("headers", {})

    for key, header_data in headers_info.items():
        name = header_data.get("name", key)
        present = header_data.get("present", False)
        severity = header_data.get("severity", "info")
        issues = header_data.get("issues", [])

        status = "Presente" if present else "Ausente"
        issues_text = "; ".join(issues) if issues else "Nenhum problema"

        # Trunca texto longo para caber na tabela
        if len(issues_text) > 120:
            issues_text = issues_text[:117] + "..."

        table_data.append([
            Paragraph(f"<b>{name}</b>", small_style),
            status,
            severity.upper(),
            Paragraph(issues_text, small_style),
        ])

    table = Table(table_data, colWidths=[95, 55, 65, 280])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.2, 0.3, 0.5)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ALIGN", (1, 0), (2, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 12))

    # ── Explicações detalhadas do LLM ──
    explanations = analysis_data.get("explanations", {})
    if explanations:
        elements.append(Paragraph("Análise Detalhada por Header", heading_style))

        for key, explanation in explanations.items():
            if not explanation:
                continue

            header_data = headers_info.get(key, {})
            name = header_data.get("name", key)
            severity = header_data.get("severity", "info")
            sev_color = SEVERITY_COLORS.get(severity, colors.gray)

            elements.append(
                Paragraph(
                    f"<font color='#{sev_color.hexval()[2:]}'><b>[{severity.upper()}]</b></font> {name}",
                    ParagraphStyle("HeaderDetail", parent=body_style, fontSize=12, spaceBefore=14, spaceAfter=4),
                )
            )
            elements.append(HRFlowable(width="100%", thickness=0.5, color=sev_color, spaceAfter=6))

            # Render structured markdown sections
            _render_markdown_to_elements(explanation, elements, body_style, code_style, subheading_style, section_header_colors)
            elements.append(Spacer(1, 8))

    # ── Rodapé ──
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.Color(0.8, 0.8, 0.8)))
    elements.append(
        Paragraph(
            "Relatório gerado automaticamente por SecHeaders — Ferramenta de Análise de Security Headers com IA<br/>"
            "Os exemplos de ataque são para uso exclusivo em ambiente controlado de teste (Blue Team).",
            ParagraphStyle("Footer", parent=small_style, alignment=TA_CENTER, spaceBefore=8),
        )
    )

    doc.build(elements, onFirstPage=_draw_header_footer, onLaterPages=_draw_header_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
