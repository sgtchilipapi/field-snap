import { runNextDocumentProcessingJob } from "@/lib/server/services/document-processing-service";

const POLL_INTERVAL_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (;;) {
    await runNextDocumentProcessingJob();
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
