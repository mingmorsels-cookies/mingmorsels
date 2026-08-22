import re

with open('src/controllers/ThreeController.js', 'r') as f:
    code = f.read()

# Replace almond texture loading
code = re.sub(
    r"const textureLoader = new THREE\.TextureLoader\(\);\n\s*const topTex = textureLoader\.load\('/almond_cookie_top_clean\.png'\);\n\s*const bottomTex = textureLoader\.load\('/almond_cookie_bottom_clean\.png'\);",
    "const textureLoader = new THREE.TextureLoader();\n    let topTex, bottomTex;",
    code
)
code = re.sub(
    r"const topMat = new THREE\.MeshStandardMaterial\({\n\s*map: topTex,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.045,\n\s*roughness: 0\.80,\n\s*metalness: 0\.02\n\s*}\);",
    "const topMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.045,\n      roughness: 0.80,\n      metalness: 0.02\n    });\n    textureLoader.load('/almond_cookie_top_clean.png', (tex) => {\n      topMat.map = tex;\n      topMat.bumpMap = tex;\n      topMat.color.setHex(0xffffff);\n      topMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const sideMat = new THREE\.MeshStandardMaterial\({\n\s*color: 0xcaa268,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.025,\n\s*roughness: 0\.86,\n\s*metalness: 0\.01\n\s*}\);",
    "const sideMat = new THREE.MeshStandardMaterial({\n      color: 0xcaa268,\n      bumpScale: 0.025,\n      roughness: 0.86,\n      metalness: 0.01\n    });\n    textureLoader.load('/almond_cookie_top_clean.png', (tex) => {\n      sideMat.bumpMap = tex;\n      sideMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const bottomMat = new THREE\.MeshStandardMaterial\({\n\s*map: bottomTex,\n\s*bumpMap: bottomTex,\n\s*bumpScale: 0\.05,\n\s*roughness: 0\.88,\n\s*metalness: 0\.01\n\s*}\);",
    "const bottomMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.05,\n      roughness: 0.88,\n      metalness: 0.01\n    });\n    textureLoader.load('/almond_cookie_bottom_clean.png', (tex) => {\n      bottomMat.map = tex;\n      bottomMat.bumpMap = tex;\n      bottomMat.color.setHex(0xffffff);\n      bottomMat.needsUpdate = true;\n    });",
    code
)


# Replace rose texture loading
code = re.sub(
    r"const textureLoader = new THREE\.TextureLoader\(\);\n\s*const topTex = textureLoader\.load\('/rose_cookie_top_clean\.png'\);\n\s*const bottomTex = textureLoader\.load\('/rose_cookie_bottom_clean\.png'\);",
    "const textureLoader = new THREE.TextureLoader();",
    code
)
code = re.sub(
    r"const topMat = new THREE\.MeshStandardMaterial\({\n\s*map: topTex,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.045,\n\s*roughness: 0\.80,\n\s*metalness: 0\.02\n\s*}\);",
    "const topMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.045,\n      roughness: 0.80,\n      metalness: 0.02\n    });\n    textureLoader.load('/rose_cookie_top_clean.png', (tex) => {\n      topMat.map = tex;\n      topMat.bumpMap = tex;\n      topMat.color.setHex(0xffffff);\n      topMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const sideMat = new THREE\.MeshStandardMaterial\({\n\s*color: 0xdeb887,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.025,\n\s*roughness: 0\.86,\n\s*metalness: 0\.01\n\s*}\);",
    "const sideMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.025,\n      roughness: 0.86,\n      metalness: 0.01\n    });\n    textureLoader.load('/rose_cookie_top_clean.png', (tex) => {\n      sideMat.bumpMap = tex;\n      sideMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const bottomMat = new THREE\.MeshStandardMaterial\({\n\s*map: bottomTex,\n\s*bumpMap: bottomTex,\n\s*bumpScale: 0\.05,\n\s*roughness: 0\.88,\n\s*metalness: 0\.01\n\s*}\);",
    "const bottomMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.05,\n      roughness: 0.88,\n      metalness: 0.01\n    });\n    textureLoader.load('/rose_cookie_bottom_clean.png', (tex) => {\n      bottomMat.map = tex;\n      bottomMat.bumpMap = tex;\n      bottomMat.color.setHex(0xffffff);\n      bottomMat.needsUpdate = true;\n    });",
    code
)

