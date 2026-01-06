import os
import zipfile
from datetime import datetime

def create_backup():
    # Configuration
    # We assume this script is run from the project root or we point specifically to the frontend folder
    base_path = r"c:\Users\Administrator\.vscode\mywebsite\frontend"
    
    # List of files to include in the backup
    files_to_zip = [
        "index.html",
        "market-data.html",
        "learning.html",
        "admin.html",
        "terms.html",
        "privacy.html",
        "sitemap.xml"
    ]
    
    # Generate a filename with a timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"bondvault_frontend_backup_{timestamp}.zip"
    
    print(f"--- BondVault Backup Utility ---")
    print(f"Source: {base_path}")
    print(f"Target: {zip_filename}")
    print("-" * 30)
    
    try:
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filename in files_to_zip:
                file_path = os.path.join(base_path, filename)
                
                if os.path.exists(file_path):
                    print(f"✅ Adding: {filename}")
                    # arcname=filename stores them at the root of the zip file
                    zipf.write(file_path, arcname=filename)
                else:
                    print(f"⚠️  Missing: {filename} (Skipped)")
        
        print("-" * 30)
        print(f"🎉 Success! Backup created at:\n{os.path.abspath(zip_filename)}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    create_backup()