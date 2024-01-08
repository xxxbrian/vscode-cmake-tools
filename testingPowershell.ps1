Copy-Item $(Build.SourcesDirectory)/vscode-cmake-tools/syntaxes/* $(Build.SourcesDirectory)/VS-Platform/src/Productivity/TextMate/VSWindows/Setup/Starterkit/Extensions/cmake/Syntaxes
git diff
$differences = git diff --exit-code
if ( $differences )
{
    git checkout -b updatingCMakeTextmates/$(Date:yyMMdd)$(Rev:rrr)
    git add *; git commit -m "updating textmate"
    git push --set-upstream origin updatingCMakeTextmates/$(Date:yyMMdd)$(Rev:rrr)
    $env:AZURE_DEVOPS_EXT_PAT = $(System.AccessToken)
    az repos pr create --draft true --title "[Textmate AutoPR] $(Date:yyMMdd)$(Rev:rrr)" --org $(orgUrl) -p DevDiv
}
else
{
    Write-Output "no differences"
}