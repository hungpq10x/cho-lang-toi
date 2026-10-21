# Vẽ biểu tượng app (giỏ hàng + lá) ra các file PNG và favicon.ico.
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent

# $rounded: bo góc, nền trong suốt (favicon). Không bo góc: phủ kín (icon cài app, hệ điều hành tự bo).
function New-IconBitmap([int]$size, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.ScaleTransform($size / 512.0, $size / 512.0)
  $green = [System.Drawing.ColorTranslator]::FromHtml('#2f6b3a')
  $leaf = [System.Drawing.ColorTranslator]::FromHtml('#9fd18a')

  if ($rounded) {
    $g.Clear([System.Drawing.Color]::Transparent)
    $r = 112; $d = $r * 2
    $bg = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bg.AddArc(0, 0, $d, $d, 180, 90); $bg.AddArc(512 - $d, 0, $d, $d, 270, 90)
    $bg.AddArc(512 - $d, 512 - $d, $d, $d, 0, 90); $bg.AddArc(0, 512 - $d, $d, $d, 90, 90)
    $bg.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $green), $bg)
  } else {
    $g.Clear($green)
  }

  # Cỡ nhỏ thì nét dày hơn cho dễ nhìn
  $small = $size -le 48
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $(if ($small) { 40 } else { 26 })
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawLine($pen, 190, 220, 236, 134)
  $g.DrawLine($pen, 322, 220, 276, 134)

  $body = New-Object System.Drawing.Drawing2D.GraphicsPath
  $body.AddPolygon([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF 136, 220),
    (New-Object System.Drawing.PointF 376, 220),
    (New-Object System.Drawing.PointF 346, 404),
    (New-Object System.Drawing.PointF 166, 404)))
  $g.FillPath([System.Drawing.Brushes]::White, $body)

  $pen2 = New-Object System.Drawing.Pen $green, $(if ($small) { 30 } else { 18 })
  $pen2.StartCap = 'Round'; $pen2.EndCap = 'Round'
  $slats = if ($small) { 210, 302 } else { 200, 256, 312 }
  foreach ($x in $slats) { $g.DrawLine($pen2, $x, 268, $x, 360) }

  $leafPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $leafPath.AddBezier(246, 170, 236, 130, 260, 96, 302, 92)
  $leafPath.AddBezier(302, 92, 300, 136, 276, 162, 246, 170)
  $g.FillPath((New-Object System.Drawing.SolidBrush $leaf), $leafPath)

  $g.Dispose()
  return $bmp
}

function Save-Png([int]$size, [bool]$rounded, [string]$path) {
  $bmp = New-IconBitmap $size $rounded
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# File .ico chứa nhiều ảnh PNG (Windows Vista trở lên và mọi trình duyệt đều đọc được).
function Save-Ico([int[]]$sizes, [string]$path) {
  $images = foreach ($s in $sizes) {
    $bmp = New-IconBitmap $s $true
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    , $ms.ToArray()
  }
  $out = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter $out
  $w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]; $len = $images[$i].Length
    $w.Write([byte]($s % 256)); $w.Write([byte]($s % 256))
    $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([UInt16]1); $w.Write([UInt16]32)
    $w.Write([UInt32]$len); $w.Write([UInt32]$offset)
    $offset += $len
  }
  foreach ($img in $images) { $w.Write($img) }
  $w.Flush()
  [System.IO.File]::WriteAllBytes($path, $out.ToArray())
}

$icons = Join-Path $root 'icons'
Save-Png 192 $false (Join-Path $icons 'icon-192.png')
Save-Png 512 $false (Join-Path $icons 'icon-512.png')
Save-Png 180 $false (Join-Path $icons 'apple-touch-icon.png')
Save-Ico @(16, 32, 48) (Join-Path $root 'favicon.ico')

Get-ChildItem $icons, (Join-Path $root 'favicon.ico') | Select-Object Name, Length
