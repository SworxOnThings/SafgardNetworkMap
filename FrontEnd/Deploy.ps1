$sourceDir = $PSScriptRoot

# Read API key from file
$apiKey = Get-Content -Path "mapsApiKey.txt" -Raw

$destinationDir = "C:\xampp\htdocs\SafgardNetworkMapFE"

# Ensure destination directory exists
if (-not (Test-Path $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir -Force
}

# Define source and create the destination path; we don't want to break the code below which relies on destinationDir
$fileWithApiKey = "index.html"
$fileWithPlaceholder = Join-Path $destinationDir $fileWithApiKey 

# this is what actually places the file in the path; we needed fileWithPlaceholder for this to work
Copy-Item -Path $fileWithApiKey -Destination $fileWithPlaceholder

# Replace placeholder with API key in the copied file
(Get-Content -Path $fileWithPlaceholder) -replace "__API_KEY__", $apiKey | Set-Content -Path $fileWithPlaceholder

# List of files to copy from the script's directory
$filesToCopy = @("index.js", "style.css", "notificationMenu.js", "DevicePanel.js")

foreach ($file in $filesToCopy) {
    $srcPath = Join-Path $sourceDir $file
    $destPath = Join-Path $destinationDir $file

    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $destPath -Force
        Write-Host "Copied $file"
    } else {
        Write-Warning "File not found: $file"
    }
}
