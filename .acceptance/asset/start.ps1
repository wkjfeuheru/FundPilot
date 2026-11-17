$ErrorActionPreference='Stop'
$root='F:\python project\FA\Tougu-platform'
$config=(docker inspect tougu-mysql | ConvertFrom-Json)[0]
$secret=($config.Config.Env | Where-Object { $_.StartsWith('MYSQL_ROOT_PASSWORD=') }).Substring(20)
$env:DB_USERNAME='root'
$env:DB_PASSWORD=$secret
$env:DB_URL='jdbc:mysql://127.0.0.1:3306/tougu_auth_validation_20261116?characterEncoding=UTF-8&connectionTimeZone=UTC&connectTimeout=5000&socketTimeout=30000&sslMode=DISABLED&allowPublicKeyRetrieval=true'
Copy-Item -LiteralPath "$root\web-ai-tougu\target\web-ai-tougu-0.0.1-SNAPSHOT.jar" -Destination "$root\.acceptance\asset\demo-app.jar"
$p=Start-Process java -ArgumentList '-jar',"`"$root\.acceptance\asset\demo-app.jar`"",'--server.port=18082' -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\.acceptance\asset\server.log" -RedirectStandardError "$root\.acceptance\asset\server-error.log"
$p.Id | Set-Content "$root\.acceptance\asset\backend.pid"
Remove-Item Env:DB_PASSWORD
$v=Start-Process node -ArgumentList "`"$root\frontend\node_modules\vite\bin\vite.js`"",'--config','../.acceptance/asset/vite.config.mjs','--mode','investor','--host','127.0.0.1' -WorkingDirectory "$root\frontend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\.acceptance\asset\vite.log" -RedirectStandardError "$root\.acceptance\asset\vite-error.log"
$v.Id | Set-Content "$root\.acceptance\asset\frontend.pid"
Write-Output "Asset preview processes launched"
