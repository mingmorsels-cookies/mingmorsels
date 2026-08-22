import re

with open("chatbot.html", "r", encoding="utf-8") as f:
    html = f.read()

scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
with open("extracted_chatbot.js", "w", encoding="utf-8") as f:
    for i, s in enumerate(scripts):
        f.write(f"// Script {i}\n")
        f.write(s)
        f.write("\n\n")
