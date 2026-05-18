from PIL import Image

def tint_image(input_path, output_path, color):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for r, g, b, a in data:
        # If it's mostly transparent, keep it transparent
        if a == 0:
            new_data.append((255, 255, 255, 0))
        else:
            # Check if pixel is white or grey. If it's pure white, maybe we shouldn't tint it?
            # Usually the nwee logo is just a solid purple "n". 
            # We'll just replace the RGB with the blue color and keep A.
            new_data.append((color[0], color[1], color[2], a))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

tint_image("favicon-nwee.png", "public/favicon.png", (35, 135, 239))
print("Done")
