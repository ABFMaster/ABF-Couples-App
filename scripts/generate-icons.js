#!/usr/bin/env node
// Generates public/icon-192.png and public/icon-512.png
// Usage: node scripts/generate-icons.js

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const CORAL = '#E8614D'
const WHITE = '#FFFFFF'
const OUT_DIR = path.join(__dirname, '..', 'public')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Rounded square background
  const radius = size * 0.22
  ctx.fillStyle = CORAL
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // "ABF" text centered
  const fontSize = Math.round(size * 0.32)
  ctx.fillStyle = WHITE
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ABF', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

for (const size of [192, 512]) {
  const buf = generateIcon(size)
  const outPath = path.join(OUT_DIR, `icon-${size}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`✓ Generated ${outPath}`)
}
