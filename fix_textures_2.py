import re

with open('src/controllers/ThreeController.js', 'r') as f:
    code = f.read()

# Fix bottomMat for almond
code = re.sub(
    r"const bottomMat = new THREE\.MeshStandardMaterial\({\n\s*map: bottomTex,\n\s*bumpMap: bottomTex,\n\s*bumpScale: 0\.05,\n\s*roughness: 0\.88,\n\s*metalness: 0\.01\n\s*}\);",
    "const bottomMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.05,\n      roughness: 0.88,\n      metalness: 0.01\n    });\n    textureLoader.load('/almond_cookie_bottom_clean.png', (tex) => {\n      bottomMat.map = tex;\n      bottomMat.bumpMap = tex;\n      bottomMat.color.setHex(0xffffff);\n      bottomMat.needsUpdate = true;\n    });",
    code
)

# And fix the muffin texture
code = re.sub(
    r"const chocoTex = textureLoader\.load\('/choco_muffin_texture\.png'\);\n\s*chocoTex\.wrapS = THREE\.RepeatWrapping;\n\s*chocoTex\.wrapT = THREE\.RepeatWrapping;\n\s*chocoTex\.repeat\.set\(4, 2\);\n\n\s*const material = new THREE\.MeshStandardMaterial\({\n\s*map: chocoTex,\n\s*roughness: 0\.95,\n\s*bumpMap: chocoTex,\n\s*bumpScale: 0\.02\n\s*}\);",
    "const material = new THREE.MeshStandardMaterial({\n      color: 0x5a2d0c,\n      roughness: 0.95,\n      bumpScale: 0.02\n    });\n    textureLoader.load('/choco_muffin_texture.png', (tex) => {\n      tex.wrapS = THREE.RepeatWrapping;\n      tex.wrapT = THREE.RepeatWrapping;\n      tex.repeat.set(4, 2);\n      material.map = tex;\n      material.bumpMap = tex;\n      material.color.setHex(0xffffff);\n      material.needsUpdate = true;\n    });",
    code
)


with open('src/controllers/ThreeController.js', 'w') as f:
    f.write(code)

