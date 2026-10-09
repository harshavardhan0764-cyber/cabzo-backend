import os
import sys
from PIL import Image, ImageDraw

def create_circular_mask(size):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    return mask

def generate_assets(source_path, base_dir):
    print(f"Loading master logo from: {source_path}")
    master_img = Image.open(source_path).convert("RGBA")
    
    # 1. Base web assets
    web_targets = [
        os.path.join(base_dir, "public", "cabzo_logo.png"),
        os.path.join(base_dir, "src", "assets", "cabzo_logo.png"),
        os.path.join(base_dir, "admin-app", "public", "cabzo_logo.png"),
        os.path.join(base_dir, "admin-app", "src", "assets", "cabzo_logo.png"),
    ]
    for target in web_targets:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        master_img.save(target, "PNG")
        print(f"Saved: {target}")

    # Favicons & PWA
    for folder in [os.path.join(base_dir, "public"), os.path.join(base_dir, "admin-app", "public")]:
        os.makedirs(folder, exist_ok=True)
        fav_png = master_img.resize((64, 64), Image.LANCZOS)
        fav_png.save(os.path.join(folder, "favicon.png"), "PNG")
        
        # Save ICO
        ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        master_img.save(os.path.join(folder, "favicon.ico"), format="ICO", sizes=ico_sizes)
        
        pwa_192 = master_img.resize((192, 192), Image.LANCZOS)
        pwa_192.save(os.path.join(folder, "pwa-192x192.png"), "PNG")
        
        pwa_512 = master_img.resize((512, 512), Image.LANCZOS)
        pwa_512.save(os.path.join(folder, "pwa-512x512.png"), "PNG")
        print(f"Saved favicons and PWA icons in: {folder}")

    # 2. Android Mipmap Icons & Adaptive Foregrounds
    mipmap_densities = {
        "mipmap-mdpi": {"legacy": 48, "adaptive": 108},
        "mipmap-hdpi": {"legacy": 72, "adaptive": 162},
        "mipmap-xhdpi": {"legacy": 96, "adaptive": 216},
        "mipmap-xxhdpi": {"legacy": 144, "adaptive": 324},
        "mipmap-xxxhdpi": {"legacy": 192, "adaptive": 432},
    }

    android_projects = [
        os.path.join(base_dir, "android", "app", "src", "main", "res"),
        os.path.join(base_dir, "android-admin", "app", "src", "main", "res"),
    ]

    for res_dir in android_projects:
        print(f"\nProcessing Android icons for: {res_dir}")
        for folder_name, sizes in mipmap_densities.items():
            folder_path = os.path.join(res_dir, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            
            # Legacy square launcher
            leg_size = sizes["legacy"]
            icon_sq = master_img.resize((leg_size, leg_size), Image.LANCZOS)
            icon_sq.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
            
            # Legacy round launcher
            icon_round = Image.new("RGBA", (leg_size, leg_size), (0, 0, 0, 0))
            mask = create_circular_mask((leg_size, leg_size))
            icon_round.paste(icon_sq, (0, 0), mask)
            icon_round.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
            
            # Adaptive foreground (108dp canvas with ~70% safe zone)
            adap_size = sizes["adaptive"]
            fg_canvas = Image.new("RGBA", (adap_size, adap_size), (0, 0, 0, 0))
            inner_size = int(adap_size * 0.72)
            offset = (adap_size - inner_size) // 2
            inner_icon = master_img.resize((inner_size, inner_size), Image.LANCZOS)
            fg_canvas.paste(inner_icon, (offset, offset), inner_icon)
            fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
            
            print(f"Generated icons in {folder_name}: legacy {leg_size}x{leg_size}, adaptive {adap_size}x{adap_size}")

    # 3. Android Splash Screens
    # Clean white background matching the new U & I Cabs logo
    bg_color = (255, 255, 255, 255)
    
    splash_dimensions = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for res_dir in android_projects:
        print(f"\nProcessing Android splash screens for: {res_dir}")
        for folder_name, (w, h) in splash_dimensions.items():
            folder_path = os.path.join(res_dir, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            
            splash_img = Image.new("RGBA", (w, h), bg_color)
            
            # Scale logo to ~55% of the narrower dimension
            min_dim = min(w, h)
            logo_dim = int(min_dim * 0.55)
            scaled_logo = master_img.resize((logo_dim, logo_dim), Image.LANCZOS)
            
            # Center logo
            pos_x = (w - logo_dim) // 2
            pos_y = (h - logo_dim) // 2
            splash_img.paste(scaled_logo, (pos_x, pos_y), scaled_logo)
            
            splash_path = os.path.join(folder_path, "splash.png")
            splash_img.save(splash_path, "PNG")
            print(f"Generated splash: {folder_name}/splash.png ({w}x{h})")

    # Also save as public/cabzo_official_logo.jpg for AppUpdateModal and others
    master_rgb = master_img.convert("RGB")
    master_rgb.save(os.path.join(base_dir, "public", "cabzo_official_logo.jpg"), "JPEG", quality=95)
    master_rgb.save(os.path.join(base_dir, "public", "u_and_i_cabs_logo.jpg"), "JPEG", quality=95)

    print("\nAll brand assets successfully generated!")

if __name__ == "__main__":
    src_logo = r"C:\Users\Harsh\.gemini\antigravity\brain\c7e34aab-4621-4a71-81af-7b24d3bb8546\.user_uploaded\media_1791554380533.jpg"
    app_base = r"C:\Users\Harsh\.gemini\antigravity\scratch\cab-booking-app"
    generate_assets(src_logo, app_base)
