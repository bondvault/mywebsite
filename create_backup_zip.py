import zipfile
import os

def zip_project():
    # Define the output filename
    output_filename = 'bondvault_full_backup.zip'
    
    # Define the base directory (where this script is located)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define directories to include
    dirs_to_zip = ['frontend', 'backend']
    
    # Define exclusions (to keep the zip clean)
    excludes = {'__pycache__', '.git', '.vscode', 'venv', 'env', 'node_modules'}
    exclude_exts = {'.pyc', '.pyo', '.pyd', '.DS_Store'}

    output_path = os.path.join(base_dir, output_filename)

    try:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            print(f"Starting backup to {output_filename}...")
            
            for folder_name in dirs_to_zip:
                folder_path = os.path.join(base_dir, folder_name)
                
                if not os.path.exists(folder_path):
                    print(f"⚠️ Warning: Directory '{folder_name}' not found in {base_dir}")
                    continue
                
                for root, dirs, files in os.walk(folder_path):
                    # Modify dirs in-place to skip excluded directories
                    dirs[:] = [d for d in dirs if d not in excludes]
                    
                    for file in files:
                        if any(file.endswith(ext) for ext in exclude_exts):
                            continue
                            
                        file_path = os.path.join(root, file)
                        # Create relative path for the zip archive
                        arcname = os.path.relpath(file_path, base_dir)
                        
                        print(f"  + Zipping: {arcname}")
                        zipf.write(file_path, arcname)
                        
        print(f"\n✅ Backup created successfully: {output_path}")
        
    except Exception as e:
        print(f"\n❌ Error creating zip file: {e}")

if __name__ == "__main__":
    zip_project()