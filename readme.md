# Kindle Wiktionary Creator

## Overview
"Kindle Wiktionary Creator" is a tool for creating custom Kindle dictionaries from Wiktionary definitions sourced from Kaikki.org. It processes these definitions and formats them into Kindle-compatible files, mainly handled by the `create.mjs` script.

## Requirements
- Node.js environment.
- Wiktionary definitions from Kaikki.org, updated regularly and including data for multiple languages with English glosses and metadata.

## Features
- Generates Kindle-compatible dictionaries from Kaikki.org Wiktionary definitions.
- Paginated output with customizable entries per file.
- Customizable dictionary title and author.
- Creation of necessary OPF and HTML content files.

## Installation
1. Clone the repository.
2. Ensure Node.js is installed.

## Usage
1. Obtain a JSON file with definitions from Kaikki.org.
2. Run the script in Node.js:
   ```
   node create.mjs [definitions-path] [title] [author]
   ```

## How It Works
- Orchestrates dictionary file creation using `createOPFFile`.
- Manages output directory and file creation.
- Parses and formats dictionary entries.
- Outputs to `./output` directory.

## Customization
- Adjust entries per file with `entriesPerFile`.
- Set title and author via command-line.

## License
Follows Wiktionary's CC-BY-SA and GFDL licensing terms.
