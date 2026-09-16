#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const API_SCRIPT = path.resolve(__dirname, '../../ima_api.cjs');
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const DATA_URL_RE =
  /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (['--note-id', '--file', '--content', '--url'].includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) fail(`Missing value for ${arg}`);
      args[arg.slice(2)] = value;
      i += 1;
    } else fail(`Unknown argument: ${arg}`);
  }

  if (
    args.url &&
    (args['note-id'] || args.file || args.content || args.dryRun)
  ) {
    fail('--url cannot be combined with write options.');
  }
  if (!args.url) {
    if (!args['note-id'])
      fail(
        'Usage: note-images.cjs --url <image> | --note-id <id> (--file <path> | --content <text>) [--dry-run]'
      );
    if ((args.file ? 1 : 0) + (args.content ? 1 : 0) !== 1)
      fail('Exactly one of --file or --content is required.');
  }
  return args;
}

function detectImageType(buffer) {
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return 'image/jpeg';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  return '';
}

function assertImageSize(data, source) {
  if (data.length >= MAX_FILE_SIZE) {
    throw new Error(`Image must be smaller than 3MiB: ${source}`);
  }
}

function assertImageType(data, contentType, source) {
  const detectedType = detectImageType(data);
  if (!detectedType || (contentType && detectedType !== contentType)) {
    throw new Error(`Unsupported or invalid image: ${source}`);
  }
  return detectedType;
}

function readImage(filePath) {
  const absolutePath = path.resolve(filePath);
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    throw new Error(`Image file not found: ${absolutePath}`);
  }
  if (!stat.isFile())
    throw new Error(`Image path is not a file: ${absolutePath}`);
  if (stat.size >= MAX_FILE_SIZE)
    throw new Error(`Image must be smaller than 3MiB: ${absolutePath}`);
  const data = fs.readFileSync(absolutePath);
  assertImageSize(data, absolutePath);
  const contentType = assertImageType(data, '', absolutePath);
  return { absolutePath, contentType, data };
}

function parseDataUrl(source) {
  const match = DATA_URL_RE.exec(source);
  if (!match)
    throw new Error(
      'Unsupported or invalid data URL. Only base64 PNG, JPEG, and WebP are supported.'
    );
  const declaredType = match[1].toLowerCase();
  const data = Buffer.from(match[2], 'base64');
  assertImageSize(data, 'data URL');
  const contentType = assertImageType(data, declaredType, 'data URL');
  return { contentType, data };
}

async function readResponseBody(response, source) {
  if (!response.body)
    throw new Error(`Remote image has no response body: ${source}`);
  const reader = response.body.getReader();
  const chunks = [];
  let totalSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize >= MAX_FILE_SIZE) {
        throw new Error(`Remote image must be smaller than 3MiB: ${source}`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalSize);
}

async function fetchRemoteImage(source) {
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error(`Invalid image URL: ${source}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported image source: ${source}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'image/png,image/jpeg,image/webp,image/*;q=0.8' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error(`Remote image download timed out: ${source}`);
    throw new Error(`Remote image download failed: ${source}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok)
    throw new Error(
      `Remote image request failed with HTTP ${response.status}: ${source}`
    );
  const contentType = (response.headers.get('content-type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (
    contentType &&
    !IMAGE_TYPES.has(contentType) &&
    contentType !== 'application/octet-stream'
  ) {
    throw new Error(
      `Remote response is not an image (${contentType}): ${source}`
    );
  }
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength >= MAX_FILE_SIZE) {
    throw new Error(`Remote image must be smaller than 3MiB: ${source}`);
  }

  const data = await readResponseBody(response, source);
  const detectedType = assertImageType(
    data,
    IMAGE_TYPES.has(contentType) ? contentType : '',
    source
  );
  assertImageSize(data, source);
  return { contentType: detectedType, data };
}

function toDataUrl(image) {
  return `data:${image.contentType};base64,${image.data.toString('base64')}`;
}

