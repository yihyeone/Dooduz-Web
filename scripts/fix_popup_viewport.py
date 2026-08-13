from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

old = '.sheet{position:relative;width:min(460px,calc(100% - 28px));max-width:none;margin:max(64px,8vh) auto auto;border:0;border-radius:24px;background:var(--paper);padding:18px 58px 24px;color:var(--brown);overflow:visible}'
new = '.sheet{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(460px,calc(100% - 28px));max-width:none;max-height:calc(100dvh - 28px);margin:0;border:0;border-radius:24px;background:var(--paper);padding:18px 58px 24px;color:var(--brown);overflow:auto}'

if old not in text:
    raise SystemExit("Target .sheet CSS rule was not found; index.html was not changed.")

path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Popup viewport CSS updated successfully.")
