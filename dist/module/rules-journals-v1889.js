const SYSTEM = 'genesys-vtt';
const ROOT = `systems/${SYSTEM}/data/journals-v1889.json`;
const KEY = 'ruleJournal';
let pending;
const contents = collection => Array.from(collection?.contents ?? collection ?? []);
const identity = document => document.flags?.[SYSTEM]?.[KEY];
const writer = () => game.user?.isGM && game.users?.activeGM?.id === game.user.id;

/** Missing documents/pages are recoverable; existing text and permissions belong to the GM. */
export function installJournals() {
  if (!writer()) return Promise.resolve(false);
  if (pending) return pending;
  pending = install().finally(() => { pending = undefined; });
  return pending;
}
async function install() {
  const response = await fetch(ROOT);
  if (!response.ok) throw Error(`Journal installation failed (${response.status}). Reload or retry from Rules & Equipment.`);
  const books = await response.json();
  let folder = contents(game.folders).find(f => f.type === 'JournalEntry' && identity(f) === 'folder');
  if (!folder) folder = await Folder.create({name: 'Genesys · Rules & Manual', type: 'JournalEntry', flags: {[SYSTEM]: {[KEY]: 'folder'}}});
  for (const book of books) {
    if (!writer()) return false;
    let journal = contents(game.journal).find(j => identity(j) === book.id);
    if (!journal) journal = await JournalEntry.create({name: book.name, folder: folder.id, ownership: {default: 2}, flags: {[SYSTEM]: {[KEY]: book.id, installedVersion: '0.0.1889'}}});
    for (const [index, page] of book.pages.entries()) {
      if (!writer()) return false;
      if (contents(journal.pages).some(p => identity(p) === page.id)) continue;
      await journal.createEmbeddedDocuments('JournalEntryPage', [{name: page.name, type: 'text', sort: (index + 1) * 10000, title: {show: true, level: 1}, text: {format: 1, content: page.content}, flags: {[SYSTEM]: {[KEY]: page.id}}}]);
    }
    try { await syncPdf(book.id, journal); } catch (error) { report(error); }
  }
  return true;
}
export async function syncPdf(id, journal) {
  if (!writer() || !['core', 'terrinoth'].includes(id)) return;
  const src = String(game.settings.get(SYSTEM, `${id}RulesPdf`) ?? '').trim();
  journal ??= contents(game.journal).find(j => identity(j) === id);
  if (!journal) return;
  const page = contents(journal.pages).find(p => identity(p) === 'source-pdf');
  if (!src) { if (page) await page.delete(); return; }
  if (!/\.pdf(?:[?#].*)?$/i.test(src) || /^(?:javascript|data):/i.test(src)) throw Error('Choose a PDF file in Foundry File Storage.');
  if (page) { if (page.src !== src) await page.update({src}); return; }
  await journal.createEmbeddedDocuments('JournalEntryPage', [{name: 'Full Rulebook · PDF', type: 'pdf', src, sort: 0, flags: {[SYSTEM]: {[KEY]: 'source-pdf'}}}]);
}
export async function openJournal(id) {
  if (!['core', 'terrinoth', 'manual'].includes(id)) throw Error('Unknown rule journal.');
  if (writer()) await installJournals();
  const journal = contents(game.journal).find(j => identity(j) === id);
  if (!journal) throw Error('The active GM must open the world to install the rule journals.');
  if (!journal.testUserPermission(game.user, 'OBSERVER')) throw Error('The GM has not shared this journal with you.');
  return journal.sheet.render(true);
}
Hooks.once('init', () => {
  for (const [id, name] of [['core', 'Core Rules'], ['terrinoth', 'Realms of Terrinoth']]) game.settings.register(SYSTEM, `${id}RulesPdf`, {
    name: `${name} · Journal PDF`, hint: 'Upload and select your rulebook PDF using the file picker, then save to connect it to Journal. Clearing this field removes the PDF page, not the file or overview.',
    scope: 'world', config: true, type: String, default: '', filePicker: 'any',
    onChange: () => installJournals().catch(report)
  });
});
function report(error) { console.error('Genesys rule journals', error); ui.notifications.error(error.message); }
Hooks.once('ready', () => {
  game.genesysJournals = {open: openJournal, install: installJournals, syncPdf};
  installJournals().catch(report);
});
Hooks.on('updateUser', () => { if (writer()) installJournals().catch(report); });