function callImaApi(apiPath, body) {
  try {
    const output = execFileSync(
      process.execPath,
      [API_SCRIPT, apiPath, JSON.stringify(body), '{}'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    const response = JSON.parse(output);
    if (response.code !== 0)
      throw new Error(response.msg || `API returned code ${response.code}`);
    return response.data || {};
  } catch (error) {
    const stderr =
      error && error.stderr ? error.stderr.toString('utf8').trim() : '';
    if (stderr) {
      try {
        const response = JSON.parse(stderr);
        throw new Error(response.msg || stderr);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== stderr)
          throw parseError;
        throw new Error(stderr);
      }
    }
    if (error instanceof SyntaxError)
      throw new Error(`API returned invalid JSON: ${error.message}`);
    throw error;
  }
}

function localPath(source) {
  if (source.startsWith('file://')) return decodeURIComponent(source.slice(7));
  if (source.startsWith('/') || /^[A-Za-z]:[\\/]/.test(source)) return source;
  return '';
}

async function imageContent(alt, source) {
  if (source.startsWith('data:'))
    return `![${alt}](${toDataUrl(parseDataUrl(source))})`;
  const filePath = localPath(source);
  if (filePath) return `![${alt}](${toDataUrl(readImage(filePath))})`;
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return `![${alt}](${toDataUrl(await fetchRemoteImage(source))})`;
  }
  throw new Error(`Unsupported image source: ${source}`);
}

async function createBatches(markdown) {
  const batches = [];
  let text = '';
  let lastIndex = 0;
  const flushText = () => {
    if (text.trim()) batches.push({ type: 'text', content: text });
    text = '';
  };

  for (const match of markdown.matchAll(IMAGE_RE)) {
    text += markdown.slice(lastIndex, match.index);
    flushText();
    batches.push({
      type: 'image',
      content: await imageContent(match[1], match[2].trim()),
    });
    lastIndex = match.index + match[0].length;
  }
  text += markdown.slice(lastIndex);
  flushText();
  return batches;
}

function normalizedUploadPath(image) {
  const extension = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  }[image.contentType];
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ima-note-image-')
  );
  const normalizedPath = path.join(tempDirectory, `image${extension}`);
  fs.copyFileSync(image.absolutePath, normalizedPath);
  return { tempDirectory, normalizedPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.url) {
    let image;
    let normalized;
    try {
      image = readImage(args.url);
      normalized = normalizedUploadPath(image);
      const upload = callImaApi('openapi/mcp_cloud_agent/upload_temp_file', {
        file_path: normalized.normalizedPath,
      });
      if (typeof upload.coskey !== 'string' || !upload.coskey)
        throw new Error('response did not contain data.coskey.');
      const access = callImaApi('openapi/mcp_cloud_agent/get_access_url', {
        coskey: upload.coskey,
      });
      if (typeof access.download_url !== 'string' || !access.download_url)
        throw new Error('response did not contain data.download_url.');
      process.stdout.write(`${access.download_url}\n`);
    } catch (error) {
      fail(`Image URL conversion failed: ${error.message}`);
    } finally {
      if (normalized)
        fs.rmSync(normalized.tempDirectory, { recursive: true, force: true });
    }
    return;
  }

  let markdown;
  try {
    markdown = args.file
      ? fs.readFileSync(path.resolve(args.file), 'utf8')
      : args.content;
  } catch (error) {
    fail(`Cannot read input: ${error.message}`);
  }

  let batches;
  try {
    batches = await createBatches(markdown);
  } catch (error) {
    fail(error.message);
  }
  if (!batches.length) fail('Input content is empty.');

  if (args.dryRun) {
    process.stdout.write(
      `${JSON.stringify(batches.map(({ type, content }, index) => ({ index: index + 1, type, bytes: Buffer.byteLength(content) })))}\n`
    );
    return;
  }

  for (let index = 0; index < batches.length; index += 1) {
    try {
      callImaApi('openapi/note/v1/append_doc', {
        note_id: args['note-id'],
        content_format: 1,
        content: batches[index].content,
      });
      process.stdout.write(
        `batch ${index + 1}/${batches.length} ${batches[index].type} ok\n`
      );
    } catch (error) {
      fail(`batch ${index + 1}/${batches.length} failed: ${error.message}`);
    }
  }
}

main().catch((error) => fail(error.message));
