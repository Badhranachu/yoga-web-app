"""
Renders a Receipt as a styled PDF, matching the app's brand palette
(dark ink #2B241E, gold accent #D8B46A, sand background #F5EFE5).
Kept separate from views.py so the layout/styling can grow without
cluttering the request-handling code.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

INK = colors.HexColor('#2B241E')
GOLD = colors.HexColor('#D8B46A')
SAND = colors.HexColor('#F5EFE5')
BROWN = colors.HexColor('#786A58')

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 20 * mm


def _draw_header(c: canvas.Canvas) -> float:
    """Sand band with the studio name/wordmark. Returns the y-coordinate
    where the header ends, so callers know where to start the body."""
    header_height = 42 * mm
    top = PAGE_HEIGHT

    c.setFillColor(SAND)
    c.rect(0, top - header_height, PAGE_WIDTH, header_height, stroke=0, fill=1)

    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 26)
    c.drawString(MARGIN, top - 24 * mm, 'Harmony')
    c.setFillColor(GOLD)
    c.setFont('Helvetica-Oblique', 26)
    c.drawString(MARGIN + 110, top - 24 * mm, 'Fusion Studio')

    c.setFillColor(BROWN)
    c.setFont('Helvetica', 9)
    c.drawString(MARGIN, top - 32 * mm, 'PAYMENT RECEIPT')

    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.line(MARGIN, top - header_height, PAGE_WIDTH - MARGIN, top - header_height)

    return top - header_height


def _draw_field(c: canvas.Canvas, x: float, y: float, label: str, value: str) -> None:
    c.setFillColor(BROWN)
    c.setFont('Helvetica', 8)
    c.drawString(x, y, label.upper())
    c.setFillColor(INK)
    c.setFont('Helvetica', 11)
    c.drawString(x, y - 14, value)


def render_receipt_pdf(receipt) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    body_top = _draw_header(c)
    cursor = body_top - 18 * mm

    # Receipt number + status pill, side by side.
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(MARGIN, cursor, receipt.receipt_number)

    status_label = receipt.get_status_display().upper()
    c.setFont('Helvetica-Bold', 8)
    status_width = c.stringWidth(status_label, 'Helvetica-Bold', 8) + 16
    pill_x = PAGE_WIDTH - MARGIN - status_width
    c.setFillColor(GOLD)
    c.roundRect(pill_x, cursor - 4, status_width, 16, 8, stroke=0, fill=1)
    c.setFillColor(INK)
    c.drawCentredString(pill_x + status_width / 2, cursor, status_label)

    cursor -= 12 * mm

    # Two-column field grid: billed-to / payment details.
    col_a = MARGIN
    col_b = PAGE_WIDTH / 2 + 4 * mm

    _draw_field(c, col_a, cursor, 'Billed To', receipt.user_name or receipt.user_email)
    _draw_field(c, col_b, cursor, 'Email', receipt.user_email)
    cursor -= 16 * mm

    _draw_field(c, col_a, cursor, 'Payment Type', receipt.get_payment_type_display())
    _draw_field(c, col_b, cursor, 'Date', receipt.payment_date.strftime('%d %b %Y, %I:%M %p'))
    cursor -= 16 * mm

    _draw_field(c, col_a, cursor, 'Transaction ID', receipt.transaction.transaction_id)
    _draw_field(c, col_b, cursor, 'Provider', receipt.transaction.provider or '-')
    cursor -= 20 * mm

    # Amount panel — the visual focal point.
    panel_height = 28 * mm
    c.setFillColor(SAND)
    c.roundRect(MARGIN, cursor - panel_height, PAGE_WIDTH - 2 * MARGIN, panel_height, 6, stroke=0, fill=1)

    c.setFillColor(BROWN)
    c.setFont('Helvetica', 9)
    c.drawString(MARGIN + 8 * mm, cursor - 9 * mm, 'AMOUNT PAID')

    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 24)
    c.drawString(MARGIN + 8 * mm, cursor - 20 * mm, f'{receipt.amount} {receipt.currency}')

    cursor -= panel_height + 16 * mm

    # Footer.
    c.setStrokeColor(colors.HexColor('#E5DCC9'))
    c.setLineWidth(0.6)
    c.line(MARGIN, cursor, PAGE_WIDTH - MARGIN, cursor)
    cursor -= 8 * mm

    c.setFillColor(BROWN)
    c.setFont('Helvetica', 8)
    c.drawString(MARGIN, cursor, 'Thank you for practicing with Harmony Fusion Studio.')
    c.drawRightString(PAGE_WIDTH - MARGIN, cursor, 'This is a system-generated receipt.')

    c.showPage()
    c.save()
    return buffer.getvalue()
