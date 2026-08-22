import re

with open('src/controllers/ThreeController.js', 'r') as f:
    code = f.read()

# Remove the monkey patch
code = re.sub(r"// Prevent pitch-black textures.*?return texture;\n};\n", "", code, flags=re.DOTALL)

# For EVERY instance of `const textureLoader = new THREE.TextureLoader();`
# followed by `const topTex = ...` and `const bottomTex = ...`
# we will just replace the `map: topTex` and `bumpMap: topTex` with a generic regex!

# 1. Remove all topTex and bottomTex declarations
code = re.sub(r"const topTex = textureLoader\.load\([^;]+\);\n", "", code)
code = re.sub(r"const bottomTex = textureLoader\.load\([^;]+\);\n", "", code)

# 2. But we need the URLs!
# Wait, this is too hard to do generically with Regex because the URLs are lost!

