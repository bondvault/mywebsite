import zipfile
import os

def create_website_zip():
    # 1. Configuration: The project root folder
    source_folder = r"c:\Users\Administrator\.vscode\mywebsite"
    output_filename = "bondvault_full_project.zip"
    excludes = {'.git', '.vscode', '__pycache__', 'venv', 'env'}
    
    # 2. Validation
    if not os.path.exists(source_folder):
        print(f"Error: The folder '{source_folder}' was not found.")
        return

    print(f"Zipping contents of: {source_folder}")
    
    try:
        # 3. Create the Zip File
        with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            file_count = 0
            for root, dirs, files in os.walk(source_folder):
                # Modify dirs in-place to skip excluded directories
                dirs[:] = [d for d in dirs if d not in excludes]

                for file in files:
                    # Get full path on disk
                    file_path = os.path.join(root, file)
                    
                    # Get relative path (so the zip doesn't contain 'c:\Users\...')
                    relative_path = os.path.relpath(file_path, source_folder)
                    
                    # Exclude the zip file itself if it ends up in the source folder
                    if file == output_filename or file.endswith('.zip'):
                        continue

                    print(f"  Adding: {relative_path}")
                    zipf.write(file_path, arcname=relative_path)
                    file_count += 1
        
        print(f"\n✅ Success! Created '{output_filename}' with {file_count} files.")
        print(f"📍 Location: {os.path.abspath(output_filename)}")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    create_website_zip()