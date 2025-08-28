# RemoteCursor Health Monitor
# Real-time monitoring for development environment

param(
    [int]$Interval = 30,  # Check interval in seconds
    [string]$LogFile = "health-monitor.log",
    [switch]$Continuous = $false
)

# Configuration
$config = @{
    CriticalThresholds = @{
        CPUUsage = 90
        MemoryUsage = 95
        DiskUsage = 95
        ProcessCount = 100
    }
    WarningThresholds = @{
        CPUUsage = 80
        MemoryUsage = 85
        DiskUsage = 90
        ProcessCount = 50
    }
    Components = @("desktop-agent", "websocket-bridge", "mobile-app")
    Ports = @(3000, 8080, 3001)
}

# Initialize monitoring
$startTime = Get-Date
$errorCount = 0
$warningCount = 0

function Write-HealthLog {
    param(
        [string]$Level,
        [string]$Message,
        [object]$Data = $null
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @{
        timestamp = $timestamp
        level = $Level
        message = $Message
        data = $Data
    }
    
    $logEntry | ConvertTo-Json -Depth 3 | Out-File -FilePath $LogFile -Append
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } elseif ($Level -eq "WARNING") { "Yellow" } else { "Green" })
}

function Test-SystemHealth {
    $healthReport = @{
        timestamp = Get-Date
        checks = @()
        overall = "HEALTHY"
    }
    
    # Check CPU Usage
    try {
        $cpuUsage = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples[0].CookedValue
        $cpuStatus = if ($cpuUsage -gt $config.CriticalThresholds.CPUUsage) { "CRITICAL" } elseif ($cpuUsage -gt $config.WarningThresholds.CPUUsage) { "WARNING" } else { "HEALTHY" }
        
        $healthReport.checks += @{
            name = "CPU Usage"
            status = $cpuStatus
            value = [math]::Round($cpuUsage, 2)
            unit = "%"
        }
        
        if ($cpuStatus -ne "HEALTHY") {
            Write-HealthLog -Level "WARNING" -Message "High CPU usage: $([math]::Round($cpuUsage, 2))%" -Data @{ cpuUsage = $cpuUsage }
        }
    }
    catch {
        Write-HealthLog -Level "ERROR" -Message "Failed to check CPU usage" -Data @{ error = $_.Exception.Message }
    }
    
    # Check Memory Usage
    try {
        $memoryUsage = (Get-Counter '\Memory\% Committed Bytes In Use' -ErrorAction Stop).CounterSamples[0].CookedValue
        $memoryStatus = if ($memoryUsage -gt $config.CriticalThresholds.MemoryUsage) { "CRITICAL" } elseif ($memoryUsage -gt $config.WarningThresholds.MemoryUsage) { "WARNING" } else { "HEALTHY" }
        
        $healthReport.checks += @{
            name = "Memory Usage"
            status = $memoryStatus
            value = [math]::Round($memoryUsage, 2)
            unit = "%"
        }
        
        if ($memoryStatus -ne "HEALTHY") {
            Write-HealthLog -Level "WARNING" -Message "High memory usage: $([math]::Round($memoryUsage, 2))%" -Data @{ memoryUsage = $memoryUsage }
        }
    }
    catch {
        Write-HealthLog -Level "ERROR" -Message "Failed to check memory usage" -Data @{ error = $_.Exception.Message }
    }
    
    # Check Disk Space
    try {
        $diskSpace = Get-WmiObject -Class Win32_LogicalDisk -ErrorAction Stop | Where-Object { $_.DeviceID -eq "C:" }
        $diskUsage = (($diskSpace.Size - $diskSpace.FreeSpace) / $diskSpace.Size) * 100
        $diskStatus = if ($diskUsage -gt $config.CriticalThresholds.DiskUsage) { "CRITICAL" } elseif ($diskUsage -gt $config.WarningThresholds.DiskUsage) { "WARNING" } else { "HEALTHY" }
        
        $healthReport.checks += @{
            name = "Disk Usage"
            status = $diskStatus
            value = [math]::Round($diskUsage, 2)
            unit = "%"
            freeSpace = [math]::Round($diskSpace.FreeSpace / 1GB, 2)
            freeSpaceUnit = "GB"
        }
        
        if ($diskStatus -ne "HEALTHY") {
            Write-HealthLog -Level "WARNING" -Message "High disk usage: $([math]::Round($diskUsage, 2))% (Free: $([math]::Round($diskSpace.FreeSpace / 1GB, 2)) GB)" -Data @{ diskUsage = $diskUsage; freeSpace = $diskSpace.FreeSpace }
        }
    }
    catch {
        Write-HealthLog -Level "ERROR" -Message "Failed to check disk space" -Data @{ error = $_.Exception.Message }
    }
    
    # Check Node.js Processes
    try {
        $nodeProcesses = Get-Process -ErrorAction Stop | Where-Object { $_.ProcessName -like "*node*" }
        $processCount = $nodeProcesses.Count
        $processStatus = if ($processCount -gt $config.CriticalThresholds.ProcessCount) { "CRITICAL" } elseif ($processCount -gt $config.WarningThresholds.ProcessCount) { "WARNING" } else { "HEALTHY" }
        
        $healthReport.checks += @{
            name = "Node.js Processes"
            status = $processStatus
            value = $processCount
            unit = "processes"
            details = $nodeProcesses | Select-Object Id, ProcessName, CPU, WorkingSet
        }
        
        if ($processStatus -ne "HEALTHY") {
            Write-HealthLog -Level "WARNING" -Message "High number of Node.js processes: $processCount" -Data @{ processCount = $processCount; processes = $nodeProcesses }
        }
    }
    catch {
        Write-HealthLog -Level "ERROR" -Message "Failed to check Node.js processes" -Data @{ error = $_.Exception.Message }
    }
    
    # Check Network Ports
    foreach ($port in $config.Ports) {
        try {
            $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction Stop
            $portStatus = if ($connection.TcpTestSucceeded) { "HEALTHY" } else { "CRITICAL" }
            
            $healthReport.checks += @{
                name = "Port $port"
                status = $portStatus
                value = if ($connection.TcpTestSucceeded) { "OPEN" } else { "CLOSED" }
            }
            
            if ($portStatus -eq "CRITICAL") {
                Write-HealthLog -Level "ERROR" -Message "Port $port is not accessible" -Data @{ port = $port; connection = $connection }
            }
        }
        catch {
            Write-HealthLog -Level "ERROR" -Message "Failed to check port $port" -Data @{ port = $port; error = $_.Exception.Message }
        }
    }
    
    # Check Component Directories
    foreach ($component in $config.Components) {
        try {
            $componentPath = ".\$component"
            if (Test-Path $componentPath) {
                $packageJsonPath = Join-Path $componentPath "package.json"
                if (Test-Path $packageJsonPath) {
                    $healthReport.checks += @{
                        name = "Component: $component"
                        status = "HEALTHY"
                        value = "Present"
                        hasPackageJson = $true
                    }
                } else {
                    $healthReport.checks += @{
                        name = "Component: $component"
                        status = "WARNING"
                        value = "Missing package.json"
                        hasPackageJson = $false
                    }
                    Write-HealthLog -Level "WARNING" -Message "Component $component missing package.json" -Data @{ component = $component; path = $componentPath }
                }
            } else {
                $healthReport.checks += @{
                    name = "Component: $component"
                    status = "CRITICAL"
                    value = "Missing"
                    hasPackageJson = $false
                }
                Write-HealthLog -Level "ERROR" -Message "Component directory $component not found" -Data @{ component = $component; path = $componentPath }
            }
        }
        catch {
            Write-HealthLog -Level "ERROR" -Message "Failed to check component $component" -Data @{ component = $component; error = $_.Exception.Message }
        }
    }
    
    # Determine overall status
    $criticalChecks = $healthReport.checks | Where-Object { $_.status -eq "CRITICAL" }
    $warningChecks = $healthReport.checks | Where-Object { $_.status -eq "WARNING" }
    
    if ($criticalChecks.Count -gt 0) {
        $healthReport.overall = "CRITICAL"
        $script:errorCount++
    } elseif ($warningChecks.Count -gt 0) {
        $healthReport.overall = "WARNING"
        $script:warningCount++
    }
    
    return $healthReport
}

