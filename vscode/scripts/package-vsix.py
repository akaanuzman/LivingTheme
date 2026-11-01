#!/usr/bin/env python3
"""Package the tested darwin-arm64 runtime as a standard VSIX/OPC archive."""
from pathlib import Path
import json,sys,zipfile
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parent.parent
m=json.loads((root/'package.json').read_text())
target=Path(sys.argv[1]) if len(sys.argv)>1 else root/f'living-terminal-{m["version"]}-darwin-arm64.vsix'
meta=f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
<Metadata><Identity Language="en-US" Id="{m['name']}" Version="{m['version']}" Publisher="{m['publisher']}" TargetPlatform="darwin-arm64"/>
<DisplayName>{escape(m['displayName'])}</DisplayName><Description xml:space="preserve">{escape(m['description'])}</Description>
<Tags>terminal,claude,themes,macOS</Tags><Categories>Other</Categories><GalleryFlags>Public</GalleryFlags><Properties>
<Property Id="Microsoft.VisualStudio.Code.Engine" Value="{escape(m['engines']['vscode'])}"/>
<Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui"/><Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true"/>
<Property Id="Microsoft.VisualStudio.Code.PreRelease" Value="false"/></Properties></Metadata>
<Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/>
<Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
<Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
<Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/media/icon.png" Addressable="true"/></Assets></PackageManifest>'''
types='''<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="cjs" ContentType="application/javascript"/><Default Extension="css" ContentType="text/css"/><Default Extension="md" ContentType="text/markdown"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/><Default Extension="node" ContentType="application/octet-stream"/><Default Extension="vsixmanifest" ContentType="text/xml"/><Default Extension="" ContentType="application/octet-stream"/></Types>'''
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
 archive.writestr('extension.vsixmanifest',meta);archive.writestr('[Content_Types].xml',types)
 files=[root/'package.json',root/'README.md',root/'LICENSE']
 for folder in ['dist','media','node_modules/node-pty/lib','node_modules/node-pty/prebuilds/darwin-arm64']:
  files.extend(p for p in (root/folder).rglob('*') if p.is_file())
 files.extend([root/'node_modules/node-pty/package.json',root/'node_modules/node-pty/LICENSE'])
 for file in files:
  if not file.is_file():raise RuntimeError('Missing runtime asset: '+str(file))
  archive.write(file,'extension/'+str(file.relative_to(root)))
with zipfile.ZipFile(target) as archive:
 assert archive.testzip() is None
 assert 'extension/node_modules/node-pty/prebuilds/darwin-arm64/pty.node' in archive.namelist()
 assert (archive.getinfo('extension/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper').external_attr>>16)&0o111
print(target)
