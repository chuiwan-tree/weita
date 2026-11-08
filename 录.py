# 第二个 09:30：用无头浏览器打开网页，按六张图的解一关关走，录成视频给梓韬（他说"直接给我录那个 play through video"）
import json, sys, asyncio
from playwright.sync_api import sync_playwright
cases = json.load(open('/Users/grow/碰/读它/喂它一口/test/cases.json'))['cases']
sols = [cases[i]['path'] for i in (0, 401, 802, 1203, 1604, 2005)]
KEY = {'U': 'ArrowUp', 'D': 'ArrowDown', 'L': 'ArrowLeft', 'R': 'ArrowRight', '.': ' ', 'X': 'x'}
url = sys.argv[1] if len(sys.argv) > 1 else 'https://chuiwan-tree.github.io/weita/'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1120, 'height': 680}, record_video_dir='/tmp/weita-video', record_video_size={'width': 1120, 'height': 680})
    pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(2500)
    for i, path in enumerate(sols):
        if i: pg.keyboard.press('Enter'); pg.wait_for_timeout(2200)
        for k in path:
            pg.keyboard.press(KEY[k]); pg.wait_for_timeout(1100 if k == 'X' else 750)
        print(i + 1, pg.inner_text('#msg'))
        pg.wait_for_timeout(2200)
    pg.screenshot(path='/tmp/weita-last.png')
    ctx.close(); b.close()
