# build-offline.ps1
$ImageName = "specflow-offline"
$OutputFile = "specflow-offline.tar"

Write-Host "Building Docker image: $ImageName..."
docker build -t $ImageName .

if ($?) {
    Write-Host "Build successful."
    Write-Host "Saving image to $OutputFile..."
    docker save -o $OutputFile $ImageName
    
    if ($?) {
        Write-Host "Successfully saved image to $OutputFile"
    } else {
        Write-Host "Error saving image."
        exit 1
    }
} else {
    Write-Host "Build failed."
    exit 1
}
