Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path "attached_assets/ng-travels-logo.png").Path
$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

Write-Host "Source image loaded: $($sourceImg.Width)x$($sourceImg.Height)"

function Resize-Image($src, $targetW, $targetH, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $targetW, $targetH)
    $g.Dispose()
    
    $destDir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $destPath ($($targetW)x$($targetH))"
}

function Create-Foreground($src, $canvasSize, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale logo to ~70% of canvas so it's safely inside adaptive icon mask
    $iconSize = [int]($canvasSize * 0.70)
    $offset = [int](($canvasSize - $iconSize) / 2)
    $g.DrawImage($src, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()

    $destDir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Foreground: $destPath ($($canvasSize)x$($canvasSize))"
}

$resBase = "artifacts/ng-travels/android/app/src/main/res"

$densities = @(
    @{ Name = "mdpi"; LauncherSize = 48; ForegroundSize = 108 },
    @{ Name = "hdpi"; LauncherSize = 72; ForegroundSize = 162 },
    @{ Name = "xhdpi"; LauncherSize = 96; ForegroundSize = 216 },
    @{ Name = "xxhdpi"; LauncherSize = 144; ForegroundSize = 324 },
    @{ Name = "xxxhdpi"; LauncherSize = 192; ForegroundSize = 432 }
)

foreach ($d in $densities) {
    $folder = "$resBase/mipmap-$($d.Name)"
    # Legacy launcher
    Resize-Image $sourceImg $d.LauncherSize $d.LauncherSize "$folder/ic_launcher.png"
    Resize-Image $sourceImg $d.LauncherSize $d.LauncherSize "$folder/ic_launcher_round.png"
    # Adaptive foreground
    Create-Foreground $sourceImg $d.ForegroundSize "$folder/ic_launcher_foreground.png"
}

# Also update web public directory assets
Resize-Image $sourceImg 512 512 "artifacts/ng-travels/public/logo.png"
Resize-Image $sourceImg 192 192 "artifacts/ng-travels/public/favicon.png"
Resize-Image $sourceImg 64 64 "artifacts/ng-travels/public/favicon-64.png"
Resize-Image $sourceImg 32 32 "artifacts/ng-travels/public/favicon-32.png"
Copy-Item "attached_assets/ng-travels-logo.png" -Destination "artifacts/ng-travels/public/ng-travels-logo.png" -Force

$sourceImg.Dispose()
Write-Host "All Android mipmap icons and web favicons generated successfully!"
