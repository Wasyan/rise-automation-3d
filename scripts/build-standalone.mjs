// Regenerate the double-click version from the same source as GitHub Pages.
import {readFile, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const styles = await readFile(new URL('styles.css', root), 'utf8');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${styles}\n</style>`);
for (const name of ['three.min.js', 'characters.js', 'workshop.js']) {
  const source = await readFile(new URL(name, root), 'utf8');
  html = html.replace(`<script src="${name}"></script>`, () => `<script>\n${source.replace(/<\/script/gi, '<\\/script')}\n</script>`);
}
await writeFile(new URL('rise_automation_standalone.html', root), html);
console.log('Updated rise_automation_standalone.html');
