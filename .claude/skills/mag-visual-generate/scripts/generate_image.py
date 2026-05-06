#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["google-genai", "pillow", "loguru", "python-dotenv"]
# ///
"""
MAG Visual Generate - Universal Image Generation Script
Uses Google Gemini for AI image generation with customizable styles.
Styles are loaded from the styles/ folder.
"""

import argparse
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path
from loguru import logger

# Configure logger - no sensitive data in output
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    filter=lambda record: "api_key" not in record["message"].lower()
)

# Directories
SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent
STYLES_DIR = SKILL_DIR / "styles"
PROJECT_ROOT = SKILL_DIR.parent.parent.parent
ARCHIVE_BASE = Path.home() / "c3z-brain" / "c3z-brain" / "900_Archives" / "cezos"
PROCESSING_DIR = ARCHIVE_BASE / "processing" / "images"
PROCESSING_DIR.mkdir(parents=True, exist_ok=True)

# Default .env.local location
ENV_FILE = PROJECT_ROOT / ".env.local"


def load_styles() -> dict[str, str]:
    """Load all style definitions from styles/ folder."""
    styles = {}
    if STYLES_DIR.exists():
        for style_file in STYLES_DIR.glob("*.txt"):
            style_name = style_file.stem  # filename without extension
            styles[style_name] = style_file.read_text().strip()
    return styles


def load_api_key() -> str | None:
    """Load GEMINI_API_KEY from environment or .env.local file."""
    # First check environment
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        return api_key

    # Try loading from .env.local
    if ENV_FILE.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(ENV_FILE)
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                logger.info("Loaded API key from .env.local")
                return api_key
        except ImportError:
            # Manual parsing if dotenv not available
            with open(ENV_FILE) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        os.environ["GEMINI_API_KEY"] = api_key
                        logger.info("Loaded API key from .env.local")
                        return api_key

    return None


def generate_filename(description: str, extension: str = "png") -> str:
    """Generate filename with timestamp: YYYYMMDD_HHMMSS_description.ext"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Sanitize description for filename
    safe_desc = "".join(c if c.isalnum() or c in "-_" else "_" for c in description[:50])
    return f"{timestamp}_{safe_desc}.{extension}"


def generate_with_gemini(
    prompt: str, style_desc: str, output_path: Path, reference_path: Path | None = None
) -> bool:
    """Generate image using Gemini API with specified style.

    If reference_path is provided, the image is sent as a visual style reference
    alongside the text prompt (multi-modal input).
    """
    try:
        from google import genai
        from PIL import Image

        # Get API key
        api_key = load_api_key()
        if not api_key:
            logger.error("GEMINI_API_KEY not found. Set it in environment or .env.local file.")
            return False

        client = genai.Client(api_key=api_key)

        # Build full prompt
        full_prompt = f"""{style_desc}

Subject/Scene: {prompt}"""

        logger.info(f"Prompt: {prompt[:80]}{'...' if len(prompt) > 80 else ''}")

        contents: list = [full_prompt]
        if reference_path is not None:
            if not reference_path.exists():
                logger.error(f"Reference image not found: {reference_path}")
                return False
            ref_img = Image.open(str(reference_path))
            contents.append(ref_img)
            logger.info(f"Reference image: {reference_path}")

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=contents,
        )

        # Process response
        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                image.save(str(output_path))
                logger.success(f"Image saved to {output_path}")
                return True
            elif part.text is not None:
                logger.debug("Got text in response (processing...)")

        logger.error("No image data in API response")
        return False

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        logger.info("Run: pip install google-genai pillow")
        return False
    except Exception as e:
        logger.error(f"API error: {e}")
        return False


def list_styles(styles: dict[str, str], verbose: bool = False):
    """Print available styles."""
    print("\nAvailable styles:")
    print("-" * 60)
    for name, desc in sorted(styles.items()):
        # Show first line of description
        first_line = desc.strip().split('\n')[0]
        print(f"  {name:15} {first_line}")
        if verbose:
            # Show full description indented
            for line in desc.strip().split('\n')[1:]:
                if line.strip():
                    print(f"                  {line.strip()}")
            print()
    print("-" * 60)
    print(f"\n{len(styles)} styles available.")
    print("You can also pass a custom style description with --style.")


def main():
    # Load styles from folder
    styles = load_styles()
    style_names = list(styles.keys())

    parser = argparse.ArgumentParser(
        description="Generate images using Gemini API with customizable styles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Available styles: {', '.join(sorted(style_names))}

Examples:
  %(prog)s "futuristic city" --style tech
  %(prog)s "business growth" --style mckinsey
  %(prog)s "team meeting notes" --style whiteboard
  %(prog)s --list-styles
        """
    )
    parser.add_argument("prompt", nargs="?", help="Image prompt/description")
    parser.add_argument(
        "--style", "-s",
        help="Style name from styles/ folder or custom description"
    )
    parser.add_argument("--output", "-o", help="Output path (default: ~/c3z-brain/900_Archives/cezos/processing/images/)")
    parser.add_argument("--copy-to", help="Copy result to this path after generation")
    parser.add_argument("--reference", "-r", help="Path to a reference image to send alongside the prompt as a visual style anchor")
    parser.add_argument("--list-styles", action="store_true", help="List available styles")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show full style descriptions")

    args = parser.parse_args()

    if args.list_styles:
        list_styles(styles, args.verbose)
        return 0

    if not args.prompt:
        parser.error("prompt is required (or use --list-styles)")

    if not args.style:
        parser.error("--style is required. Use --list-styles to see available styles.")

    # Get style description
    if args.style in styles:
        style_desc = styles[args.style]
        logger.info(f"Using style: {args.style}")
    else:
        # Assume custom style description
        style_desc = args.style
        logger.info("Using custom style description")

    # Generate image
    filename = generate_filename(args.prompt, "png")
    output_path = Path(args.output) if args.output else PROCESSING_DIR / filename

    reference_path = Path(args.reference).expanduser().resolve() if args.reference else None
    success = generate_with_gemini(args.prompt, style_desc, output_path, reference_path)

    if success:
        if args.copy_to:
            copy_dest = Path(args.copy_to)
            copy_dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(output_path, copy_dest)
            logger.info(f"Copied to {copy_dest}")

        print(str(output_path))
        return 0
    else:
        logger.error("Image generation failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
