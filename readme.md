# Dictionary Generator README

## Overview
This project generates a dictionary eBook in OPF format, specifically designed to work with dictionaries from Kaikki.org. Kaikki.org dictionaries are machine-readable and derived from Wiktionary data, providing a comprehensive resource for various languages.

## Prerequisites
- Node.js (latest stable version)
- A JSON file of word definitions from Kaikki.org

## Installation
1. Clone this repository.
2. Navigate to the repository folder in your terminal.
3. Run `npm install` to install the dependencies.

## Usage
To generate your dictionary, run:
```
node [script_name.js] [definitions_path.json] [title] [author]
```
- Replace `[script_name.js]` with the script's filename.
- `[definitions_path.json]` should be the path to your Kaikki.org JSON file.
- `[title]` and `[author]` are optional and default to 'Dictionary' and 'Anonymous', respectively.

## Kaikki.org Data Format
Ensure your JSON file follows the Kaikki.org format, typically including fields like "word", "lang_code", etc. The data is extracted from the enwiktionary dump using wiktextract and post-processed for machine readability.

## Output
The script creates HTML files for the cover, content, and copyrights, along with an OPF file in the `./output` directory.

## Conversion to eBook Format
Use tools like KindleGen to convert the OPF and associated files to MOBI or other eBook formats.
