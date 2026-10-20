# Ingestion guide

## Current source status

The Lite dataset includes 184 images from two previous exam sets. None has been transcribed or verified as an answer key. An image tick records a learner's selected answer and must not be treated as authoritative. There are also 65 slide entries and 4,481 extracted text chunks, but the original slide PDFs are absent from this Lite pack. The three Notion exports are available as local Markdown files.

The app does not call a vision model or upload source content. Use the Question Bank editor to add a transcription manually, or import a JSON/CSV question after review.

## Manual image transcription and review

1. Open **Thư viện nguồn → Ảnh đề gốc** and open the image at full size.
2. In **Ngân hàng câu hỏi**, choose **Thêm câu** and transcribe the stem and each option exactly as shown. Preserve the source wording and note illegible text in reviewer notes.
3. Keep `correctAnswers` as `null` and status `transcribed` until an answer is supported by an independent source. Do not infer the key from a tick, highlight, or result screenshot.
4. Record the exact image path in `sourceFiles` and the image/page identifier where useful. Add a short evidence quote and the slide/Notion path and page that support an answer. Do not invent page references.
5. A reviewer may set a sourced candidate to `answer_proposed`. Only a qualified reviewer who checked the cited source should set `expert_verified` and enter the answer.
6. Save the entry. Changes to answer and verification status create a local audit entry. Export JSON regularly if you need a separate backup.

## Duplicate review

Normalize transcribed text for comparison: lowercase, trim whitespace, normalize Unicode, and collapse punctuation/spacing before comparing stems. Review likely matches against both image sets and inspect the original images; a stem match is only a candidate duplicate. Keep distinct questions if options, conditions, or meaning differ. The app skips duplicate IDs; it does not claim to compute perceptual image hashes or automatically identify duplicate questions.

## Attach evidence

Use a source path relative to the dataset root, such as `04_extracted_slide_text/phase_1_day_01_15/Day 1.1 - AI & LLM Foundation.md`, then record the source page in `sourcePages`. For Notion, cite the Markdown export path and a heading or stable section name in reviewer notes. The extracted slide text can have layout/order errors; use the original PDF when it becomes available before verifying an answer. The app does not create evidence citations automatically.

## Add new files

1. Put new user-provided files under the matching source folder in `../AI_Thuc_Chien_K4_Midterm/`.
2. For a slide deck, keep the original PDF and create or obtain extracted text with page markers. Update `05_data/slide_manifest.json` with the real path, page count, day, and text path. This Lite pack does not contain the referenced PDFs.
3. For images, add manifest rows to `05_data/past_exam_image_manifest.json` with `text_transcribed: false` and `answer_review_status: unverified` until human review.
4. Copy updated source folders/manifests into `web/public/dataset/` so Vite can serve them locally. Restart Vite if required.
5. Import reviewed question JSON in the Question Bank. Inspect status, source paths, and answer evidence before using a question in practice.

## Backup and privacy

Export the question bank as JSON and store it where you choose. Practice history and bookmarks are in local storage on this browser and are not included in question exports. Do not add `public/dataset/` or the extracted source folder to a public repository. No external OCR/model service is configured.
