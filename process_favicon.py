from PIL import Image

def process_favicon(input_path, output_path, target_color):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for r, g, b, a in data:
        # If it's a white-ish background pixel
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0)) # transparent
        elif a < 10:
            new_data.append((255, 255, 255, 0)) # keep transparent
        else:
            # Color it blue while keeping the alpha channel (anti-aliasing)
            # if it's anti-aliased against white, we might need to adjust, but let's just color it.
            # target_color is (35, 135, 239)
            
            # Simple tinting: replace color with target, keep original alpha
            # But wait, if it was anti-aliased with white, replacing RGB and keeping A might look weird.
            # We assume it's mostly solid or alpha blended.
            # Let's just use the original alpha.
            # We can also handle the white anti-aliasing by checking brightness.
            brightness = (r + g + b) / (3.0 * 255)
            # The darker it is, the more opaque it should be if it was drawn on white.
            # Since the original is purple, it's not black. Let's just trust the alpha or color it solid.
            if a > 0:
                new_data.append((target_color[0], target_color[1], target_color[2], a))
            else:
                new_data.append((255, 255, 255, 0))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

process_favicon("favicon-nwee.png", "public/favicon.png", (35, 135, 239))
print("Done processing")
