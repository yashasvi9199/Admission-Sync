import os
import re

def parse_changelog(changelog_path):
    with open(changelog_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all version headers: e.g. ## [1.2.0] - 2026-06-29
    pattern = r'(?m)^##\s+\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})'
    matches = list(re.finditer(pattern, content))
    if not matches:
        raise ValueError("No version blocks found in CHANGELOG.md")
    
    # The first match is the latest version
    latest_match = matches[0]
    version = latest_match.group(1)
    date = latest_match.group(2)
    
    start_pos = latest_match.end()
    end_pos = matches[1].start() if len(matches) > 1 else len(content)
    
    raw_notes = content[start_pos:end_pos].strip()
    
    # Extract only list items
    lines = raw_notes.split('\n')
    bullets = []
    current_notes_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('###'):
            current_notes_lines.append(line)
            continue
        if stripped.startswith('-') or stripped.startswith('*'):
            bullets.append(stripped)
            current_notes_lines.append(line)
        else:
            current_notes_lines.append(line)
            
    release_notes_body = '\n'.join(current_notes_lines).strip()
    
    return {
        'version': version,
        'date': date,
        'bullets': bullets,
        'body': release_notes_body
    }

def append_to_release_ledger(ledger_path, version, date, bullets):
    tag = f"v{version}"
    title = f"AeroPunchin {tag}"
    
    entry_lines = [
        f"## [{tag}] - {date}",
        f"- **Title**: {title}"
    ]
    for bullet in bullets:
        if bullet.startswith('*'):
            bullet = '-' + bullet[1:]
        entry_lines.append(bullet)
    
    new_entry = '\n'.join(entry_lines) + '\n\n'
    
    existing_content = ""
    if os.path.exists(ledger_path):
        with open(ledger_path, 'r', encoding='utf-8') as f:
            existing_content = f.read()
    else:
        os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
        existing_content = "# Release Ledger\n\n"
        with open(ledger_path, 'w', encoding='utf-8') as f:
            f.write(existing_content)
        
    if f"## [{tag}]" in existing_content:
        print(f"Release {tag} already logged in release ledger.")
        return False
        
    with open(ledger_path, 'a', encoding='utf-8') as f:
        f.write(new_entry)
        
    print(f"Successfully appended {tag} to release ledger.")
    return True

def main():
    changelog_path = "docs/CHANGELOG.md"
    ledger_path = "docs/RELEASE.md"
    
    if not os.path.exists(changelog_path):
        print(f"Error: {changelog_path} not found.")
        return
        
    try:
        data = parse_changelog(changelog_path)
    except Exception as e:
        print(f"Error parsing changelog: {e}")
        return
        
    version = data['version']
    date = data['date']
    bullets = data['bullets']
    body = data['body']
    tag = f"v{version}"
    
    # Append to docs/RELEASE.md
    append_to_release_ledger(ledger_path, version, date, bullets)
    
    # Write variables for GitHub Actions to read
    os.makedirs(".github/outputs", exist_ok=True)
    with open(".github/outputs/version.txt", "w", encoding="utf-8") as f:
        f.write(version)
    with open(".github/outputs/tag.txt", "w", encoding="utf-8") as f:
        f.write(tag)
    with open(".github/outputs/release_notes.md", "w", encoding="utf-8") as f:
        f.write(body)
        
    print(f"Processed release {tag} successfully.")

if __name__ == "__main__":
    main()
