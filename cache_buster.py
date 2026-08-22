import os
import re

directories = ['.', 'public', 'src']
extensions = ['.html', '.js']

for dir_path in directories:
    for filename in os.listdir(dir_path):
        if any(filename.endswith(ext) for ext in extensions):
            file_path = os.path.join(dir_path, filename)
            if os.path.isfile(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Add ?v=2 to .png, .png", .png'
                content = re.sub(r'\.png(?=[\'"])', '.png?v=2', content)
                content = re.sub(r'\.png\?v=2\?v=2', '.png?v=2', content) # Prevent double addition
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

print("Cache buster applied to HTML and JS files.")
