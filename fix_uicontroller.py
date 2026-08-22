import re

with open('src/controllers/UIController.js', 'r') as f:
    code = f.read()

code = re.sub(
    r"const hamburger = document\.getElementById\('btn-mobile-nav-hamburger'\);",
    "const hamburger = document.getElementById('btn-mobile-menu');",
    code
)

code = re.sub(
    r"const closeDrawer = \(\) => {\n\s*drawer\?\.classList\.remove\('active'\);\n\s*backdrop\?\.classList\.remove\('active'\);\n\s*document\.body\.style\.overflow = '';\n\s*};\n\n\s*hamburger\.addEventListener\('click', openDrawer\);",
    "const closeDrawer = () => {\n      drawer?.classList.remove('active');\n      backdrop?.classList.remove('active');\n      document.body.style.overflow = '';\n    };\n\n    if (hamburger) hamburger.addEventListener('click', openDrawer);",
    code
)


with open('src/controllers/UIController.js', 'w') as f:
    f.write(code)

