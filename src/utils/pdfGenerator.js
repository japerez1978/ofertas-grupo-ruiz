import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { getStageBadge, formatCurrency } from './helpers'

/**
 * Genera un presupuesto PDF profesional para una oferta.
 */
export function generatePDF(oferta) {
  const p = oferta.properties || {}
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // ── Colors ──
  const navy = [12, 31, 74]       // #0c1f4a
  const accent = [41, 182, 246]    // #29b6f6
  const darkBg = [11, 17, 32]     // #0b1120
  const white = [255, 255, 255]
  const gray = [160, 170, 190]

  // ── Header background ──
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageWidth, 55, 'F')

  // Accent line
  doc.setFillColor(...accent)
  doc.rect(0, 55, pageWidth, 2, 'F')

  // ── Company name ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...white)
  doc.text('INTRANOX', margin, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...accent)
  doc.text('PRESUPUESTO / OFERTA', margin, 34)

  // ── Document info (right side) ──
  doc.setFontSize(9)
  doc.setTextColor(200, 210, 225)
  const rightX = pageWidth - margin
  doc.text(`Referencia: OF-${oferta.id?.slice(-8)?.toUpperCase() || '0000'}`, rightX, 20, { align: 'right' })
  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  doc.text(`Fecha: ${today}`, rightX, 27, { align: 'right' })

  const badge = getStageBadge(p.dealstage)
  doc.text(`Estado: ${badge.label}`, rightX, 34, { align: 'right' })

  // ── Project details section ──
  let y = 70

  doc.setFillColor(17, 24, 39)
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 40, 3, 3, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('DATOS DEL PROYECTO', margin + 6, y + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...white)

  const details = [
    ['Proyecto:', p.dealname || 'Sin nombre'],
    ['Importe:', formatCurrency(p.amount)],
    ['Fecha de cierre:', p.closedate ? new Date(p.closedate).toLocaleDateString('es-ES') : 'No definida'],
  ]

  y += 14
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gray)
    doc.text(label, margin + 6, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...white)
    doc.text(value, margin + 50, y)
    y += 7
  })

  // ── Description ──
  y += 10
  if (p.description) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...accent)
    doc.text('DESCRIPCIÓN', margin, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(200, 210, 225)

    const descLines = doc.splitTextToSize(p.description, pageWidth - margin * 2)
    doc.text(descLines, margin, y)
    y += descLines.length * 5 + 8
  }

  // ── Line items table ──
  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('DESGLOSE', margin, y)
  y += 4

  const amount = parseFloat(p.amount) || 0
  const base = amount / 1.21
  const iva = amount - base

  doc.autoTable({
    startY: y,
    head: [['Concepto', 'Cantidad', 'Precio Unitario', 'Total']],
    body: [
      [p.dealname || 'Servicio / Producto', '1', formatCurrency(base), formatCurrency(base)],
    ],
    foot: [
      ['', '', 'Base Imponible', formatCurrency(base)],
      ['', '', 'IVA (21%)', formatCurrency(iva)],
      ['', '', 'TOTAL', formatCurrency(amount)],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [220, 225, 235],
      lineColor: [40, 50, 70],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: navy,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [17, 24, 39],
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [15, 21, 35],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
  })

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 25
  doc.setFillColor(...navy)
  doc.rect(0, footerY - 5, pageWidth, 30, 'F')

  doc.setFillColor(...accent)
  doc.rect(0, footerY - 5, pageWidth, 1, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gray)
  doc.text('INTRANOX — Soluciones Industriales de Iluminación', pageWidth / 2, footerY + 4, { align: 'center' })
  doc.text('www.intranox.com · info@intranox.com', pageWidth / 2, footerY + 10, { align: 'center' })
  doc.text(`Presupuesto generado el ${today}`, pageWidth / 2, footerY + 16, { align: 'center' })

  // ── Save ──
  const filename = `Presupuesto_${(p.dealname || 'oferta').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
