import path from "node:path";

import {
  downloadWhisperModel,
  installWhisperCpp
} from "@remotion/install-whisper-cpp";

const whisperPath = path.join(process.cwd(), "whisper.cpp");
const version = "1.5.5";
const model = "medium";

async function main() {
  console.log(`Installing whisper.cpp ${version} into ${whisperPath}...`);

  await installWhisperCpp({
    to: whisperPath,
    version
  });

  console.log(`Downloading Whisper model ${model}...`);

  await downloadWhisperModel({
    model,
    folder: whisperPath
  });

  console.log(
    "Whisper is ready with multilingual support for English, French, Spanish, and auto-detect transcription."
  );
}

main().catch((error) => {
  console.error("Whisper setup failed.");
  console.error(error);
  process.exit(1);
});