# Replace oatsnuts texture loading
code = re.sub(
    r"const textureLoader = new THREE\.TextureLoader\(\);\n\s*const topTex = textureLoader\.load\('/oatsnuts_cookie_top_clean\.png'\);\n\s*const bottomTex = textureLoader\.load\('/oatsnuts_cookie_bottom_clean\.png'\);",
    "const textureLoader = new THREE.TextureLoader();",
    code
)
code = re.sub(
    r"const topMat = new THREE\.MeshStandardMaterial\({\n\s*map: topTex,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.055,\n\s*roughness: 0\.80,\n\s*metalness: 0\.02\n\s*}\);",
    "const topMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.055,\n      roughness: 0.80,\n      metalness: 0.02\n    });\n    textureLoader.load('/oatsnuts_cookie_top_clean.png', (tex) => {\n      topMat.map = tex;\n      topMat.bumpMap = tex;\n      topMat.color.setHex(0xffffff);\n      topMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const sideMat = new THREE\.MeshStandardMaterial\({\n\s*color: 0xc69250,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.035,\n\s*roughness: 0\.86,\n\s*metalness: 0\.01\n\s*}\);",
    "const sideMat = new THREE.MeshStandardMaterial({\n      color: 0xc69250,\n      bumpScale: 0.035,\n      roughness: 0.86,\n      metalness: 0.01\n    });\n    textureLoader.load('/oatsnuts_cookie_top_clean.png', (tex) => {\n      sideMat.bumpMap = tex;\n      sideMat.needsUpdate = true;\n    });",
    code
)

# Replace orange texture loading
code = re.sub(
    r"const textureLoader = new THREE\.TextureLoader\(\);\n\s*const topTex = textureLoader\.load\('/orange_cookie_top_clean\.png'\);\n\s*const bottomTex = textureLoader\.load\('/orange_cookie_bottom_clean\.png'\);",
    "const textureLoader = new THREE.TextureLoader();",
    code
)
code = re.sub(
    r"const topMat = new THREE\.MeshStandardMaterial\({\n\s*map: topTex,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.040,\n\s*roughness: 0\.82,\n\s*metalness: 0\.03\n\s*}\);",
    "const topMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.040,\n      roughness: 0.82,\n      metalness: 0.03\n    });\n    textureLoader.load('/orange_cookie_top_clean.png', (tex) => {\n      topMat.map = tex;\n      topMat.bumpMap = tex;\n      topMat.color.setHex(0xffffff);\n      topMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const sideMat = new THREE\.MeshStandardMaterial\({\n\s*color: 0xdcb072,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.025,\n\s*roughness: 0\.86,\n\s*metalness: 0\.01\n\s*}\);",
    "const sideMat = new THREE.MeshStandardMaterial({\n      color: 0xdcb072,\n      bumpScale: 0.025,\n      roughness: 0.86,\n      metalness: 0.01\n    });\n    textureLoader.load('/orange_cookie_top_clean.png', (tex) => {\n      sideMat.bumpMap = tex;\n      sideMat.needsUpdate = true;\n    });",
    code
)

# Replace walnut texture loading
code = re.sub(
    r"const textureLoader = new THREE\.TextureLoader\(\);\n\s*const topPath = id === 'walnut_sf' \? '/walnut_sf_cookie_top_clean\.png' : '/walnut_cookie_top_clean\.png';\n\s*const topTex = textureLoader\.load\(topPath\);\n\s*const bottomTex = textureLoader\.load\('/almond_cookie_bottom_clean\.png'\);",
    "const textureLoader = new THREE.TextureLoader();\n    const topPath = id === 'walnut_sf' ? '/walnut_sf_cookie_top_clean.png' : '/walnut_cookie_top_clean.png';",
    code
)
code = re.sub(
    r"const topMat = new THREE\.MeshStandardMaterial\({\n\s*map: topTex,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.050,\n\s*roughness: 0\.80,\n\s*metalness: 0\.02\n\s*}\);",
    "const topMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.050,\n      roughness: 0.80,\n      metalness: 0.02\n    });\n    textureLoader.load(topPath, (tex) => {\n      topMat.map = tex;\n      topMat.bumpMap = tex;\n      topMat.color.setHex(0xffffff);\n      topMat.needsUpdate = true;\n    });",
    code
)
code = re.sub(
    r"const sideMat = new THREE\.MeshStandardMaterial\({\n\s*color: sideColor,\n\s*bumpMap: topTex,\n\s*bumpScale: 0\.030,\n\s*roughness: 0\.86,\n\s*metalness: 0\.01\n\s*}\);",
    "const sideMat = new THREE.MeshStandardMaterial({\n      color: sideColor,\n      bumpScale: 0.030,\n      roughness: 0.86,\n      metalness: 0.01\n    });\n    textureLoader.load(topPath, (tex) => {\n      sideMat.bumpMap = tex;\n      sideMat.needsUpdate = true;\n    });",
    code
)


# Common bottom material substitution (except almond which uses a special one above)
code = re.sub(
    r"const bottomMat = new THREE\.MeshStandardMaterial\({\n\s*map: bottomTex,\n\s*bumpMap: bottomTex,\n\s*bumpScale: 0\.05,\n\s*roughness: 0\.88,\n\s*metalness: 0\.01\n\s*}\);",
    "const bottomMat = new THREE.MeshStandardMaterial({\n      color: 0xdeb887,\n      bumpScale: 0.05,\n      roughness: 0.88,\n      metalness: 0.01\n    });\n    textureLoader.load('/almond_cookie_bottom_clean.png', (tex) => {\n      bottomMat.map = tex;\n      bottomMat.bumpMap = tex;\n      bottomMat.color.setHex(0xffffff);\n      bottomMat.needsUpdate = true;\n    });",
    code
)


with open('src/controllers/ThreeController.js', 'w') as f:
    f.write(code)

