# PowerShell helper to remove `.env` from git history using git-filter-repo.
# Run this from a clone of the repo (NOT the bare mirror). Review changes before force-pushing.

if (-not (Get-Command git-filter-repo -ErrorAction SilentlyContinue)) {
    Write-Host "git-filter-repo not found. Install via: pip install git-filter-repo" -ForegroundColor Yellow
    exit 1
}

Write-Host "This will remove .env from the repository history and force-push. Continue? (y/N)" -NoNewline
$resp = Read-Host
if ($resp -ne 'y') { Write-Host "Aborted."; exit 1 }

git filter-repo --invert-paths --paths .env

Write-Host "Pruning reflog and garbage..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "Force-pushing to origin..."
git push --force --all
git push --force --tags

Write-Host "Done. Rotate any credentials that were present in .env immediately." -ForegroundColor Green
