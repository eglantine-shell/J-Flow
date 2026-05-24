param(
  [Parameter(Mandatory = $true)]
  [string]$SourceIcon,

  [Parameter(Mandatory = $true)]
  [string]$TargetPng,

  [Parameter(Mandatory = $true)]
  [string]$TargetIco
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-IconPngBytes {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $radius = [Math]::Max(4, [Math]::Round($Size * 0.18))
    $clipPath = New-RoundedRectanglePath -X 0 -Y 0 -Width $Size -Height $Size -Radius $radius

    try {
      $graphics.SetClip($clipPath)
      $graphics.DrawImage($Source, 0, 0, $Size, $Size)
    } finally {
      $clipPath.Dispose()
    }

    $stream = New-Object System.IO.MemoryStream

    try {
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      return $stream.ToArray()
    } finally {
      $stream.Dispose()
    }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}
$source = [System.Drawing.Bitmap]::FromFile($SourceIcon)

try {
  $targetDirectory = Split-Path -Parent $TargetPng
  New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

  $baseBytes = New-IconPngBytes -Source $source -Size 1024
  [System.IO.File]::WriteAllBytes($TargetPng, $baseBytes)

  $sizes = @(16, 24, 32, 48, 64, 128, 256)
  $frames = @()

  foreach ($size in $sizes) {
    $frames += ,@{
      Size = $size
      Bytes = New-IconPngBytes -Source $source -Size $size
    }
  }

  $stream = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter $stream

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$frames.Count)

    $offset = 6 + ($frames.Count * 16)

    foreach ($frame in $frames) {
      $sizeByte = if ($frame["Size"] -eq 256) { 0 } else { $frame["Size"] }
      $writer.Write([byte]$sizeByte)
      $writer.Write([byte]$sizeByte)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$frame["Bytes"].Length)
      $writer.Write([UInt32]$offset)
      $offset += $frame["Bytes"].Length
    }

    foreach ($frame in $frames) {
      $bytes = [byte[]]$frame["Bytes"]
      $stream.Write($bytes, 0, $bytes.Length)
    }

    [System.IO.File]::WriteAllBytes($TargetIco, $stream.ToArray())
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
} finally {
  $source.Dispose()
}