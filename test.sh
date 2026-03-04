#!/bin/bash

# Run Playwright E2E tests
npx playwright test "$@"
TEST_EXIT=$?

# Convert .webm videos to .mp4 for easy viewing in VS Code
if command -v ffmpeg &>/dev/null; then
  for f in test-results/*/video.webm; do
    [ -f "$f" ] || continue
    ffmpeg -y -i "$f" "${f%.webm}.mp4" -loglevel error
    rm "$f"
  done
  echo "Videos converted to .mp4 in test-results/"
else
  echo "ffmpeg not found — install with: brew install ffmpeg"
fi

exit $TEST_EXIT
