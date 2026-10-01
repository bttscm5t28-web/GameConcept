#!/usr/bin/env python3
"""按游戏中实际出现的字符，把书法体/宋体裁剪成小体积 woff2（public/fonts/）。
文本有改动后重新运行：python3 tools/subset_fonts.py"""
import os, re, glob, subprocess, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.fontcache')
SRC = {
    'kai.ttf': 'https://fonts.gstatic.com/s/mashanzheng/v18/NaPecZTRCLxvwo41b4gvzkXaRMQ.ttf',
    'serif400.ttf': 'https://fonts.gstatic.com/s/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7SCqyWv.ttf',
    'serif700.ttf': 'https://fonts.gstatic.com/s/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7RlrCWv.ttf',
}
os.makedirs(CACHE, exist_ok=True)
for name, url in SRC.items():
    p = os.path.join(CACHE, name)
    if not os.path.exists(p) or os.path.getsize(p) < 100000:
        print('下载', name); urllib.request.urlretrieve(url, p)
chars = set()
files = glob.glob(os.path.join(ROOT, 'src', '**', '*.*'), recursive=True) + [os.path.join(ROOT, 'index.html')]
for f in files:
    if f.endswith(('.js', '.css', '.html')):
        chars.update(open(f, encoding='utf-8').read())
chars.update(chr(c) for c in range(0x20, 0x7f))
chars.update('，。！？、：；“”‘’（）《》「」『』…—·～【】〔〕０１２３４５６７８９一二三四五六七八九十百千万零')
chars = ''.join(sorted(c for c in chars if c.isprintable()))
txt = os.path.join(CACHE, 'chars.txt'); open(txt, 'w', encoding='utf-8').write(chars)
out = os.path.join(ROOT, 'public', 'fonts'); os.makedirs(out, exist_ok=True)
for src, dst in [('kai.ttf', 'kai.woff2'), ('serif400.ttf', 'serif.woff2'), ('serif700.ttf', 'serif-bold.woff2')]:
    subprocess.check_call(['pyftsubset', os.path.join(CACHE, src), f'--text-file={txt}', '--flavor=woff2', f'--output-file={os.path.join(out, dst)}', '--layout-features=*', '--no-hinting'])
    print(dst, os.path.getsize(os.path.join(out, dst)) // 1024, 'KB')
print('字符数', len(chars))