function Show-HealthSummary {
    param([object]$HealthReport)
    
    $criticalCount = ($HealthReport.checks | Where-Object { $_.status -eq "CRITICAL" }).Count
    $warningCount = ($HealthReport.checks | Where-Object { $_.status -eq "WARNING" }).Count
    $healthyCount = ($HealthReport.checks | Where-Object { $_.status -eq "HEALTHY" }).Count
    
    Write-Host "`n=== HEALTH SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Overall Status: $($HealthReport.overall)" -ForegroundColor $(if ($HealthReport.overall -eq "CRITICAL") { "Red" } elseif ($HealthReport.overall -eq "WARNING") { "Yellow" } else { "Green" })
    Write-Host "Critical Issues: $criticalCount" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Gray" })
    Write-Host "Warnings: $warningCount" -ForegroundColor $(if ($warningCount -gt 0) { "Yellow" } else { "Gray" })
    Write-Host "Healthy Checks: $healthyCount" -ForegroundColor Green
    Write-Host "Total Checks: $($HealthReport.checks.Count)" -ForegroundColor Gray
    Write-Host "========================`n" -ForegroundColor Cyan
}

# Main monitoring loop
Write-Host "Starting RemoteCursor Health Monitor..." -ForegroundColor Green
Write-Host "Log file: $LogFile" -ForegroundColor Gray
Write-Host "Check interval: $Interval seconds" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop monitoring`n" -ForegroundColor Gray

do {
    try {
        $healthReport = Test-SystemHealth
        Show-HealthSummary -HealthReport $healthReport
        
        # Save detailed report
        $reportFile = "health-report-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').json"
        $healthReport | ConvertTo-Json -Depth 5 | Out-File $reportFile
        
        if ($Continuous) {
            Start-Sleep -Seconds $Interval
        }
    }
    catch {
        Write-HealthLog -Level "ERROR" -Message "Health check failed" -Data @{ error = $_.Exception.Message; stackTrace = $_.Exception.StackTrace }
        if ($Continuous) {
            Start-Sleep -Seconds $Interval
        }
    }
} while ($Continuous)

# Final summary
$runtime = (Get-Date) - $startTime
Write-Host "`n=== MONITORING SUMMARY ===" -ForegroundColor Cyan
Write-Host "Runtime: $($runtime.Hours)h $($runtime.Minutes)m $($runtime.Seconds)s" -ForegroundColor Gray
Write-Host "Total Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Gray" })
Write-Host "Total Warnings: $warningCount" -ForegroundColor $(if ($warningCount -gt 0) { "Yellow" } else { "Gray" })
Write-Host "Log file: $LogFile" -ForegroundColor Gray
Write-Host "===========================" -ForegroundColor Cyan
