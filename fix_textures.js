const fs = require('fs');
let code = fs.readFileSync('src/controllers/ThreeController.js', 'utf8');

// Regex to find and replace the texture loading pattern
const patterns = [
  {
    regex: /const topTex = textureLoader\.load\('([^']+)'\);\n\s*const bottomTex = textureLoader\.load\('([^']+)'\);/g,
    repl: `let topTex, bottomTex;
    textureLoader.load('$1', t => { topTex = t; if (topMat) { topMat.map = t; topMat.bumpMap = t; topMat.color.setHex(0xffffff); topMat.needsUpdate = true; } });
    textureLoader.load('$2', t => { bottomTex = t; if (bottomMat) { bottomMat.map = t; bottomMat.bumpMap = t; bottomMat.color.setHex(0xffffff); bottomMat.needsUpdate = true; } });`
  },
  {
    regex: /const topMat = new THREE\.MeshStandardMaterial\({[\s\S]*?map: topTex,[\s\S]*?bumpMap: topTex,([\s\S]*?)}\);/g,
    repl: `const topMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887,$1});
    if (topTex) { topMat.map = topTex; topMat.bumpMap = topTex; topMat.color.setHex(0xffffff); }`
  },
  {
    regex: /const bottomMat = new THREE\.MeshStandardMaterial\({[\s\S]*?map: bottomTex,[\s\S]*?bumpMap: bottomTex,([\s\S]*?)}\);/g,
    repl: `const bottomMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887,$1});
    if (bottomTex) { bottomMat.map = bottomTex; bottomMat.bumpMap = bottomTex; bottomMat.color.setHex(0xffffff); }`
  }
];

// Let's do this safer: just search and replace manually since the regex is complex.
