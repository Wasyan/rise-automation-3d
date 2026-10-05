// Regenerate the double-click version from the same source as GitHub Pages.
import {readFile, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
for (const name of ['styles.css', 'layout.css']) {
  const styles = await readFile(new URL(name, root), 'utf8');
  const link = new RegExp('<link rel="stylesheet" href="' + name.replace('.', '\\.') + '(?:\\?[^\"]*)?">');
  html = html.replace(link, () => `<style>\n${styles}\n</style>`);
}
for (const name of ['three.min.js', 'characters.js', 'robot.js', 'workshop.js']) {
  const source = await readFile(new URL(name, root), 'utf8');
  const script = new RegExp('<script src="' + name.replace('.', '\\.') + '(?:\\?[^\"]*)?"></script>');
  html = html.replace(script, () => `<script>\n${source.replace(/<\/script/gi, '<\\/script')}\n</script>`);
}
await writeFile(new URL('rise_automation_standalone.html', root), html);
console.log('Updated rise_automation_standalone.html');
