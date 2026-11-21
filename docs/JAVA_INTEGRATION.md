# Java 17 practice course in SwarmLadder Lab

**Source of truth:** [SwarmLadder/Java](https://github.com/SwarmLadder/Java). Import runs during curriculum generation.

## Student workflow

Open `/learn/java` and choose one of eight practice tasks. Edit the starter in the browser; the draft persists across problems sharing `src/starter/Tasks.java`. Copy it into a local Java checkout, run `make check TASK=move-zeros` (JDK 17 + Make), compare public expected/actual results, and tick the confirmation **only after a real PASS**. The Lab never claims to run a JVM or to automatically grade Java. Short task prompts and complexity targets appear before the optional detailed guidance.

The student-facing starter and reference checker live in the Java repository. Reference checks can run with `make reference`. No hidden test assertions or browser source execution.

## Building

Supply all existing course checkouts plus a sibling `../Java` or `JAVA_COURSE=/path/to/Java`:

```sh
python build/prepare.py --java-course ../Java
python -m pytest tests/test_java_build.py -q
npm run build
```

The Lab importer expects the Java repository's practical-course PR to be merged before deploying this integration. There are no changes to existing course IDs or progress.

## Runtime limitation

Java needs a real JDK and cannot currently execute directly in the browser's Python Web Worker. An untrusted free code-execution API is not a safe substitute for a JVM sandbox. Direct Java browser execution would require a separately deployed and secured compilation service or vetted WASM compiler runtime.
