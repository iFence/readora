import fs from 'node:fs/promises';
import path from 'node:path';

const CHANGELOG_FILE = 'Changelog.md';
const VERSION_HEADER_PREFIX = '## ';

function resolveTag() {
  const explicitTag = process.argv[2]?.trim();
  if (explicitTag) {
    return explicitTag;
  }

  const envTag = process.env.GITHUB_REF_NAME?.trim();
  if (envTag) {
    return envTag;
  }

  throw new Error('Missing release tag. Pass it as an argument or through GITHUB_REF_NAME, for example v0.2.0.');
}

async function readChangelog() {
  const filePath = path.resolve(process.cwd(), CHANGELOG_FILE);
  return fs.readFile(filePath, 'utf8');
}

function extractReleaseNotes(content, tag) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const header = `${VERSION_HEADER_PREFIX}${tag}`;
  const startIndex = lines.findIndex(line => line.trim() === header);

  if (startIndex === -1) {
    throw new Error(`Could not find heading "${header}" in ${CHANGELOG_FILE}.`);
  }

  const notes = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index];
    const trimmedLine = currentLine.trim();

    if (trimmedLine === '---' || trimmedLine.startsWith(VERSION_HEADER_PREFIX)) {
      break;
    }

    notes.push(currentLine);
  }

  const normalizedNotes = notes.join('\n').trim();
  if (!normalizedNotes) {
    throw new Error(`Release notes for ${tag} are empty. Update ${CHANGELOG_FILE} before tagging.`);
  }

  return normalizedNotes;
}

async function writeGithubEnv(notes) {
  if (!process.env.GITHUB_ENV) {
    return;
  }

  await fs.appendFile(process.env.GITHUB_ENV, `UPDATE_NOTES<<EOF\n${notes}\nEOF\n`, 'utf8');
}

async function main() {
  const tag = resolveTag();
  const changelog = await readChangelog();
  const notes = extractReleaseNotes(changelog, tag);

  await writeGithubEnv(notes);
  process.stdout.write(`${notes}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
