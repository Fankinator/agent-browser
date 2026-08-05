import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../workflows/milestone-fork-release.yml", import.meta.url),
  "utf8",
);

const releaseStep = workflow.slice(
  workflow.indexOf("      - name: Create immutable tag and release"),
);

test("release creation uses the explicit GitHub repository", () => {
  assert.match(
    releaseStep,
    /gh release create "\$RELEASE_TAG" \\\r?\n\s+--repo "\$GITHUB_REPOSITORY" \\/,
  );
});

test("promotion reuses only an existing tag at the exact release SHA", () => {
  const lookup = releaseStep.indexOf(
    'if REMOTE_TAG_SHA=$(gh api "repos/${GITHUB_REPOSITORY}/git/ref/tags/${RELEASE_TAG}"',
  );
  const mismatchGuard = releaseStep.indexOf(
    'if [ "$REMOTE_TAG_SHA" != "$GITHUB_SHA" ]; then',
  );
  const create = releaseStep.indexOf(
    'CREATED_TAG_SHA=$(gh api --method POST "repos/${GITHUB_REPOSITORY}/git/refs"',
  );

  assert.ok(lookup >= 0, "expected an existing-tag lookup");
  assert.ok(mismatchGuard > lookup, "expected an exact-SHA guard after lookup");
  assert.ok(create > mismatchGuard, "expected tag creation only after the guard");
});
