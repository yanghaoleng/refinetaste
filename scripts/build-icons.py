"""Build the self-hosted Iconoir 7.12.1 subset at a uniform 2.5px stroke."""
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
root=ET.Element('{'+NS+'}svg')
for path in sorted((ROOT/'vendor/iconoir').glob('*.svg')):
    source=ET.parse(path).getroot()
    symbol=ET.SubElement(root,'{'+NS+'}symbol',{'id':path.stem,'viewBox':source.get('viewBox','0 0 24 24'),'fill':'none','stroke-width':'2.5'})
    for child in source:
        for node in child.iter():node.attrib.pop('stroke-width',None)
        symbol.append(child)
ET.ElementTree(root).write(ROOT/'dist/icons.svg',encoding='utf-8',xml_declaration=False)
