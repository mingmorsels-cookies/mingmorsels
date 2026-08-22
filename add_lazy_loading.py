import os
import re

files_to_check = [f for f in os.listdir('.') if f.endswith('.html')]

for file in files_to_check:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all <img ...> tags
    def replace_img(match):
        img_tag = match.group(0)
        # Skip if already lazy
        if 'loading="lazy"' in img_tag or "loading='lazy'" in img_tag:
            return img_tag
        # Skip hero images or preloader logos
        if 'class="logo' in img_tag or 'class="preloader' in img_tag or 'class="mobile-nav-logo"' in img_tag or 'hero-img' in img_tag:
            return img_tag
        
        # Insert loading="lazy" before the closing bracket
        if img_tag.endswith('/>'):
            return img_tag[:-2] + ' loading="lazy" />'
        else:
            return img_tag[:-1] + ' loading="lazy">'

    new_content = re.sub(r'<img[^>]+>', replace_img, content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Added lazy loading to HTML files.")
