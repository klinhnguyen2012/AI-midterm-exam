import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../..');
const source = resolve(root, 'AI_Thuc_Chien_K4_Midterm');
const publicData = resolve(scriptDir, '../public/dataset');
const srcData = resolve(scriptDir, '../src/data');
if (!existsSync(source)) {
  console.error('Không tìm thấy ../AI_Thuc_Chien_K4_Midterm. Hãy giải nén Lite pack cạnh thư mục web trước khi chạy app.');
  process.exit(1);
}
mkdirSync(publicData, { recursive: true });
for (const folder of ['01_notion_exports', '04_extracted_slide_text']) {
  const from = resolve(source, folder);
  const to = resolve(publicData, folder);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}
// Exam screenshots are private source material: keep them out of the web root.
rmSync(resolve(publicData, '02_past_exam_images'), { recursive: true, force: true });
const publicManifestDir = resolve(publicData, '05_data');
rmSync(publicManifestDir, { recursive: true, force: true });
mkdirSync(publicManifestDir, { recursive: true });
for (const name of ['slide_manifest.json', 'notion_manifest.json', 'knowledge_chunks.jsonl']) {
  copyFileSync(resolve(source, '05_data', name), resolve(publicManifestDir, name));
}
mkdirSync(resolve(publicData, '06_cheat_sheet'), { recursive: true });
copyFileSync(resolve(source, '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md'), resolve(publicData, '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md'));
mkdirSync(srcData, { recursive: true });
copyFileSync(resolve(source, '05_data/quiz_seed_mock_01.json'), resolve(srcData, 'quiz_seed_mock_01.json'));
execFileSync(process.execPath, [resolve(scriptDir, 'build-exam-bank.mjs')], { stdio: 'inherit' });
copyFileSync(resolve(srcData, 'exam_bank_seed.json'), resolve(publicData, '05_data/exam_bank_seed.json'));
copyFileSync(resolve(scriptDir, '../content/flashcards.json'), resolve(srcData, 'flashcards.json'));
copyFileSync(resolve(source, '06_cheat_sheet/CHEAT_SHEET_TONG_HOP.md'), resolve(srcData, 'cheat-sheet.md'));
console.log('Đã chuẩn bị dữ liệu cục bộ; không có tệp nào được tải lên.');
