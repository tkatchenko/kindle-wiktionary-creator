import fs, { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createInterface } from 'readline';
import beautify from 'js-beautify';

async function createOPFFile(definitionsPath, title = 'Dictionary', author = 'Anonymous') {
  const bookId = uuidv4();
  const outputDir = './output';
  const entriesPerFile = 1000;
  let contentFileIndex = 0;
  let currentEntryCount = 0;
  let contentBuffer = '';

  const posMap = {
    'noun': 'n',
    'particle': 'part',
    'suffix': 'suf',
    'symbol': 'sym',
    'interfix': 'interf',
    'conj': 'conj',
    'infix': 'inf',
    'pron': 'pron',
    'prefix': 'pref',
    'verb': 'v',
    'affix': 'aff',
    'prep': 'prep',
    'adj': 'adj',
    'name': 'n',
    'intj': 'interj',
    'adv': 'adv',
    'contraction': 'contr',
    'det': 'det',
    'phrase': 'phr',
    'prep_phrase': 'prep phr',
    'character': 'char',
    'num': 'num',
    'article': 'art',
    'proverb': 'prov',
    'circumfix': 'circ',
    'postp': 'postp',
    'adv_phrase': 'adv phr',
    'punct': 'punct'
  };

  // Basic HTML minification
  function minifyHTML(html) {
    return html
      .replace(/\n/g, '')
      .replace(/\t/g, '')
      .replace(/ +/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/<!--.*?-->/gs, '');
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    try {
      await fsPromises.mkdir(outputDir);
    } catch (err) {
      console.error('Error creating output directory:', err);
      return;
    }
  } else {
    // Directory exists, remove all files in it
    try {
      const files = await fsPromises.readdir(outputDir);
      for (const file of files) {
        await fsPromises.unlink(`${outputDir}/${file}`);
      }
    } catch (err) {
      console.error('Error removing files:', err);
    }
  }

  function createNewContentFile() {
    if (contentBuffer !== '') {
      contentBuffer += `</mbp:frameset>
          </body>
        </html>
      `;

      contentFileIndex++;

      const beautifiedContent = beautify.html(contentBuffer, { indent_size: 2, space_in_empty_paren: true });
      fs.writeFileSync(`${outputDir}/content_${contentFileIndex}.html`, minifyHTML(beautifiedContent));
      contentBuffer = '';
    }
    currentEntryCount = 0;

    contentBuffer = contentHeader;
  }

  // Header for each content file
  const contentHeader = `<html
        xmlns:math="http://exslt.org/math" xmlns:svg="http://www.w3.org/2000/svg"
        xmlns:tl="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:saxon="http://saxon.sf.net/" xmlns:xs="http://www.w3.org/2001/XMLSchema"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:cx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:mbp="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:idx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          dt {
            font-weight: bold;
          }

          dd {
            padding: 0;
            margin: 0;
          }

          phonetic {
            font-weight: normal;
            color: gray;
          }

          ol, ul {
            padding: 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <mbp:frameset>
  `;

  // Initialize an array to store dictionary entries
  let dictionaryEntries = [];
  const forms = [];

  const fileStream = fs.createReadStream(definitionsPath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Read and parse each line, storing the result in the array
  console.log('Reading...');
  for await (const line of rl) {
    try {
      const def = JSON.parse(line);
      dictionaryEntries.push(def);
      if (def.forms) forms.push(...def.forms.map(form => form.form));
    } catch (err) {
      console.error(`Error parsing JSON from line: ${err}`);
    }
  }

  console.log('Filtering...');
  const formsSet = new Set(forms);
  dictionaryEntries = dictionaryEntries.filter(def => 
    def.forms && def.forms.length > 0 || !formsSet.has(def.word)
  );

  // Sort the dictionary entries alphabetically
  console.log('Sorting...');
  dictionaryEntries.sort((a, b) => a.word.localeCompare(b.word));

  createNewContentFile();

  const isCharInRange = (char) => {
    const code = char.charCodeAt(0);
    return code >= 0x0000 && code <= 0x007F;
  };

  const isWordInUnicodeRange = (word) => {
    for (let char of word) {
      if (!isCharInRange(char)) {
        return false;
      }
    }
    return true;
  };

  const isWordSuitable = (word) => {
    return /^[A-Za-z]/.test(word);
  };

  console.log('Creating...');
  dictionaryEntries.forEach(def => {
    try {
      if (def.word && def.word.trim()) {
        console.log(`Adding "${def.word}"`);
        const entry = createDictionaryEntry(def);
        contentBuffer += entry;

        if (++currentEntryCount >= entriesPerFile) {
          createNewContentFile();
        }
      }
    } catch (err) {
      console.error(`Error creating entry: ${err}`);
      console.error(err.stack);
    }
  });

  if (contentBuffer !== '') {
    createNewContentFile();
  }

  // Function to create dictionary entries
  function createDictionaryEntry(def) {
    const forms = def.forms?.map(form => form.form) || [];
    const translations = def.translations?.filter(translation => 
      translation.word && isWordInUnicodeRange(translation.word)
    ).map(translation => translation.word) || [];

    const inflections = [...forms, ...translations].filter(Boolean);

    const inflectionsCode = (inflections && inflections.length > 0) ? 
      `<idx:infl>${inflections.slice(0, 254).map(inflection => `<idx:iform value="${inflection.replace(/"/g, "'")}" />`).join('')}</idx:infl>` 
      : '';

    let entry = `<idx:entry scriptable="yes" spell="yes"><dt><idx:orth>${def.word}${inflectionsCode}</idx:orth>`;

    /*if (def.sounds && Array.isArray(def.sounds) && def.sounds.length > 0) {
      let pronunciation = def.sounds.filter(sound => sound && sound.ipa)
        .map(sound => `${sound.tags && Array.isArray(sound.tags) ? `<i>${sound.tags.join(', ')}</i>` : ''} ${sound.ipa}`)
        .join(', ');
      entry += ` <phonetic>${pronunciation}</phonetic>`;
    }*/

    entry += `</dt><br /><dd>`;

    if (def.pos) {
      entry += `<i>${posMap[def.pos] || def.pos}</i> `;
    }

    function createNestedList(senses, depth = 0) {
      if (!Array.isArray(senses) || senses.length === 0 || (senses[0] && depth >= senses[0].length)) {
        return '';
      }

      let uniqueEntries = [...new Set(senses.map(sense => Array.isArray(sense) && sense.length > depth ? sense[depth] : null))];
      let list = '<ol>';
      uniqueEntries.forEach(entry => {
        let filteredSenses = senses.filter(sense => sense && sense[depth] === entry);
        list += `<li>${entry}${createNestedList(filteredSenses, depth + 1)}</li>`;
      });
      list += '</ol>';
      return list;
    }

    if (def.senses && Array.isArray(def.senses) && def.senses.length > 0) {
      let formattedSenses = def.senses.map(sense => sense.glosses);
      entry += createNestedList(formattedSenses);
    }

    entry += `</dd>`;

    if (def.etymology_text) {
      entry += `<br /><i>${def.etymology_text}</i><br />`;
    }

    /*if (def.forms && Array.isArray(def.forms) && def.forms.length > 0) {
      let forms = def.forms.map(form => `${form && form.form ? form.form : ''} (${form && Array.isArray(form.tags) ? form.tags.join(', ') : ''})`).join(', ');
      entry += `<i>Forms:</i> ${forms}<br />`;
    }

    if (def.synonyms && Array.isArray(def.synonyms) && def.synonyms.length > 0) {
      let synonyms = def.synonyms.map(syn => syn && syn.word ? syn.word : '').join(', ');
      entry += `<i>Synonyms:</i> ${synonyms}<br />`;
    }*/

    entry += `
      </idx:entry>`;

    return entry;
  }

  // OPF manifest and spine
  let manifestItems = '';
  let spineItems = '';
  for (let i = 1; i <= contentFileIndex; i++) {
    manifestItems += `<item id="content_${i}" href="content_${i}.html" media-type="application/xhtml+xml" />\n`;
    spineItems += `<itemref idref="content_${i}" />\n`;
  }

  const opfContent = `<?xml version="1.0"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="${bookId}">
  <metadata>
    <dc:title>${title}</dc:title>
    <dc:creator opf:role="aut">${author}</dc:creator>
    <dc:language>en-us</dc:language>
    <meta name="cover" content="cover-image" />
    <x-metadata>
      <DictionaryInLanguage>en</DictionaryInLanguage>
      <DictionaryOutLanguage>en</DictionaryOutLanguage>
    </x-metadata>
  </metadata>
  <manifest>
    <item href="../cover.png" id="cover-image" media-type="image/png" />
    <item id="cover" href="cover.html" media-type="application/xhtml+xml" />
    <item id="copyright" href="copyright.html" media-type="application/xhtml+xml" />
    ${manifestItems}
  </manifest>
  <spine>
    <itemref idref="cover" />
    <itemref idref="copyright"/>
    ${spineItems}
  </spine>
  <guide></guide>
</package>`;

  // Cover Content
  const coverContent = `<html>
  <head>
    <meta content="text/html" http-equiv="content-type">
  </head>
  <body>
    <h1>${title}</h1>
    <h2><em>${author}</em></h2>
  </body>
</html>`;

  // Copyright Content
  const copyrightContent = `<html>
  <head>
    <meta content="text/html" http-equiv="content-type">
  </head>
  <body>
    <h1>Copyrights</h1>
    <p>The original texts of Wiktionary entries are dual-licensed to the public under both the <a href="https://en.wiktionary.org/wiki/Wiktionary:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License">Creative Commons Attribution-ShareAlike 3.0 Unported License</a> (CC-BY-SA) and the <a href="https://en.wiktionary.org/wiki/Wiktionary:Text_of_the_GNU_Free_Documentation_License">GNU Free Documentation License (GFDL)</a>. This work adheres to the same licensing terms.</p>
  </body>
</html>`;

  try {
    await fsPromises.writeFile(`${outputDir}/dictionary.opf`, opfContent);
    await fsPromises.writeFile(`${outputDir}/cover.html`, coverContent);
    await fsPromises.writeFile(`${outputDir}/copyright.html`, copyrightContent);
  } catch (err) {
    console.error('Error writing files:', err);
  }
}

const [,, definitionsPath, title, author] = process.argv;

createOPFFile(definitionsPath, title, author);
