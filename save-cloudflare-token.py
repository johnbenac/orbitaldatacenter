#!/usr/bin/env python3
"""Prompt for and privately save the orbitaldatacenter Cloudflare token."""
import getpass
import json
import os
from pathlib import Path
import resource
import sys
import tempfile
import urllib.error
import urllib.request


def main():
    if os.geteuid() != 0:
        sys.exit("Run with sudo python3 /root/orbitaldatacenter/site/save-cloudflare-token.py")
    if not sys.stdin.isatty():
        sys.exit("Run interactively in a terminal; do not pipe the token.")
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    os.umask(0o077)
    directory = Path("/root/.config/orbitaldatacenter")
    destination = directory / "cloudflare-api-token"
    if directory.is_symlink() or destination.is_symlink():
        sys.exit("Refusing a symbolic link at the credential location.")
    if destination.exists():
        if input("A token is already saved. Replace it? [y/N] ").lower() != "y":
            return
    token = getpass.getpass("Paste Cloudflare token (hidden), then press Enter: ").strip()
    if not token or any(character.isspace() for character in token):
        sys.exit("Empty token or whitespace within token; nothing saved.")
    request = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/user/tokens/verify",
        headers={"Authorization": "Bearer " + token},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            verification = json.load(response)
    except (urllib.error.URLError, ValueError):
        sys.exit("Cloudflare verification failed; nothing saved. Check the token and connection.")
    if not verification.get("success") or verification.get("result", {}).get("status") != "active":
        sys.exit("Cloudflare did not report an active token; nothing saved.")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=".cloudflare-token-", dir=directory)
    try:
        with os.fdopen(descriptor, "w") as stream:
            stream.write(token + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("Active token saved to " + str(destination))
    print("Directory permissions: 700; token permissions: 600 (root only).")
    print("Service permissions will be checked separately; no site or DNS changes made.")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        sys.exit("\nCancelled; nothing saved.")
