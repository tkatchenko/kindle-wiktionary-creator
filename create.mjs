import fs, { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createInterface } from 'readline';

async function createOPFFile(definitionsPath, title = 'Dictionary', author = 'Anonymous') {
  const bookId = uuidv4();
  const outputDir = './output';

  // OPF Content
  const opfContent = `<?xml version="1.0"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="${bookId}">
  <metadata>
    <dc:title>${title}</dc:title>
    <dc:creator opf:role="aut">${author}</dc:creator>
    <dc:language>en-us</dc:language>
    <x-metadata>
      <DictionaryInLanguage>en-us</DictionaryInLanguage>
      <DictionaryOutLanguage>en-us</DictionaryOutLanguage>
      <DefaultLookupIndex>default</DefaultLookupIndex>
    </x-metadata>
  </metadata>
  <manifest>
    <item id="cover" href="cover.html" media-type="application/xhtml+xml" />
    <item id="copyright" href="copyright.html" media-type="application/xhtml+xml" />
    <item id="content" href="content.html" media-type="application/xhtml+xml" />
  </manifest>
  <spine>
    <itemref idref="cover" />
    <itemref idref="copyright"/>
    <itemref idref="content"/>
  </spine>
  <guide>
    <reference type="index" title="IndexName" href="content.html"/>
  </guide>
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

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    try {
      await fsPromises.mkdir(outputDir);
    } catch (err) {
      console.error('Error creating output directory:', err);
      return;
    }
  }

  // Create write streams for content
  const contentStream = fs.createWriteStream(`${outputDir}/content.html`);
  contentStream.write(`
    <html xmlns:math="http://exslt.org/math" xmlns:svg="http://www.w3.org/2000/svg"
        xmlns:tl="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:saxon="http://saxon.sf.net/" xmlns:xs="http://www.w3.org/2001/XMLSchema"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:cx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:mbp="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:mmc="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
        xmlns:idx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
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
  `);

  const fileStream = fs.createReadStream(definitionsPath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    try {
      const def = JSON.parse(line);
      const langCodes = [
        'en',  // English
        'es',  // Spanish
        'it',  // Italian
        'de',  // German
        'pt',  // Portuguese
        'pl',  // Polish
        'fr',  // French
        'ca',  // Catalan
        'sv',  // Swedish
        'lv',  // Latvian
        'lt',  // Lithuanian
        'nl',  // Dutch
        'ro',  // Romanian
        'el',  // Greek
        'hu',  // Hungarian
        'cs',  // Czech
        'ga',  // Irish
        'la'   // Latin
      ];

      if (langCodes.includes(def.lang_code)) {
        console.log(`Adding "${def.word} (${def.lang_code})"`);
        const entry = createDictionaryEntry(def);
        contentStream.write(entry);
      } else {
        //console.log(`Rejected "${def.word} (${def.lang_code})"`);
      }
    } catch (err) {
      console.error(`Error parsing JSON from line: ${err}`);
    }
  });

  function createDictionaryEntry(def) {
    let entry = `<idx:entry name="default" scriptable="yes" spell="yes">
      <dt>
        <idx:orth>${def.word}${def.translations ? `<idx:infl>${def.translations?.filter(translation => translation.word).map(translation => `<idx:iform value="${translation.word}" />`).join('\n')}</idx:infl>` : ''}</idx:orth>`;

    if (def.sounds && Array.isArray(def.sounds) && def.sounds.length > 0) {
      let pronunciation = def.sounds.filter(sound => sound && sound.ipa)
        .map(sound => `${sound.tags && Array.isArray(sound.tags) ? `<i>${sound.tags.join(', ')}</i>` : ''} ${sound.ipa}`)
        .join(', ');
      entry += ` <phonetic>${pronunciation}</phonetic>`;
    }

    entry += `</dt><br /><dd>`;

    if (def.pos) {
      entry += `<i>${def.lang} ${def.pos}</i> `;
    }

    function createNestedList(senses, depth = 0) {
      if (!Array.isArray(senses) || senses.length === 0 || (senses[0] && depth >= senses[0].length)) {
        return '';
      }

      let uniqueEntries = [...new Set(senses.map(sense => sense[depth]))];
      let list = '<ol>';
      uniqueEntries.forEach(entry => {
        let filteredSenses = senses.filter(sense => sense && sense[depth] === entry);
        list += `<li>${entry}${createNestedList(filteredSenses, depth + 1)}</li>`;
      });
      list += '</ol>';
      return list;
    }

    if (def.senses && Array.isArray(def.senses) && def.senses.length > 0) {
      let formattedSenses = def.senses.map(sense => Array.isArray(sense) ? sense.glosses : []);
      entry += createNestedList(formattedSenses);
    }

    entry += `</dd>`;

    if (def.etymology_text) {
      entry += `<i>Etymology</i>: ${def.etymology_text}<br />`;
    }

    if (def.forms && Array.isArray(def.forms) && def.forms.length > 0) {
      let forms = def.forms.map(form => `${form && form.form ? form.form : ''} (${form && Array.isArray(form.tags) ? form.tags.join(', ') : ''})`).join(', ');
      entry += `<i>Forms:</i> ${forms}<br />`;
    }

    if (def.synonyms && Array.isArray(def.synonyms) && def.synonyms.length > 0) {
      let synonyms = def.synonyms.map(syn => syn && syn.word ? syn.word : '').join(', ');
      entry += `<i>Synonyms:</i> ${synonyms}<br />`;
    }

    entry += `</idx:entry>`;

    return entry;
  }

  rl.on('close', () => {
    contentStream.write(`
          </mbp:frameset>
        </body>
      </html>
    `);
    contentStream.end();
  });

  // Write files
  try {
    await fsPromises.writeFile('./output/dictionary.opf', opfContent);
    await fsPromises.writeFile('./output/cover.html', coverContent);
    await fsPromises.writeFile('./output/copyright.html', copyrightContent);
  } catch (err) {
    console.error('Error writing files:', err);
  }
}

// Process arguments
const [,, definitionsPath, title, author] = process.argv;

// Execute the function
createOPFFile(definitionsPath, title, author);
