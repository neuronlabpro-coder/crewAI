$procs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" -and $_.Path -like "*node*"
}

if ($procs) {
    $procs | Stop-Process -Force
    Write-Host "Panel stopped." -ForegroundColor Yellow
} else {
    Write-Host "No Node.js process found running." -ForegroundColor Gray
}
